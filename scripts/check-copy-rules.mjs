import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["src", "scripts"];
const SCAN_FILES = ["README.md"];

const RULES = [
  { name: "em dash (U+2014)", pattern: /\u2014/g },
  { name: "emoji", pattern: /\p{Extended_Pictographic}/gu },
  {
    name: "gradient",
    pattern: /(^|[^a-z])(bg|from|to|via)-gradient|linear-gradient|radial-gradient|conic-gradient/gi,
  },
];

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full));
    } else if (
      /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|css|md)$/.test(entry) &&
      entry !== "check-copy-rules.mjs"
    ) {
      results.push(full);
    }
  }
  return results;
}

const files = [
  ...SCAN_FILES.map((f) => path.join(ROOT, f)),
  ...SCAN_DIRS.flatMap((d) => collectFiles(path.join(ROOT, d))),
];

let violations = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const rule of RULES) {
    const matches = content.match(rule.pattern);
    if (matches) {
      violations += matches.length;
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (rule.pattern.test(line)) {
          console.error(
            `${path.relative(ROOT, file)}:${index + 1} [${rule.name}] ${line.trim().slice(0, 120)}`,
          );
        }
        rule.pattern.lastIndex = 0;
      });
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} copy rule violation(s) found.`);
  process.exit(1);
}

console.log(`Copy rules passed across ${files.length} files.`);
