import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/reset-password.mjs <email>");
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error: listError } = await supabase.auth.admin.listUsers({
  perPage: 200,
});
if (listError) {
  console.error(listError);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

const newPassword = randomBytes(9).toString("base64url");

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword,
});
if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`\n  Email:    ${email}`);
console.log(`  Password: ${newPassword}\n`);
console.log("Log in, then change it via account settings (or rerun this script).");
