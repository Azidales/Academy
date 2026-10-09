import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getFirestore, doc, setDoc, updateDoc, deleteField, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { countAbsences, escapeHtml as esc, formatDateKey as fmtDate, getDayClass, normaliseRecord, todayKey as keyOfToday, upcomingEventDates } from "./app-logic.js";

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
            "SE621A": { name: "Economia Industrial", days: [1, 4], start: {1: "19:00", 4: "21:00"} },
            "SE620": { name: "Economia do Setor Público", days: [1, 3], start: {1: "21:00", 3: "19:00"} },
            "SE623": { name: "Economia Internacional II", days: [2, 5], start: {2: "19:00", 5: "21:00"} },
            "SE622": { name: "Elaboração e Análise de Projetos II", days: [2, 4], start: {2: "21:00", 4: "19:00"} }
        };

        const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const EVT_TYPES = { prova: "Prova", trabalho: "Trabalho" };

        let statusData = {};
        let eventsData = {};
        let currentDate = new Date();
        let selectedDay = null;
        let evtType = 'prova';


        document.getElementById('evtSubject').innerHTML =
            `<option value="">Sem matéria</option>` +
            Object.keys(subjects).map(id => `<option value="${id}">${id} — ${subjects[id].name}</option>`).join('');

        onSnapshot(
            doc(db, "users", "renato"),
            (snap) => {
                const data = snap.exists() ? snap.data() : {};
                statusData = normaliseRecord(data.absences);
                eventsData = normaliseRecord(data.events);
                renderAll();
                setLoaderReady();
            },
            (error) => {
                console.error('Falha ao sincronizar com o Firestore:', error);
                statusData = {};
                eventsData = {};
                renderAll();
                setLoaderError();
            }
        );

        window.switchTab = (tabId, btn) => {
            if (window.innerWidth < 768) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('tab-active'));
                document.getElementById('tab-' + tabId).classList.add('tab-active');
                document.querySelectorAll('nav button').forEach(b => b.classList.remove('nav-active'));
                btn.classList.add('nav-active');
                lucide.createIcons();
            }
        };

        window.setStatus = async (date, subId, status, btn) => {
            btn.innerHTML = `<span class="animate-pulse">...</span>`;

            const isToggleOff = statusData[date]?.[subId] === status;
            const docRef = doc(db, "users", "renato");

            try {
                if (isToggleOff) {
                    await updateDoc(docRef, {
                        [`absences.${date}.${subId}`]: deleteField()
                    });
                } else {
                    await setDoc(docRef, {
                        absences: { [date]: { [subId]: status } }
                    }, { merge: true });
                }
            } catch (e) {
                renderDayDetails();
                showSyncError();
            }
        };

        window.toggleEvtForm = () => {
            const f = document.getElementById('evtFields');
            f.classList.toggle('hidden');
            document.getElementById('evtToggle').innerText = f.classList.contains('hidden') ? '+ EVENTO' : 'CANCELAR';
            if (!f.classList.contains('hidden')) {
                document.getElementById('evtDesc').focus();
                if (window.innerWidth < 768) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        window.setEvtType = (t) => {
            evtType = t;
            paintEvtType();
        };

        function paintEvtType() {
            const on = { prova: 'bg-[#E05252] text-white border-[#E05252]', trabalho: 'bg-[#f59e0b] text-white border-[#f59e0b]' };
            const off = { prova: 'bg-white text-[#E05252] border-[#fdf0f0]', trabalho: 'bg-white text-[#f59e0b] border-[#fef3c7]' };
            for (const t of ['prova', 'trabalho']) {
                const el = document.getElementById('evtType' + t.charAt(0).toUpperCase() + t.slice(1));
                el.className = `py-2.5 rounded-xl text-[9px] font-extrabold border transition ${evtType === t ? on[t] : off[t]}`;
            }
        }

        window.addEvent = async () => {
            if (!selectedDay) return;
            const input = document.getElementById('evtDesc');
            const btn = document.getElementById('evtAdd');
            const desc = input.value.trim();
            const subject = document.getElementById('evtSubject').value;
            const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).slice(0, 8);

            btn.innerHTML = `<span class="animate-pulse">...</span>`;
            try {
                await setDoc(doc(db, "users", "renato"), {
                    events: { [selectedDay.dateKey]: { [id]: { type: evtType, desc, subject } } }
                }, { merge: true });
                input.value = '';
                window.toggleEvtForm();
            } catch (e) {
                showSyncError();
            }
            btn.innerHTML = 'ADICIONAR';
        };

        window.delEvent = async (dateKey, id) => {
            try {
                await updateDoc(doc(db, "users", "renato"), {
                    [`events.${dateKey}.${id}`]: deleteField()
                });
            } catch (e) {
                showSyncError();
            }
        };

        window.changeMonth = (s) => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + s, 1); renderAll(); };

        window.showDay = (dateKey, dayOfWeek) => {
            selectedDay = { dateKey, dayOfWeek };
            renderDayDetails();
            if (window.innerWidth < 768) window.switchTab('today', document.getElementById('todayBtn'));
        };

        function setLoaderReady() {
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }

        function setLoaderError() {
            const loader = document.getElementById('loader');
            loader.classList.remove('transition-opacity', 'duration-500');
            loader.innerHTML = `
                <div class="max-w-xs text-center px-6">
                    <i data-lucide="cloud-off" class="w-10 h-10 mx-auto mb-4 text-slate-400"></i>
                    <p class="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Falha ao sincronizar</p>
                    <p class="text-xs text-slate-400">Verifique sua conexão e recarregue a página.</p>
                </div>`;
            lucide.createIcons();
        }

        function showSyncError() {
            clearSyncError();
            document.getElementById('dayDetails').insertAdjacentHTML('afterbegin',
                `<div id="syncError" class="mb-4 p-3 rounded-2xl bg-[#fdf0f0] border border-[#f0b8b8] text-[10px] font-black uppercase tracking-widest text-[#E05252] text-center">Falha ao sincronizar</div>`);
        }

        function clearSyncError() {
            document.getElementById('syncError')?.remove();
        }

        function evtChip(dateKey, id, ev, removable) {
            const knownType = ev.type === 'prova' || ev.type === 'trabalho';
            const color = ev.type === 'prova' ? '#E05252' : ev.type === 'trabalho' ? '#f59e0b' : '#64748b';
            const bg = ev.type === 'prova' ? '#fdf0f0' : ev.type === 'trabalho' ? '#fffbeb' : '#f1f5f9';
            const label = knownType ? EVT_TYPES[ev.type] : 'Evento';
            const del = removable
                ? `<button type="button" aria-label="Excluir evento" onclick="window.delEvent('${dateKey}', '${id}')" class="text-slate-300 hover:text-[#E05252] transition shrink-0 p-2"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`
                : '';
            return `<div class="flex items-center justify-between gap-2 py-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0" style="color:${color};background:${bg}">${label}</span>
                            ${ev.subject && subjects[ev.subject] ? `<span class="text-[9px] font-black uppercase text-slate-300 shrink-0">${ev.subject}</span>` : ''}
                            ${ev.desc ? `<span class="text-xs font-bold text-slate-700 truncate">${esc(ev.desc)}</span>` : ''}
                        </div>${del}
                    </div>`;
        }

        function renderDayDetails() {
            if (!selectedDay) return;
            clearSyncError();
            const { dateKey, dayOfWeek } = selectedDay;
            const container = document.getElementById('dayBody');
            const dateFmt = fmtDate(dateKey);
            const dayName = DAY_NAMES[dayOfWeek];

            let html = `<div class="mb-6"><h3 class="text-xl font-extrabold">${dateFmt}</h3><p class="text-[10px] font-black uppercase text-blue-600">${dayName}</p></div><div class="space-y-4">`;
            let found = false;

            Object.keys(subjects).forEach(id => {
                if (subjects[id].days.includes(dayOfWeek)) {
                    found = true;
                    const st = statusData[dateKey]?.[id];
                    html += `
                        <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                            <div class="flex justify-between items-center mb-4 text-[10px] font-black">
                                <span class="text-slate-300 uppercase">${id}</span>
                                <span class="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">${subjects[id].start[dayOfWeek]}h</span>
                            </div>
                            <h4 class="text-xs font-bold text-slate-700 mb-5 leading-snug">${subjects[id].name}</h4>
                            <div class="grid grid-cols-3 gap-1">
                                <button onclick="window.setStatus('${dateKey}', '${id}', 'present', this)" class="py-2.5 rounded-xl text-[9px] font-extrabold border transition ${st==='present'?'bg-blue-600 text-white border-blue-600':'bg-white text-blue-600 border-blue-50'}">PRESENTE</button>
                                <button onclick="window.setStatus('${dateKey}', '${id}', 'absent', this)" class="py-2.5 rounded-xl text-[9px] font-extrabold border transition ${st==='absent'?'bg-[#E05252] text-white border-[#E05252]':'bg-white text-[#E05252] border-[#fdf0f0]'}">FALTEI</button>
                                <button onclick="window.setStatus('${dateKey}', '${id}', 'cancelled', this)" class="py-2.5 rounded-xl text-[9px] font-extrabold border transition ${st==='cancelled'?'bg-slate-400 text-white border-slate-400':'bg-white text-slate-400 border-slate-100'}">CANCELADA</button>
                            </div>
                        </div>`;
                }
            });

            const dayEvents = eventsData[dateKey] || {};
            const evIds = Object.keys(dayEvents);

            if (!found) html += `<div class="py-10 text-center opacity-30"><i data-lucide="coffee" class="w-10 h-10 mx-auto mb-2"></i><p class="text-[10px] font-bold uppercase tracking-widest">Sem Aulas</p></div>`;

            if (evIds.length) {
                html += `<div class="pt-2"><p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Eventos</p>
                         <div class="divide-y divide-slate-100">${evIds.map(id => evtChip(dateKey, id, dayEvents[id], true)).join('')}</div></div>`;
            }

            container.innerHTML = html + `</div>`;
            document.getElementById('dayForm').classList.remove('hidden');
            paintEvtType();
            lucide.createIcons();
        }

        function renderAgenda() {
            const c = document.getElementById('agenda-container');
            const tk = keyOfToday();
            const dates = upcomingEventDates(eventsData, tk);

            if (!dates.length) {
                c.innerHTML = `<div class="py-16 text-center opacity-30"><i data-lucide="calendar-check" class="w-10 h-10 mx-auto mb-2"></i><p class="text-[10px] font-bold uppercase tracking-widest">Nada por vir</p></div>`;
                return;
            }

            const now = new Date();
            const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            c.innerHTML = dates.map(dk => {
                const [y, m, d] = dk.split('-').map(Number);
                const when = new Date(y, m - 1, d);
                const diff = Math.round((when - base) / 86400000);
                const label = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `Em ${diff} dias`;
                const urgent = diff <= 2;
                const items = Object.keys(eventsData[dk]).map(id => evtChip(dk, id, eventsData[dk][id], false)).join('');
                return `<div onclick="window.showDay('${dk}', ${when.getDay()})" class="bg-white p-5 rounded-3xl border border-white shadow-xl shadow-slate-200/50 cursor-pointer transition hover:shadow-slate-300/50">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <span class="text-xs font-extrabold text-slate-800">${fmtDate(dk)}</span>
                                    <span class="text-[9px] font-black uppercase text-slate-300 ml-2">${DAY_NAMES[when.getDay()]}</span>
                                </div>
                                <span class="text-[9px] font-black uppercase px-2 py-1 rounded-lg ${urgent ? 'text-[#E05252] bg-[#fdf0f0]' : 'text-blue-600 bg-blue-50'}">${label}</span>
                            </div>
                            <div class="divide-y divide-slate-100">${items}</div>
                        </div>`;
            }).join('');
        }

        function renderAll() {
            const sumContainer = document.getElementById('summary-container');
            sumContainer.innerHTML = '';
            Object.keys(subjects).forEach(id => {
                const faults = countAbsences(statusData, id);
                sumContainer.innerHTML += `<div class="bg-white p-5 rounded-3xl border border-white flex justify-between items-center shadow-xl shadow-slate-200/50"><div class="flex-1 mr-4"><p class="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">${id}</p><h4 class="text-xs font-bold text-slate-800 leading-snug">${subjects[id].name}</h4></div><div class="text-2xl font-extrabold shrink-0 ${faults>4?'text-[#E05252]':'text-blue-600'}">${faults}</div></div>`;
            });

            const cal = document.getElementById('calendarDays');
            const disp = document.getElementById('monthDisplay');
            cal.innerHTML = '';
            const y = currentDate.getFullYear(), m = currentDate.getMonth();

            const raw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
            disp.innerText = raw.charAt(0).toUpperCase() + raw.slice(1);

            const first = new Date(y, m, 1).getDay(), days = new Date(y, m+1, 0).getDate();
            const now = new Date(), todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

            for(let i=0; i<first; i++) cal.innerHTML += `<div></div>`;
            for(let d=1; d<=days; d++){
                const dk = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const dw = new Date(y,m,d).getDay();
                let has = false; Object.values(subjects).forEach(s => { if(s.days.includes(dw)) has=true; });
                const st = statusData[dk] || {};
                const statusClass = Object.keys(st).length > 0 ? getDayClass(st) : '';
                const baseClass = has ? 'bg-slate-50 text-slate-800 font-bold' : 'no-class';
                const evs = Object.values(normaliseRecord(eventsData[dk])).slice(0, 3);
                const dots = `<div class="evt-dots" aria-hidden="true">${evs.map(e => {
                    const dotClass = e.type === 'prova' ? 'evt-prova' : e.type === 'trabalho' ? 'evt-trabalho' : 'evt-generic';
                    return `<span class="evt-dot ${dotClass}"></span>`;
                }).join('')}</div>`;
                const dayLabel = `${d} de ${raw}`;
                cal.innerHTML += `<button type="button" aria-label="${dayLabel}" onclick="window.showDay('${dk}', ${dw})" class="day-card ${statusClass || baseClass} ${dk===todayKey?'today':''}">${d}${dots}</button>`;
            }
            renderAgenda();
            renderDayDetails();
            lucide.createIcons();
        }
