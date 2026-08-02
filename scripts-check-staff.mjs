import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.URL, process.env.KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "eusebio.barrung@kahelstudio.com";
const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) { console.log("LIST ERROR", JSON.stringify(error)); process.exit(1); }
const users = data.users;
const u = users.find(x => (x.email||"").toLowerCase() === email.toLowerCase());
console.log("total users:", users.length, "| user found:", !!u);
if (u) console.log("id", u.id, "verified", u.email_verified, "confirmed", u.confirmed_at, "last_sign_in", u.last_sign_in_at, "banned", u.banned_until, "deleted", u.deleted_at);
console.log("kahelstudio.com logins:", users.map(x=>x.email).filter(e=>e&&/kahelstudio\.com$/.test(e)).join(", ") || "(none)");
const { data: profs, error: e } = await admin.from("staff_profiles").select("*");
console.log("staff_profiles err:", e?.message || "none");
console.log("staff_profiles rows:", profs ? profs.length : "n/a");
if (profs) for (const p of profs) console.log("  -", p.user_id, p.role, "active:", p.active, "galleries:", p.can_manage_galleries);
