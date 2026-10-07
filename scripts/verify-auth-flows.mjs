import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Fill in .env.local first.",
  );
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];
const sessionCookieName = `sb-${projectRef}-auth-token`;

const testEmail = "auth-flow-test@example.com";
const testUsername = "auth_flow_test";
const testPassword = "Auth-Flow-Test-Passw0rd!";

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

async function fetchPage(path, cookieHeader) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location"), body };
}

function encodeSessionCookie(session) {
  const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${sessionCookieName}=base64-${encoded}`;
}

async function main() {
  console.log(`Target: ${baseUrl}\n`);

  const signedOutRoot = await fetchPage("/");
  check(
    "Signed out: / renders the landing page",
    signedOutRoot.status === 200 && signedOutRoot.body.includes("Learn the market"),
    `status=${signedOutRoot.status}`,
  );

  const signedOutDashboard = await fetchPage("/dashboard");
  check(
    "Signed out: /dashboard redirects to /login",
    signedOutDashboard.status >= 300 &&
      signedOutDashboard.status < 400 &&
      (signedOutDashboard.location ?? "").startsWith("/login"),
    `status=${signedOutDashboard.status} location=${signedOutDashboard.location}`,
  );

  const loginPage = await fetchPage("/login");
  check(
    "Signed out: /login renders",
    loginPage.status === 200 && loginPage.body.includes("paper trading workstation"),
    `status=${loginPage.status}`,
  );

  const signupPage = await fetchPage("/signup");
  check(
    "Signed out: /signup renders",
    signupPage.status === 200 && signupPage.body.includes("$10,000 paper balance"),
    `status=${signupPage.status}`,
  );

  const supabase = createClient(url, publishableKey);

  const { error: badCredsError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: "definitely-the-wrong-password",
  });
  check(
    "Invalid password is rejected",
    Boolean(badCredsError),
    "wrong password unexpectedly accepted",
  );

  const { error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { username: testUsername } },
  });
  check(
    "Test user signup succeeds or already exists",
    !signUpError || signUpError.message.toLowerCase().includes("already"),
    signUpError?.message,
  );

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  check(
    "Valid password signs in",
    !signInError && Boolean(signInData.session),
    signInError?.message,
  );

  if (signInError || !signInData.session) {
    console.log("Cannot continue without a session.");
    process.exit(1);
  }

  const cookieHeader = encodeSessionCookie(signInData.session);

  const signedInDashboard = await fetchPage("/dashboard", cookieHeader);
  check(
    "Signed in: /dashboard renders with a session",
    signedInDashboard.status === 200,
    `status=${signedInDashboard.status}`,
  );
  check(
    "Signed in: dashboard shows the $10,000 paper balance",
    signedInDashboard.body.includes("$10,000.00"),
    "balance not found in page",
  );
  check(
    "Signed in: dashboard shows the account email",
    signedInDashboard.body.includes(testEmail),
    "email not found in page",
  );

  const signedInLogin = await fetchPage("/login", cookieHeader);
  check(
    "Signed in: /login redirects away to /dashboard",
    signedInLogin.status >= 300 &&
      signedInLogin.status < 400 &&
      (signedInLogin.location ?? "").startsWith("/dashboard"),
    `status=${signedInLogin.status} location=${signedInLogin.location}`,
  );

  const signedInRoot = await fetchPage("/", cookieHeader);
  check(
    "Signed in: / redirects to /dashboard",
    signedInRoot.status >= 300 &&
      signedInRoot.status < 400 &&
      (signedInRoot.location ?? "").startsWith("/dashboard"),
    `status=${signedInRoot.status} location=${signedInRoot.location}`,
  );

  await supabase.auth.signOut();

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`Test run aborted: ${error.message}`);
  process.exit(1);
});
