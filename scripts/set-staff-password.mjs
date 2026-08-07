import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.STAFF_EMAIL ?? process.env.KAHEL_STAFF_EMAIL;
const password = process.env.STAFF_PASSWORD;

if (!url || !secretKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing STAFF_EMAIL or STAFF_PASSWORD");
  process.exit(1);
}
if (password.length < 12) {
  console.error("STAFF_PASSWORD must be at least 12 characters");
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalized = email.trim().toLowerCase();
const { data: users, error: listError } = await admin.auth.admin.listUsers({
  perPage: 1000,
});

if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

const user = users.users.find(
  (u) => (u.email ?? "").toLowerCase() === normalized,
);

if (!user) {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
    });
  if (createError) {
    console.error("Failed to create user:", createError.message);
    process.exit(1);
  }
  console.log(`Created and set password for ${normalized} (id: ${created.user.id})`);
} else {
  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { password },
  );
  if (updateError) {
    console.error("Failed to update password:", updateError.message);
    process.exit(1);
  }
  console.log(`Password updated for ${normalized} (id: ${user.id})`);
}
