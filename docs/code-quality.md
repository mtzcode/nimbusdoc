# Padrões de Código e Fluxo de Linting

Este documento descreve os padrões de código e o fluxo automatizado de linting e formatação estabelecidos para o projeto.

## ESLint

- Base: ESLint flat config com `@eslint/js` e `typescript-eslint`.
- Regras principais:
  - Organização de imports com `import/order` (ordem, agrupamento, espaçamento, alias `@/`).
  - Hooks do React: `react-hooks/rules-of-hooks` e `react-hooks/exhaustive-deps` como erro.
  - Promises: `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `await-thenable`, `require-await`.
  - Nomenclatura: `@typescript-eslint/naming-convention` (camelCase para variáveis e funções; PascalCase para tipos; propriedades permitem `snake_case` para compatibilidade com banco).
  - Prettier integrado via `eslint-plugin-prettier` com regra `prettier/prettier`.

## Prettier

Configuração padrão em `.prettierrc.json`:

- `semi: true`, `singleQuote: true`, `trailingComma: all`
- `printWidth: 100`, `tabWidth: 2`, `useTabs: false`
- `arrowParens: always`, `endOfLine: lf`

Arquivos ignorados: `dist`, `node_modules`, `supabase/functions`, `.husky`.

## Husky e lint-staged

- Hook `pre-commit`:
  - Executa `lint-staged` para rodar ESLint e Prettier apenas nos arquivos staged.
  - Executa `npm run typecheck` para validação de tipos (bloqueia commit em caso de erro).
- `lint-staged`:
  - `*.{ts,tsx,js,jsx}`: `eslint --max-warnings=0 --fix` e `prettier --write`.
  - `*.{css,md,json}`: `prettier --write`.

## Scripts NPM

- `npm run lint`: Linta todo o projeto com bloqueio em warnings.
- `npm run lint:fix`: Aplica correções automáticas.
- `npm run format`: Formata todos os arquivos suportados.
- `npm run typecheck`: Validação de tipos TS com `--noEmit`.
- `npm run prepare`: Inicializa Husky (já executado ao instalar).

## CI/CD

Workflow GitHub Actions (`.github/workflows/ci.yml`):

- Instala dependências com `npm ci`.
- Executa `npm run lint` e `npm run typecheck`.
- Executa `npm run build`.

## Boas Práticas

- Evitar `async` sem `await` (use `require-await`).
- Não deixar promises flutuando (use `no-floating-promises`).
- Manter imports organizados e agrupados com linhas em branco entre grupos.
- Preferir camelCase para variáveis e funções; PascalCase para tipos e componentes.
- Permitir `snake_case` apenas para propriedades espelhando o banco de dados.

## Execução Manual

- Lint: `npm run lint`
- Lint com fix: `npm run lint:fix`
- Formatação: `npm run format`
- Typecheck: `npm run typecheck`
