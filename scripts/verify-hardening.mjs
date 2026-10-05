import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

const root = process.cwd();

function listFiles(dir, extensions, skipDirs) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.includes(entry.name)) results.push(...listFiles(full, extensions, skipDirs));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function readEnvFile(file) {
  try {
    const values = {};
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) values[match[1]] = match[2].trim();
    }
    return values;
  } catch {
    return null;
  }
}

const EXPECTED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_BASE_URL",
];
const ALLOWED_PUBLIC_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]);

console.log("Environment variable usage");

const exampleEnv = readEnvFile(path.join(root, ".env.example"));
check(".env.example exists", exampleEnv !== null);
const exampleKeys = exampleEnv ? Object.keys(exampleEnv) : [];
check(
  ".env.example declares the expected variables",
  EXPECTED_ENV_KEYS.every((key) => exampleKeys.includes(key)) &&
    exampleKeys.every((key) => EXPECTED_ENV_KEYS.includes(key)),
  `found: ${exampleKeys.join(", ")}`,
);

const localEnv = readEnvFile(path.join(root, ".env.local"));
if (localEnv) {
  const publicKeys = Object.keys(localEnv).filter((key) => key.startsWith("NEXT_PUBLIC_"));
  check(
    "Only whitelisted NEXT_PUBLIC_ variables exist",
    publicKeys.every((key) => ALLOWED_PUBLIC_KEYS.has(key)),
    `found: ${publicKeys.join(", ")}`,
  );
  check(
    "No secret-bearing NEXT_PUBLIC_ variable",
    !publicKeys.some((key) => key.includes("SERVICE") || key.includes("AI_API")),
    `found: ${publicKeys.join(", ")}`,
  );
} else {
  check(".env.local exists for local verification", false, "copy .env.example to .env.local");
}

console.log("\nSecret exposure checks");

const secretValues = [];
if (localEnv) {
  for (const key of ["AI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const value = localEnv[key];
    if (value && value.length >= 20) secretValues.push({ key, value });
  }
}

const trackedFiles = [
  ...listFiles(path.join(root, "src"), [".ts", ".tsx", ".css"], ["node_modules"]),
  ...listFiles(path.join(root, "scripts"), [".mjs"], ["node_modules"]),
  ...listFiles(path.join(root, "public"), [".js", ".json", ".txt", ".html"], []),
  path.join(root, "package.json"),
  path.join(root, "next.config.ts"),
];

for (const secret of secretValues) {
  const leaked = trackedFiles.filter((file) => {
    try {
      return fs.readFileSync(file, "utf8").includes(secret.value);
    } catch {
      return false;
    }
  });
  check(
    `${secret.key} value does not appear in source files`,
    leaked.length === 0,
    leaked.join(", "),
  );
}

let envTracked = "";
try {
  envTracked = execSync("git ls-files -- .env.local", { encoding: "utf8" }).trim();
} catch {
  envTracked = "git-error";
}
check(".env.local is not tracked by git", envTracked === "", envTracked);

const clientChunks = listFiles(path.join(root, ".next", "static"), [".js"], []);
if (clientChunks.length > 0) {
  for (const secret of secretValues) {
    const leaked = clientChunks.filter((file) => {
      try {
        return fs.readFileSync(file, "utf8").includes(secret.value);
      } catch {
        return false;
      }
    });
    check(
      `Client bundles do not contain ${secret.key}`,
      leaked.length === 0,
      `${leaked.length} chunk(s)`,
    );
  }
  const aiInClient = clientChunks.filter((file) => {
    try {
      const content = fs.readFileSync(file, "utf8");
      return (
        content.includes("x-goog-api-key") || content.includes("generativelanguage.googleapis.com")
      );
    } catch {
      return false;
    }
  });
  check(
    "AI provider adapter is not shipped to the browser",
    aiInClient.length === 0,
    `${aiInClient.length} chunk(s)`,
  );
} else {
  check("Production build exists to scan client bundles", false, "run npm run build first");
}

console.log("\nExchange isolation checks");

const sourceFiles = listFiles(path.join(root, "src"), [".ts", ".tsx"], []);
const forbiddenPatterns = [
  { label: "Binance order endpoint", pattern: "/api/v3/order" },
  { label: "Binance signed request header", pattern: "X-MBX-APIKEY" },
  { label: "Binance request signature", pattern: "signature=" },
  { label: "Binance account endpoint", pattern: "/sapi/v1/" },
  { label: "Service role key usage in app source", pattern: "SUPABASE_SERVICE_ROLE_KEY" },
];
for (const { label, pattern } of forbiddenPatterns) {
  const hits = sourceFiles.filter((file) => {
    try {
      return fs.readFileSync(file, "utf8").includes(pattern);
    } catch {
      return false;
    }
  });
  check(`${label} is absent from src`, hits.length === 0, hits.join(", "));
}

const wsSource = (() => {
  try {
    return fs.readFileSync(path.join(root, "src", "lib", "market-data", "ws.ts"), "utf8");
  } catch {
    return "";
  }
})();
check(
  "Market feed reconnects with timer backoff",
  wsSource.includes("reconnectTimer") &&
    wsSource.includes("Math.min") &&
    wsSource.includes("Math.random"),
);

const clientEntryFiles = sourceFiles.filter((file) => {
  try {
    return fs.readFileSync(file, "utf8").startsWith('"use client"');
  } catch {
    return false;
  }
});
const clientAiImports = clientEntryFiles.filter((file) => {
  try {
    const content = fs.readFileSync(file, "utf8");
    return content.includes('from "@/lib/ai/config"') || content.includes('from "@/lib/ai/gemini"');
  } catch {
    return false;
  }
});
check(
  "No client component imports the AI config or provider",
  clientAiImports.length === 0,
  clientAiImports.join(", "),
);

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
