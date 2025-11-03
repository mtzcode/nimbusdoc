# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/5c47603f-1a1e-4490-b37d-e134f693e0a7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5c47603f-1a1e-4490-b37d-e134f693e0a7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5c47603f-1a1e-4490-b37d-e134f693e0a7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Configuração de Ambiente (Supabase)

- Variáveis públicas (frontend – Vite):
  - `VITE_SUPABASE_URL`: URL do projeto Supabase
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`): chave publicável/anon (nunca a service role)
- Variáveis privadas (Edge Functions – Deno/Supabase):
  - `SUPABASE_URL`: URL do projeto Supabase
  - `SERVICE_ROLE_KEY`: chave service role (APENAS no ambiente de função)
  - `ALLOWED_ORIGINS`: origens permitidas para CORS (ex.: `https://app.example.com,https://staging.example.com`)

### Segurança de Secrets
- Nunca exponha `SERVICE_ROLE_KEY` no cliente ou em `.env` do frontend.
- `.env` já está ignorado no `.gitignore` para evitar commits acidentais.
- O cliente (browser) valida em runtime se `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY/ANON_KEY` estão definidos e falha com mensagem clara se faltarem.
- As Edge Functions usam `Deno.env.get(...)` para ler `SUPABASE_URL` e `SERVICE_ROLE_KEY` somente no servidor.

### Exemplo de `.env` (Frontend)

Crie um arquivo `.env` na raiz (não comitar):

```
VITE_SUPABASE_URL="https://<your-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-public-key>"
```

### Exemplo de variáveis (Edge Functions)

Configure no ambiente da Supabase/CLI:

```
SUPABASE_URL="https://<your-ref>.supabase.co"
SERVICE_ROLE_KEY="<service-role-key>"
ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"
```

### Desenvolvimento
- Instale dependências: `npm i`
- Desenvolvimento: `npm run dev` (frontend)
- Build: `npm run build`
- Servir funções localmente (opcional): `supabase functions serve <nome-da-funcao>`

## Checklist de Segurança antes do Deploy

- Confirmar que `.env` e variantes estão no `.gitignore` (não versionar segredos).
- Validar que o frontend usa APENAS `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY/ANON_KEY`.
- Garantir que `SERVICE_ROLE_KEY` NÃO aparece em `src/`, `.env` do app ou commits.
- Revisar e configurar `ALLOWED_ORIGINS` com domínios corretos (sem `*` em produção).
- Verificar RLS: políticas ativas para `profiles`, `user_roles`, `clients`, `folders`, `files` e storage.
- Testar com usuário não-admin: acesso somente ao que é permitido.
- Checar logs das Edge Functions: não logar chaves, tokens ou dados sensíveis.
- Rotacionar chaves se houver suspeita de exposição; regenerar publishable e service role no painel.
- Conferir que redirects de autenticação (`redirectTo`) apontam para domínios válidos.
- Revisar CORS e HTTPS obrigatório em produção (incluindo Supabase e frontend).
