import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, deleteField, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    aggregateAttendanceStats,
    countEvents,
    escapeHtml as esc,
    formatDateKey as fmtDate,
    getDayClass,
    normaliseRecord,
    subjectAttendanceStats,
    todayKey as keyOfToday,
    upcomingEventDates
} from "./app-logic.js";

const firebaseConfig = {
    apiKey: "AIzaSyC9W4W6bDdH6p2GLi_TwG2XDd0yPNH8SEQ",
    authDomain: "academic-flow-3a2ef.firebaseapp.com",
    projectId: "academic-flow-3a2ef",
    storageBucket: "academic-flow-3a2ef.firebasestorage.app",
    messagingSenderId: "469639047695",
    appId: "1:469639047695:web:358d524690e08be504917a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const subjects = {
    "SE621A": { name: "Economia Industrial", days: [1, 4], start: { 1: "19:00", 4: "21:00" } },
    "SE620": { name: "Economia do Setor Público", days: [1, 3], start: { 1: "21:00", 3: "19:00" } },
    "SE623": { name: "Economia Internacional II", days: [2, 5], start: { 2: "19:00", 5: "21:00" } },
    "SE622": { name: "Elaboração e Análise de Projetos II", days: [2, 4], start: { 2: "21:00", 4: "19:00" } }
};

const SUBJECT_COLORS = ["#21b876", "#ef5362", "#f2b71f", "#1769ff"];
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const EVT_TYPES = { prova: "Prova", trabalho: "Trabalho" };

let attendanceData = {};
let eventsData = {};
let currentDate = new Date();
let selectedDay = dayDescriptor(new Date());
let evtType = "prova";

function dayDescriptor(date) {
    return { dateKey: keyOfToday(date), dayOfWeek: date.getDay() };
}

function refreshIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
}

function getSemesterLabel(date = new Date()) {
    return `${date.getFullYear()}/${date.getMonth() < 6 ? 1 : 2}`;
}

function getGreeting(date = new Date()) {
    const hour = date.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}

function setStaticContext() {
    const now = new Date();
    const semester = getSemesterLabel(now);
    document.getElementById("greetingTitle").textContent = `${getGreeting(now)}, Renato`;
    document.getElementById("contextDate").textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(now);
    document.getElementById("semesterLabel").textContent = semester;
    document.getElementById("mobileSemester").textContent = semester;
}

function setSyncState(state) {
    const dot = document.getElementById("syncStatusDot");
    const text = document.getElementById("syncStatusText");
    const time = document.getElementById("syncStatusTime");
    dot.className = `sync-dot ${state}`;

    if (state === "ready") {
        text.textContent = "Sincronizado";
        time.textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    } else if (state === "error") {
        text.textContent = "Sem sincronização";
        time.textContent = "Verifique sua conexão";
    } else {
        text.textContent = "Sincronizando";
        time.textContent = "Conectando ao Firebase";
    }
}

function setLoaderReady() {
    const loader = document.getElementById("loader");
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 350);
}

function setLoaderError() {
    const loader = document.getElementById("loader");
    loader.innerHTML = `
        <div class="empty-state">
            <i data-lucide="cloud-off"></i>
            <strong>Falha ao sincronizar</strong>
            <span>Verifique sua conexão e recarregue a página.</span>
        </div>`;
    refreshIcons();
}

setStaticContext();
setSyncState("syncing");
document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".sidebar-link").forEach(item => item.classList.remove("is-active"));
        link.classList.add("is-active");
    });
});

document.getElementById("evtSubject").innerHTML =
    `<option value="">Sem matéria</option>` +
    Object.keys(subjects).map(id => `<option value="${id}">${id} — ${subjects[id].name}</option>`).join("");

onSnapshot(
    doc(db, "users", "renato"),
    (snap) => {
        const data = snap.exists() ? snap.data() : {};
        attendanceData = normaliseRecord(data.absences);
        eventsData = normaliseRecord(data.events);
        renderAll();
        setSyncState("ready");
        setLoaderReady();
    },
    (error) => {
        console.error("Falha ao sincronizar com o Firestore:", error);
        attendanceData = {};
        eventsData = {};
        renderAll();
        setSyncState("error");
        setLoaderError();
    }
);

window.switchTab = (tabId, btn) => {
    if (window.innerWidth >= 768) return;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("tab-active"));
    document.getElementById(`tab-${tabId}`)?.classList.add("tab-active");
    document.querySelectorAll(".mobile-nav button").forEach(button => button.classList.remove("nav-active"));
    btn?.classList.add("nav-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshIcons();
};

window.changeMonth = (step) => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + step, 1);
    renderCalendar();
};

window.goToday = () => {
    const now = new Date();
    currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    selectedDay = dayDescriptor(now);
    renderCalendar();
    renderDayDetails();
};

window.showDay = (dateKey, dayOfWeek) => {
    selectedDay = { dateKey, dayOfWeek };
    renderDayDetails();
    if (window.innerWidth < 768) {
        window.switchTab("today", document.getElementById("todayBtn"));
    }
};

window.setStatus = async (date, subId, status, btn) => {
    const previousContent = btn.innerHTML;
    btn.innerHTML = "...";
    btn.disabled = true;

    const isToggleOff = attendanceData[date]?.[subId] === status;
    const docRef = doc(db, "users", "renato");

    try {
        if (isToggleOff) {
            await updateDoc(docRef, { [`absences.${date}.${subId}`]: deleteField() });
        } else {
            await setDoc(docRef, { absences: { [date]: { [subId]: status } } }, { merge: true });
        }
    } catch (error) {
        console.error("Falha ao registrar presença:", error);
        btn.innerHTML = previousContent;
        btn.disabled = false;
        showSyncError();
    }
};

window.toggleEvtForm = () => {
    const fields = document.getElementById("evtFields");
    const opening = fields.classList.contains("hidden");
    fields.classList.toggle("hidden");
    setEventToggleLabel(opening);

    if (opening) {
        document.getElementById("evtDesc").focus();
        if (window.innerWidth < 768) fields.scrollIntoView({ behavior: "smooth", block: "center" });
    }
};

function setEventToggleLabel(open) {
    const toggle = document.getElementById("evtToggle");
    toggle.innerHTML = open
        ? `<i data-lucide="x"></i><span>Cancelar</span>`
        : `<i data-lucide="plus"></i><span>Adicionar evento</span>`;
    refreshIcons();
}

window.setEvtType = (type) => {
    evtType = type;
    paintEvtType();
};

function paintEvtType() {
    for (const type of ["prova", "trabalho"]) {
        const button = document.getElementById(`evtType${type.charAt(0).toUpperCase()}${type.slice(1)}`);
        button.className = `event-type-btn ${type}${evtType === type ? " active" : ""}`;
    }
}

window.addEvent = async () => {
    if (!selectedDay) return;

    const input = document.getElementById("evtDesc");
    const addButton = document.getElementById("evtAdd");
    const description = input.value.trim();
    const subject = document.getElementById("evtSubject").value;
    const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).slice(0, 8);

    addButton.textContent = "Adicionando...";
    addButton.disabled = true;

    try {
        await setDoc(doc(db, "users", "renato"), {
            events: { [selectedDay.dateKey]: { [id]: { type: evtType, desc: description, subject } } }
        }, { merge: true });
        input.value = "";
        document.getElementById("evtSubject").value = "";
        if (!document.getElementById("evtFields").classList.contains("hidden")) window.toggleEvtForm();
    } catch (error) {
        console.error("Falha ao adicionar evento:", error);
        showSyncError();
    } finally {
        addButton.textContent = "Adicionar";
        addButton.disabled = false;
    }
};

window.delEvent = async (dateKey, id) => {
    try {
        await updateDoc(doc(db, "users", "renato"), { [`events.${dateKey}.${id}`]: deleteField() });
    } catch (error) {
        console.error("Falha ao excluir evento:", error);
        showSyncError();
    }
};

function showSyncError() {
    clearSyncError();
    document.getElementById("dayDetails").insertAdjacentHTML(
        "afterbegin",
        `<div id="syncError" class="sync-error">Falha ao sincronizar. Tente novamente.</div>`
    );
}

function clearSyncError() {
    document.getElementById("syncError")?.remove();
}

function eventTypeClass(type) {
    if (type === "prova") return "prova";
    if (type === "trabalho") return "trabalho";
    return "generic";
}

function evtChip(dateKey, id, event, removable) {
    event = normaliseRecord(event);
    const typeClass = eventTypeClass(event.type);
    const label = EVT_TYPES[event.type] || "Evento";
    const deleteButton = removable
        ? `<button type="button" aria-label="Excluir evento" onclick="window.delEvent('${dateKey}', '${id}')" class="delete-event"><i data-lucide="x"></i></button>`
        : "";

    return `<div class="event-row">
        <div class="event-row-main">
            <span class="event-pill ${typeClass}">${label}</span>
            ${event.subject && subjects[event.subject] ? `<span class="event-subject">${event.subject}</span>` : ""}
            ${event.desc ? `<span class="event-desc">${esc(event.desc)}</span>` : ""}
        </div>
        ${deleteButton}
    </div>`;
}

function renderDayDetails() {
    if (!selectedDay) return;
    clearSyncError();

    const { dateKey, dayOfWeek } = selectedDay;
    const container = document.getElementById("dayBody");
    const selectedIsToday = dateKey === keyOfToday();
    document.getElementById("todaySectionTitle").textContent = selectedIsToday ? "Hoje" : "Dia selecionado";
    document.getElementById("selectedDateBadge").textContent = fmtDate(dateKey);

    const sessions = Object.entries(subjects).filter(([, subject]) => subject.days.includes(dayOfWeek));
    let html = `<div class="day-detail-header">
        <strong>${DAY_NAMES[dayOfWeek]}</strong>
        <span>${fmtDate(dateKey)}${selectedIsToday ? " • hoje" : ""}</span>
    </div>`;

    if (sessions.length) {
        html += `<div class="day-sessions">`;
        sessions.forEach(([id, subject]) => {
            const status = attendanceData[dateKey]?.[id];
            const tone = Object.keys(subjects).indexOf(id);
            html += `<div class="session-card" style="border-left-color:${SUBJECT_COLORS[tone]}">
                <div class="session-top">
                    <span class="session-code">${id}</span>
                    <span class="session-time">${subject.start[dayOfWeek]}h</span>
                </div>
                <div class="session-name">${subject.name}</div>
                <div class="attendance-actions">
                    <button type="button" onclick="window.setStatus('${dateKey}', '${id}', 'present', this)" class="attendance-btn present${status === "present" ? " active" : ""}">Presente</button>
                    <button type="button" onclick="window.setStatus('${dateKey}', '${id}', 'absent', this)" class="attendance-btn absent${status === "absent" ? " active" : ""}">Faltei</button>
                    <button type="button" onclick="window.setStatus('${dateKey}', '${id}', 'cancelled', this)" class="attendance-btn cancelled${status === "cancelled" ? " active" : ""}">Cancelada</button>
                </div>
            </div>`;
        });
        html += `</div>`;
    } else {
        html += `<div class="no-class-state">Sem aulas programadas para este dia.</div>`;
    }

    const dayEvents = normaliseRecord(eventsData[dateKey]);
    const eventIds = Object.keys(dayEvents);
    if (eventIds.length) {
        html += `<div class="day-events"><p class="day-events-title">Eventos do dia</p>${eventIds.map(id => evtChip(dateKey, id, dayEvents[id], true)).join("")}</div>`;
    }

    container.innerHTML = html;
    document.getElementById("dayForm").classList.remove("hidden");
    paintEvtType();
    refreshIcons();
}

function renderAgenda() {
    const container = document.getElementById("agenda-container");
    const today = keyOfToday();
    const dates = upcomingEventDates(eventsData, today);

    if (!dates.length) {
        container.innerHTML = `<div class="agenda-empty">
            <i data-lucide="calendar-check-2"></i>
            <strong>Nenhuma avaliação agendada</strong>
            <span>Provas e trabalhos futuros aparecerão aqui.</span>
        </div>`;
        return;
    }

    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    container.innerHTML = dates.map(dateKey => {
        const [year, month, day] = dateKey.split("-").map(Number);
        const when = new Date(year, month - 1, day);
        const diff = Math.round((when - base) / 86400000);
        const relative = diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : `Em ${diff} dias`;
        const urgentClass = diff <= 2 ? " urgent" : "";
        const items = Object.keys(normaliseRecord(eventsData[dateKey]))
            .map(id => evtChip(dateKey, id, eventsData[dateKey][id], false))
            .join("");

        return `<button type="button" class="agenda-card" onclick="window.showDay('${dateKey}', ${when.getDay()})">
            <div class="agenda-card-top">
                <span class="agenda-date">${fmtDate(dateKey)} • ${DAY_NAMES[when.getDay()]}</span>
                <span class="agenda-relative${urgentClass}">${relative}</span>
            </div>
            <div class="agenda-items">${items}</div>
        </button>`;
    }).join("");
}

function renderSummary() {
    const container = document.getElementById("summary-container");
    container.innerHTML = Object.keys(subjects).map((id, index) => {
        const subject = subjects[id];
        const stats = subjectAttendanceStats(attendanceData, id);
        const rateText = stats.rate === null ? "—" : `${stats.rate}%`;
        const progress = stats.rate ?? 0;
        const lowClass = stats.rate !== null && stats.rate < 75 ? " low" : "";
        const daysText = subject.days.map(day => DAY_NAMES[day].slice(0, 3)).join(" e ");

        return `<article class="subject-card">
            <span class="subject-accent tone-${index}" aria-hidden="true"></span>
            <div class="subject-info">
                <div class="subject-title-row">
                    <span class="subject-code">${id}</span>
                    <span class="subject-name">${subject.name}</span>
                </div>
                <div class="subject-meta">
                    <span>${daysText}</span>
                    <span>${stats.present} presenças</span>
                    <span class="${stats.absent > 0 ? "danger" : ""}">${stats.absent} ${stats.absent === 1 ? "falta" : "faltas"}</span>
                    ${stats.cancelled ? `<span>${stats.cancelled} cancelada${stats.cancelled > 1 ? "s" : ""}</span>` : ""}
                </div>
            </div>
            <div class="subject-rate">
                <strong>${rateText}</strong>
                <small>freq. registrada</small>
                <div class="progress-track" aria-hidden="true"><div class="progress-fill${lowClass}" style="width:${progress}%"></div></div>
            </div>
        </article>`;
    }).join("");
}

function renderSemesterStats() {
    const container = document.getElementById("semesterStats");
    const stats = aggregateAttendanceStats(attendanceData);
    const totalEvents = countEvents(eventsData);
    const rateText = stats.rate === null ? "—" : `${stats.rate}%`;
    const progress = stats.rate ?? 0;
    const lowClass = stats.rate !== null && stats.rate < 75 ? " low" : "";

    container.innerHTML = `
        <div class="stat-box green"><strong>${stats.present}</strong><span>Presenças</span></div>
        <div class="stat-box red"><strong>${stats.absent}</strong><span>Faltas</span></div>
        <div class="stat-box violet"><strong>${totalEvents}</strong><span>Eventos</span></div>
        <div class="semester-rate">
            <div class="semester-rate-row"><span>Frequência registrada</span><strong>${rateText}</strong></div>
            <div class="progress-track" style="width:100%" aria-hidden="true"><div class="progress-fill${lowClass}" style="width:${progress}%"></div></div>
        </div>`;
}

function renderCalendar() {
    const calendar = document.getElementById("calendarDays");
    const display = document.getElementById("monthDisplay");
    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(currentDate);
    display.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = keyOfToday();

    for (let index = 0; index < firstWeekday; index += 1) {
        calendar.insertAdjacentHTML("beforeend", `<div class="calendar-spacer" aria-hidden="true"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const weekday = new Date(year, month, day).getDay();
        const hasClass = Object.values(subjects).some(subject => subject.days.includes(weekday));
        const statuses = normaliseRecord(attendanceData[dateKey]);
        const statusClass = Object.keys(statuses).length ? getDayClass(statuses) : "";
        const events = Object.values(normaliseRecord(eventsData[dateKey])).slice(0, 3);
        const dots = events.map(event => `<span class="evt-dot evt-${eventTypeClass(normaliseRecord(event).type)}"></span>`).join("");
        const selectedClass = selectedDay?.dateKey === dateKey ? " selected" : "";
        const className = ["day-card", hasClass ? "has-class" : "no-class", statusClass, dateKey === today ? "today" : "", selectedClass].filter(Boolean).join(" ");
        const ariaLabel = `${day} de ${monthLabel}`;

        calendar.insertAdjacentHTML("beforeend", `<button type="button" class="${className}" aria-label="${ariaLabel}" onclick="window.showDay('${dateKey}', ${weekday})">
            <span class="day-number">${day}</span>
            <span class="evt-dots" aria-hidden="true">${dots}</span>
        </button>`);
    }
}

function renderAll() {
    renderCalendar();
    renderSummary();
    renderAgenda();
    renderDayDetails();
    renderSemesterStats();
    refreshIcons();
}

refreshIcons();
