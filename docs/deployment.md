# Deployment

## Vercel

Import the GitHub repository `adrianbutsos/p-tscp` into Vercel. The project is a standard Next.js application and does not require a custom build command.

Configure these environment variables for Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://hrbqwypclzbfanjdmwpc.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable/anon key
- `OPENAI_API_KEY` — server-only OpenAI key
- `OPENAI_MODEL` — optional model override
- `NEXT_PUBLIC_APP_URL` — deployed Vercel URL

Do not add `SUPABASE_SERVICE_ROLE_KEY` unless a future server-only maintenance job explicitly needs it. Never expose it to browser code.

## Supabase first-time setup

Apply `supabase/migrations/20260907000000_initial_schema.sql` in the Supabase SQL Editor or through the project-scoped Supabase MCP connection. Then sign in once with the application and promote that account to admin:

```sql
insert into public.admin_users (user_id, role)
select id, 'admin' from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update set role = 'admin';
```

Replace the email with the real administrator email. This is an intentional one-time privileged action. All public tables in the migration have Row Level Security enabled; application queries use the authenticated session and never the service-role key.

## Local verification

```bash
npm install
npm run typecheck
npm run build
npm run dev
```
