# Approvals

The `/approvals` app is the consolidated review inbox for operational and financial requests. Source records remain in their owning modules; an approval stores canonical links and authorization state without marking a purchase, payment, release, attendance record, or project change as fulfilled.

## Architecture

- Request types and form validation are centralized in `lib/approvals.ts`.
- Workflow rules and thresholds are stored in `approval_workflow_rules` and can be adjusted by a Super Admin from the Approvals page.
- Browser mutations use authenticated same-origin route handlers under `/api/approvals`.
- Submission, decisions, reassignment, withdrawal, archiving, and financial events use service-role-only PostgreSQL functions.
- Active steps are row-locked before decisions. A stale second decision returns HTTP `409`.
- RLS limits direct reads to requesters, assigned approvers, authorized Admins, and Super Admins. Browser roles have no direct business-state mutation grants.
- Financial maker-checker rules are enforced in PostgreSQL. Default rules do not permit self-approval.
- Attachments reuse private R2 uploads and `media_assets`; approval links and audit entries are created through the shared media completion flow.
- Internal notifications use `staff_notifications` and the existing shell notification bell. Event keys prevent duplicate delivery records.

## Deployment

1. Apply `supabase/migrations/20260809170000_approvals_foundation.sql` before deploying the application.
2. Keep `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Configure the existing R2/media bindings and direct-upload credentials for supporting documents.
4. Set `CRON_SECRET` and invoke `POST /api/approvals/reminders` with `Authorization: Bearer <CRON_SECRET>` on the desired reminder schedule. The operation is idempotent.
5. Use `supabase/rollbacks/20260809170000_approvals_foundation.sql` only for a coordinated rollback before production approval data is retained.

## Verification

- Unit rules: `npm test`
- TypeScript: `npm run typecheck`
- Lint: `npm run lint`
- Production build: `npm run build`
- Database behavior: run `supabase/tests/approvals_foundation.sql` against a reset local Supabase instance.

Approved attendance requests intentionally do not overwrite clock records because this repository does not yet contain a persisted staff-attendance ledger. The approval audit preserves original and requested values, and the source link returns reviewers to Attendance. Payroll adjustments are updated only when an approval is explicitly linked to an existing pending adjustment.
