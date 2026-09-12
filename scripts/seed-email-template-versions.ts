/**
 * Seed initial draft HTML versions for all 23 catalogue transactional email templates.
 *
 * Safe to run multiple times — skips any template that already has a non-placeholder
 * version, and never modifies published versions or historical message records.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SECRET_KEY=<key> npx tsx scripts/seed-email-template-versions.ts
 *   or:
 *   npm run seed:email-templates
 *
 * Env vars (in order of precedence):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";
import { generateTransactionalPreviewHtml, generateTransactionalPlainText } from "@/lib/transactional-email-preview";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type TemplateRow = { id: string };
type VersionRow = { id: string; version: number; html_template: string | null };

function isPlaceholder(html: string | null | undefined): boolean {
  if (!html) return true;
  const t = html.trim();
  return t.startsWith("[") || t.length < 200;
}

async function seedTemplate(template: (typeof TRANSACTIONAL_EMAILS)[number]): Promise<"created" | "skipped" | "error"> {
  const audience = template.audience === "Internal" ? "internal" : "customer";

  // Upsert the template record (safe — no append-only trigger on email_templates).
  const upsert = await admin
    .from("email_templates")
    .upsert(
      { template_key: template.id, name: template.name, audience, description: template.trigger, active: true },
      { onConflict: "template_key" },
    )
    .select("id")
    .single<TemplateRow>();

  if (upsert.error) {
    console.error(`  ✗ ${template.id}: upsert failed — ${upsert.error.message}`);
    return "error";
  }
  const templateId = upsert.data.id;

  // Read all existing versions for this template.
  const existing = await admin
    .from("email_template_versions")
    .select("id, version, html_template")
    .eq("template_id", templateId)
    .order("version", { ascending: false })
    .returns<VersionRow[]>();

  if (existing.error) {
    console.error(`  ✗ ${template.id}: version read failed — ${existing.error.message}`);
    return "error";
  }

  // Skip if any version already has real HTML content.
  const hasRealVersion = (existing.data ?? []).some((v) => !isPlaceholder(v.html_template));
  if (hasRealVersion) {
    console.log(`  ↷ ${template.id}: real version exists, skipping`);
    return "skipped";
  }

  // Next safe version number (after any existing stubs).
  const nextVersion = (existing.data?.[0]?.version ?? 0) + 1;

  const html = generateTransactionalPreviewHtml(template);
  const text = generateTransactionalPlainText(template);

  // Insert as a DRAFT (no published_at). The send path (ensureTemplateVersion) will create
  // its own published stub when an actual email is triggered; that stub is independent of
  // this draft and will not overwrite it (append-only trigger prevents any mutation).
  const insert = await admin.from("email_template_versions").insert({
    template_id: templateId,
    version: nextVersion,
    subject_template: template.subject,
    html_template: html,
    text_template: text,
    variable_schema: { fields: template.fields },
    contains_secure_content: false,
    change_note: "Initial catalogue draft — review copy and {{ field }} placement before publishing.",
    published_at: null,
  });

  if (insert.error) {
    // Unique constraint means a concurrent run already created this version — not a real error.
    if (insert.error.code === "23505") {
      console.log(`  ↷ ${template.id}: concurrent insert, skipping`);
      return "skipped";
    }
    console.error(`  ✗ ${template.id}: insert failed — ${insert.error.message}`);
    return "error";
  }

  console.log(`  ✓ ${template.id} v${nextVersion}: draft created (${template.fields.length} fields)`);
  return "created";
}

async function run() {
  console.log(`\nSeed: transactional email template versions`);
  console.log(`Target: ${url}`);
  console.log(`Templates: ${TRANSACTIONAL_EMAILS.length}\n`);

  let created = 0, skipped = 0, errors = 0;

  for (const template of TRANSACTIONAL_EMAILS) {
    const result = await seedTemplate(template);
    if (result === "created") created++;
    else if (result === "skipped") skipped++;
    else errors++;
  }

  console.log(`\nDone. created=${created} skipped=${skipped} errors=${errors}`);

  if (errors > 0) {
    console.error("\nSome templates failed. Check the errors above.");
    process.exit(1);
  }

  if (created > 0) {
    console.log("\nNext steps:");
    console.log("  1. Open Settings → Email Templates → Transactional");
    console.log("  2. Review the draft copy for each template");
    console.log("  3. Incorporate {{ field }} placeholders into the message body");
    console.log("  4. Publish each version when the copy is approved");
  }
}

run().catch((err: unknown) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
