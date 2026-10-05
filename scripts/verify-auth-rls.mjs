import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Fill in .env.local first.",
  );
  process.exit(1);
}

const password = "Rls-Test-Passw0rd!";
const stamp = Date.now();
const emailA = `rls-test-a-${stamp}@example.com`;
const emailB = `rls-test-b-${stamp}@example.com`;
const usernameA = `rls_test_a_${stamp}`.slice(0, 24);
const usernameB = `rls_test_b_${stamp}`.slice(0, 24);

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

async function signUp(username, email) {
  const client = createClient(url, publishableKey);
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw new Error(`signUp failed for ${email}: ${error.message}`);
  if (!data.session) {
    throw new Error(
      "No session after signup. Disable email confirmation in Supabase Auth settings for local testing.",
    );
  }
  return { client, session: data.session };
}

async function main() {
  console.log("Creating two test users...");
  const a = await signUp(usernameA, emailA);
  const b = await signUp(usernameB, emailB);
  console.log(`User A: ${emailA}`);
  console.log(`User B: ${emailB}`);

  const initA = await a.client.rpc("initialize_paper_account");
  check("A account initialization succeeds", !initA.error, initA.error?.message);
  const rowA = Array.isArray(initA.data) ? initA.data[0] : null;
  check(
    "A starts with exactly $10,000.00",
    rowA && Number(rowA.cash) === 10000,
    `cash=${rowA?.cash}`,
  );

  const initA2 = await a.client.rpc("initialize_paper_account");
  const rowA2 = Array.isArray(initA2.data) ? initA2.data[0] : null;
  check(
    "A initialization is idempotent (same account, same cash)",
    !initA2.error && rowA2 && rowA2.account_id === rowA.account_id && Number(rowA2.cash) === 10000,
    initA2.error?.message,
  );

  const initB = await b.client.rpc("initialize_paper_account");
  check("B account initialization succeeds", !initB.error, initB.error?.message);
  const rowB = Array.isArray(initB.data) ? initB.data[0] : null;
  check("B has a different account", rowB && rowB.account_id !== rowA.account_id);

  const readOwn = await a.client.from("paper_accounts").select("id, user_id");
  check(
    "A can read A's own paper account",
    !readOwn.error && Array.isArray(readOwn.data) && readOwn.data.length === 1,
    readOwn.error?.message ?? `rows=${readOwn.data?.length}`,
  );

  const bUserId = (await b.client.auth.getUser()).data.user?.id;
  const crossRead = await a.client
    .from("paper_accounts")
    .select("id")
    .eq("user_id", bUserId ?? "missing");
  check(
    "A cannot read B's paper account (RLS)",
    !crossRead.error && Array.isArray(crossRead.data) && crossRead.data.length === 0,
    crossRead.error?.message ?? `rows=${crossRead.data?.length}`,
  );

  const signedOut = createClient(url, publishableKey);
  const publicRead = await signedOut.from("paper_accounts").select("id");
  check(
    "Signed out users cannot read paper accounts",
    !publicRead.error && Array.isArray(publicRead.data) && publicRead.data.length === 0,
    publicRead.error?.message ?? `rows=${publicRead.data?.length}`,
  );

  const holdingsRead = await a.client.from("holdings").select("id");
  check("A can query holdings without error", !holdingsRead.error, holdingsRead.error?.message);

  const tradesRead = await a.client.from("trades").select("id");
  check("A can query trades without error", !tradesRead.error, tradesRead.error?.message);

  const aiLogsRead = await a.client.from("ai_action_logs").select("id");
  check("A can query ai_action_logs without error", !aiLogsRead.error, aiLogsRead.error?.message);

  const forbiddenInsert = await a.client
    .from("paper_accounts")
    .insert({ user_id: (await a.client.auth.getUser()).data.user?.id, cash_balance: 999999 });
  check(
    "A cannot insert paper accounts directly (no insert policy)",
    Boolean(forbiddenInsert.error),
    "insert unexpectedly succeeded",
  );

  await a.client.auth.signOut();
  await b.client.auth.signOut();

  if (serviceRoleKey) {
    const admin = createClient(url, serviceRoleKey);
    for (const email of [emailA, emailB]) {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list.data.users.find((u) => u.email === email);
      if (match) await admin.auth.admin.deleteUser(match.id);
    }
    console.log("Cleanup: test users deleted.");
  } else {
    console.log(
      `Cleanup: set SUPABASE_SERVICE_ROLE_KEY to auto delete test users.\n  Left over: ${emailA}, ${emailB}`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`Test run aborted: ${error.message}`);
  process.exit(1);
});
