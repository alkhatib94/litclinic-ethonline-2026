import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const output = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
const files = output.split("\0").filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)(private|secrets|credentials)(\/|$)/i,
];
const forbiddenExtensions = new Set([".pem", ".key", ".p12", ".pfx", ".jks"]);
const secretPatterns = [
  { name: "private key", pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "GitHub token", pattern: /\bgh[oprsu]_[A-Za-z0-9_]{30,}\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  {
    name: "assigned secret value",
    pattern:
      /(?:api[_-]?key|access[_-]?token|auth[_-]?secret|client[_-]?secret|private[_-]?key|signing[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9/+_.-]{16,}/i,
  },
];

const findings = [];

for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  if (normalized === ".env.example") continue;

  if (forbiddenPaths.some((pattern) => pattern.test(normalized))) {
    findings.push(`${normalized}: forbidden sensitive path`);
    continue;
  }
  if (forbiddenExtensions.has(extname(normalized).toLowerCase())) {
    findings.push(`${normalized}: forbidden key or certificate extension`);
    continue;
  }

  const buffer = readFileSync(resolve(root, file));
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");

  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(text)) findings.push(`${normalized}: possible ${name}`);
  }
}

if (findings.length > 0) {
  console.error("Potential secret material found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed for ${files.length} repository files.`);
