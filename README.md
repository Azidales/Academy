# Academic Flow

Dashboard pessoal para controle de presença, faltas e eventos acadêmicos.

## Estrutura

- `index.html`: estrutura da interface.
- `styles.css`: estilos específicos do aplicativo.
- `app.js`: integração com Firebase e comportamento da interface.
- `app-logic.js`: regras puras e testáveis de datas, faltas e status.
- `tests/`: testes unitários usando o test runner nativo do Node.
- `.github/workflows/validate.yml`: validação automática de sintaxe e testes.

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

O projeto continua compatível com hospedagem estática no GitHub Pages. A integração atual com Firebase foi preservada. Regras de segurança e autenticação não fazem parte desta refatoração.
