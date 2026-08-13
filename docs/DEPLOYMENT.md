# Deployment

## Architecture decision

This repository is a Next.js 16 application, not a React/Vite static site. It uses middleware, route handlers, server-only modules, Node-compatible APIs, and OpenNext. Cloudflare Pages Direct Upload cannot safely run those server features. The deployment target is therefore Cloudflare Workers through OpenNext, using two independent Workers:

- `kahelstudio-os-staging` serves `https://kahel.studio`.
- `kahelstudio-os-production` serves `https://kahelstudio.com`.

This is the existing compatible hosting model. It is safer than converting the application to static export or attempting a Pages upload that would omit the server runtime. There is no Pages project variable because no Pages project is used. The build output is `.open-next/`, not Vite's `dist/`.

## Local development

Use `npm run dev` for the local Next development server. Put local application values in `.env.local`; use `.dev.vars` when testing the OpenNext/Workers runtime. Both files are ignored. Start a local Supabase stack when Docker is available with `npx supabase start`, then obtain local URLs and keys with `npx supabase status`. Run `npm run db:reset` whenever you need a clean schema and refreshed date-relative sample data. Do not link a local workspace to either hosted project for normal development.

Copy the safe placeholders from `.env.example` and `.dev.vars.example`. `SUPABASE_SECRET_KEY` is server-only. Never add it, a service-role key, a database password, an access token, or an API token to browser code or any `NEXT_PUBLIC_*` variable.

The current application does not use Supabase from browser code. Consequently it has no Vite environment variables and does not need a public anon/publishable key in CI. If a browser Supabase client is added later, use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Next.js, and never a privileged key. The requested `VITE_*` names are intentionally not used because Vite is not this application's framework.

## CI/CD variables

Create variables in GitLab at **Settings > CI/CD > Variables**. Scope staging values to `staging` and production values to `production`. Mark every secret **Masked** and **Hidden** where GitLab offers Hidden; use **Protected** for every production value. The `SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` names may be created twice with different environment scopes.

| Variable | Used by | Type | Masked / Hidden | Protected | Scope |
| --- | --- | --- | --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Worker deployment | Variable | No / No | Yes for production | `staging`, `production` |
| `CLOUDFLARE_API_TOKEN` | Worker deployment | Variable | Yes / Yes | Yes for production | `staging`, `production` |
| `SUPABASE_ACCESS_TOKEN` | Supabase link, migration, function deployment | Variable | Yes / Yes | Yes for production | `staging`, `production` |
| `STAGING_SUPABASE_PROJECT_REF` | Staging migration and functions | Variable | No / No | No | `staging` |
| `STAGING_SUPABASE_DB_PASSWORD` | Staging migration | Variable | Yes / Yes | No | `staging` |
| `STAGING_SUPABASE_URL` | Staging Worker runtime binding | Variable | No / No | No | `staging` |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Staging Supabase Auth runtime binding | Variable | No / No | No | `staging` |
| `STAGING_CLOUDFLARE_WORKER_SECRETS` | Staging Worker runtime secrets | Variable | Yes / Yes | No | `staging` |
| `PRODUCTION_SUPABASE_PROJECT_REF` | Production migration and functions | Variable | No / No | Yes | `production` |
| `PRODUCTION_SUPABASE_DB_PASSWORD` | Production migration | Variable | Yes / Yes | Yes | `production` |
| `PRODUCTION_SUPABASE_URL` | Production Worker runtime binding | Variable | No / No | Yes | `production` |
| `PRODUCTION_SUPABASE_PUBLISHABLE_KEY` | Production Supabase Auth runtime binding | Variable | No / No | Yes | `production` |
| `PRODUCTION_CLOUDFLARE_WORKER_SECRETS` | Production Worker runtime secrets | Variable | Yes / Yes | Yes | `production` |

`STAGING_VITE_SUPABASE_URL`, `STAGING_VITE_SUPABASE_ANON_KEY`, `PRODUCTION_VITE_SUPABASE_URL`, `PRODUCTION_VITE_SUPABASE_ANON_KEY`, `STAGING_CLOUDFLARE_PAGES_PROJECT`, and `PRODUCTION_CLOUDFLARE_PAGES_PROJECT` are not required. They were renamed or omitted because this is a server-rendered Next.js/OpenNext application deployed to Workers, not Vite deployed to Pages. Do not create unused variables.

Set each Worker secrets file to newline-separated `NAME=value` entries. It must contain every server runtime secret used by the application, including:

```dotenv
SUPABASE_SECRET_KEY=replace-with-the-environment-server-secret
KAHEL_STAFF_EMAIL=owner@example.com
KAHEL_STAFF_EMAILS=owner@example.com,staff@example.com
TURNSTILE_SECRET=replace-with-the-secret-key
GOOGLE_AUTH_ENABLED=false
PAYMONGO_SECRET_KEY=sk_live_replace_me
PAYMONGO_WEBHOOK_SECRET=whsk_replace_me
```

Do not include `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` in this file; CI passes them as environment-specific Worker variables. Do not include `KAHEL_AUTH_DISABLED` or `AUTH_REDIRECT_URL`; `wrangler.jsonc` fixes them for both remote environments. If a secret is removed from the file later, delete the obsolete Worker secret separately with `wrangler secret delete --env <environment> <NAME>`; Wrangler's additive secrets upload intentionally does not delete omitted secrets.

Staging uses the existing managed Turnstile widget `0x4AAAAAAEDc-FdHAx_QAhyZ`, restricted to `kahel.studio`. Store its API-retrieved secret only as `TURNSTILE_SECRET`; the public sitekey is fixed in the login component. Turnstile is not loaded during local development.

Create a least-privilege Cloudflare API token with the required Workers deployment permissions only, restricted to the account that owns these Workers. Do not use a Global API Key. Create Supabase tokens with access limited to the relevant organization/projects and rotate them independently for staging and production if possible.

## Cloudflare setup

1. Create the two Workers named in `wrangler.jsonc`: `kahelstudio-os-staging` and `kahelstudio-os-production`. The first CI deployment can create them when the API token has Workers Scripts edit access.
2. Ensure the Cloudflare account owns active zones for `kahel.studio` and `kahelstudio.com` and DNS is proxied through Cloudflare.
3. Allow the CI token to edit Worker scripts for this account. It must not have broad zone, billing, account-administration, or Global API Key access.
4. The checked-in `custom_domain` routes attach `kahel.studio` to staging and `kahelstudio.com` to production. Review the generated route changes in the first deployment job before proceeding.
5. The Worker handles all routes, including dynamic Next routes and API routes; no Pages `_redirects` SPA fallback is appropriate or required.
6. The pipeline checks `GET /api/staff/session` after deployment. This endpoint is public by design and returns configuration state only; it does not return credentials.

## PayMongo webhook

Use the canonical production endpoint `https://kahelstudio.com/api/paymongo/webhook` and subscribe it to `checkout_session.payment.paid`. Store the signing secret returned for that exact live webhook as `PAYMONGO_WEBHOOK_SECRET`; test, live, and recreated webhooks have different signing secrets.

The endpoint preserves the raw request body for signature verification and immediately returns `200` for every validly signed delivery. Idempotent database processing runs after the response through Next.js `after()`. Malformed, mismatched, and persistence-failed signed events are logged without returning a non-2xx response, preventing PayMongo from disabling the endpoint after repeated delivery failures. Missing configuration and invalid signatures remain non-2xx because those requests cannot be authenticated as PayMongo deliveries.

If PayMongo disables the endpoint, retrieve its `hook_...` ID from the PayMongo dashboard and enable it with the live secret API key:

```bash
curl --request POST \
  --url "https://api.paymongo.com/v1/webhooks/${PAYMONGO_WEBHOOK_ID}/enable" \
  --user "${PAYMONGO_SECRET_KEY}:"
```

Confirm that Cloudflare Access, interactive challenges, bot rules, and restrictive rate limits exclude `/api/paymongo/webhook`. Ordinary WAF and DDoS protections may remain enabled as long as they do not mutate the request body or challenge PayMongo.

## Media infrastructure (R2 + Images + Queues)

Customer-facing media uses three Cloudflare services configured separately from the two Workers. The app Worker (`kahelstudio-os-*`) is a **producer**; a dedicated media Worker (`kahel-media-processor-staging`) is the Queue **consumer** that generates derivatives, watermarks, hosts into Cloudflare Images, and sends gallery-email outbox messages. Do not fold the consumer into the OpenNext Worker.

### Staging (provisioned and live)

- R2 buckets: `kahel-public-media-staging` (public site imagery) and `kahel-client-media-staging` (private originals/derivatives). The client bucket has a CORS policy allowing browser PUT for presigned uploads (`infrastructure/r2/staging-client-cors.json`).
- Cloudflare Images binding `IMAGES`, plus account `IMAGES_SIGNING_KEY`, `CLOUDFLARE_IMAGES_DELIVERY_HASH`, and account-specific `R2_ACCOUNT_ID`/`CLIENT_MEDIA_BUCKET_NAME`.
- Queues `kahel-media-processing-staging` (payload) and `kahel-media-processing-staging-dlq` (dead-letter). The media Worker consumes the payload queue; the app Worker produces.
- Staging watermark `system/kahelstudio-watermark.svg` in the public bucket (white logo), referenced by `WATERMARK_R2_KEY`.
- Deploy with `npm run deploy:staging` and `npm run deploy:media:staging`. Regenerate typings with `npm run cf:typegen` (writes `worker-configuration.d.ts` and `worker-media-configuration.d.ts`). Validate with `npm run cf:check` (dry-run) and `wrangler deploy --config wrangler.media.jsonc --env staging --dry-run`.

### Production (blocked — do not promote until provisioned)

The production environment in `wrangler.jsonc` keeps `MEDIA_INFRASTRUCTURE_ENABLED=false` until these exist:

1. `kahel-public-media-production` and `kahel-client-media-production` buckets, with the same CORS policy on the client bucket.
2. Cloudflare Images enabled for production with the account signing key, delivery hash, and the variant set in `infrastructure/cloudflare-images/variants.json` approved.
3. R2 lifecycle rule on the client bucket to expire `uploads/tmp/*` after 24 hours (staging-only cleanup today).
4. Queues `kahel-media-processing-production` and `kahel-media-processing-production-dlq`, with a production media Worker/`MediaProcessorEnv` consumer.
5. Secrets: `CLOUDFLARE_IMAGES_DELIVERY_HASH`, `IMAGES_SIGNING_KEY`, plus `WATERMARK_R2_KEY`, `GALLERY_EMAIL_FROM`, `GALLERY_EMAIL_REPLY_TO`, and production R2 credentials in each environment's secrets file.
6. Apply `supabase/migrations/20260802100000_cloudflare_media_galleries.sql` to the production Supabase project before first use; it is additive and safe.

### Email

The media worker sends gallery emails through the `EMAIL` binding. Listing the email account currently returns `Unauthorized [code: 2036]` — the token lacks the beta endpoint — so sending has not been walked end-to-end. Confirm per-account domain/allowlist setup and `remote` behavior per environment before production.

## Supabase setup

1. Create two separate Supabase projects, one staging and one production. Do not clone or reuse a project reference or database password.
2. Enable Supabase Auth email/password sign-in in each project. Create or invite each staff user listed in the comma-separated `KAHEL_STAFF_EMAILS` allowlist. `KAHEL_STAFF_EMAIL` remains a single-user fallback when the list is not set.
3. Set the staging Auth Site URL to `https://kahel.studio` and the production Auth Site URL to `https://kahelstudio.com`; invitation and confirmation emails fall back to this value when no explicit redirect is supplied. Add `https://kahel.studio/reset-password` to the staging Auth redirect allowlist and `https://kahelstudio.com/reset-password` to production. Add `http://localhost:3000/reset-password` locally.
4. Configure the reset-password email template and SMTP sender independently in each project. This repository currently has no committed Storage configuration or Edge Functions.
5. Put each project reference, database password, URL, publishable key, and least-privilege access token into its correctly scoped CI variables. The staging migration job uses `--include-seed` to refresh deterministic fictional sample data. Production runs `supabase db push --linked` without seeds, and no hosted job uses `db reset` or another destructive remote command.
6. Commit all schema changes as ordered files in `supabase/migrations`. Do not add remote-only schema changes. The pipeline starts an isolated local Supabase stack and runs `migration list` plus `db lint` before any remote migration.
7. Add Edge Functions under `supabase/functions/<function-name>/`. The staging and production function jobs deploy all committed functions only when that directory exists. They never use `--prune`, so a deployment cannot remove a remote function.

## GitLab protection

1. In **Settings > Repository > Protected branches**, protect `main`; allow merges and pushes only to the appropriate maintainers. Do not permit direct pushes.
2. Treat `dev` as the staging integration branch. Require feature branches to merge into `dev` by merge request. Protect it if only maintainers should integrate work.
3. In **Settings > Merge requests**, require successful pipelines before merge and configure the `main` target branch to accept merge requests from `dev` only through your approval policy.
4. In **Settings > CI/CD > Protected environments**, protect `production` and allow only authorized maintainers to deploy. This gates all three manual production jobs: migration, functions, and Worker deployment.
5. Add optional approval rules for production-bound merge requests, such as code owner and operations approval. GitLab records each environment deployment and the user who ran each manual job.
6. Use a GitLab runner that permits the `docker:27.4-dind` service in privileged mode. The isolated Supabase migration validation job installs the Docker client in its pinned Node image and never connects to a hosted database.

## Workflow

- Feature branches originate from `dev`. Pushes and merge requests run install, lint, type-check, Playwright visual tests, local Supabase migration validation, an OpenNext build, and a non-authenticated Worker deployment dry-run. They never receive deployment variables and never deploy.
- `dev` runs the same validation. On success it automatically migrates staging, deploys staging Edge Functions if present, deploys the staging Worker, and health-checks `https://kahel.studio`.
- `main` runs all validation again. Production migration is a protected manual job. After it succeeds, production function deployment is a protected manual job, followed by a protected manual Worker deployment and automatic health check.
- `resource_group` serializes every staging and production state-changing job. Validation jobs are interruptible; state-changing jobs are not.

## Rollback and failure handling

Redeploy a known-good Worker version from Cloudflare's Worker deployment history, or re-run the Worker deployment job for a previously successful GitLab pipeline after confirming its artifact retention. Revert the application commit through a merge request and let the normal pipeline deploy it.

Database rollback is not equivalent to an application rollback: a migration may have changed or transformed persisted data. Never automatically run down migrations in production. After a production migration, fix issues with a reviewed forward migration that preserves data and is compatible with both the restored and corrected application state.

If migration succeeds but the frontend deployment fails, stop before retrying production deployment, inspect the migration and application compatibility, then either repair and redeploy a compatible Worker or ship a forward-fix migration. Do not rerun a migration blindly, reset the database, or restore a database backup as an application rollback mechanism.

## First deployment

1. Create and configure the staging Supabase project, Cloudflare staging Worker/domain, and all `staging`-scoped variables and Worker secrets file.
2. Create `dev` from the intended baseline and merge the CI configuration through a feature branch. Confirm the feature-branch pipeline runs validation only.
3. Push or merge to `dev`. Confirm the local migration validation succeeds, inspect the staging migration log, then confirm the staging Worker deploy and `/api/staff/session` health check succeed at `https://kahel.studio`.
4. Test the staging application, authentication, Supabase data access, Storage, and any Edge Functions before promotion.
5. Create a merge request from `dev` to protected `main`; obtain required approvals and a successful pipeline.
6. Configure production's separate Supabase project, Cloudflare Worker/domain, production-scoped protected variables, and protected `production` environment before merging.
7. Merge to `main`. An authorized maintainer manually runs `migrate_production`, reviews it, manually runs `deploy_production_functions`, then manually runs `deploy_production_frontend`. Confirm the automatic production health check at `https://kahelstudio.com/api/staff/session`.
