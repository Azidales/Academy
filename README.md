# Academic Flow

Dashboard pessoal para controle de presença, faltas e eventos acadêmicos.

## Estrutura

- `index.html`: estrutura semântica da interface.
- `styles.css`: ponto de entrada dos estilos.
- `styles/`: base visual, calendário, componentes e responsividade.
- `app.js`: integração com Firebase, renderização e interações.
- `app-logic.js`: regras puras e testáveis de datas, presença e eventos.
- `tests/`: testes unitários e verificações estruturais do front-end.
- `.github/workflows/validate.yml`: validação automática de sintaxe e testes.

## Interface

A interface prioriza três perguntas: como está o semestre, o que acontece hoje e qual é o próximo compromisso. O calendário é o foco principal no desktop, enquanto o mobile mantém navegação por abas.

Os percentuais exibidos são de **frequência registrada no app**: presença / (presença + falta). Aulas canceladas não entram no percentual e o sistema não presume um limite máximo de faltas.

## Desenvolvimento local

Como o aplicativo usa módulos JavaScript, sirva a pasta por HTTP em vez de abrir o HTML diretamente.

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Validação

Com Node.js 22 ou superior:

```bash
node --check app.js
node --check app-logic.js
node --test tests/*.test.mjs
```

## Observações

O projeto continua compatível com hospedagem estática no GitHub Pages. A integração e o modelo de dados atuais do Firebase foram preservados. Regras de segurança e autenticação não fazem parte deste redesign.
