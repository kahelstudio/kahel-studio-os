# Kahel Studio OS

Kahel Studio OS is the internal operations platform for bookings, CRM, POS, projects, tasks, reporting, and client delivery portals.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The client portal persistence layer uses Supabase. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`, then apply `supabase/migrations/20260801000000_client_portals.sql` to the target project before using portal delivery features.

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run test:visual
npm run build
```

## Deployment Architecture

- **Github CI** validates pull requests and deploys configured branches.
- **Cloudflare Workers** runs the Next.js application through OpenNext.
- **Supabase** provides Postgres persistence for client portal settings, activity, and expiring link tokens.

The Worker deployment configuration is in `wrangler.jsonc`. Staging is `kahel.studio` from `staging`; production is `kahelstudio.com` from `main` through protected manual jobs. Pushes to `dev` run the validation jobs only and deploy nothing.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the complete Github variable checklist, Supabase and Cloudflare setup, branch and environment protections, rollout procedure, and rollback guidance. It intentionally contains no project references, credentials, or secret values.
