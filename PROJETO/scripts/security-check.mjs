import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const trackedFiles = execSync("git ls-files .", {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".txt",
  ".html",
  ".css",
]);

const forbiddenPatterns = [
  {
    name: "Hardcoded Supabase anon key",
    regex: /VITE_SUPABASE_ANON_KEY\s*=\s*["']?[A-Za-z0-9\-_\.]{20,}/,
  },
  {
    name: "Hardcoded private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    name: "OpenAI-style secret key",
    regex: /sk-[A-Za-z0-9]{20,}/,
  },
  {
    name: "Google API key",
    regex: /AIza[0-9A-Za-z\-_]{35}/,
  },
  {
    name: "AWS access key",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "FatSecret client secret hardcoded",
    regex: /FATSECRET_CLIENT_SECRET\s*=\s*["']?[A-Za-z0-9]{16,}/,
  },
  {
    name: "Anthropic API key hardcoded",
    regex: /ANTHROPIC_API_KEY\s*=\s*["']?[A-Za-z0-9_\-]{20,}/,
  },
];

const findings = [];

for (const file of trackedFiles) {
  if (file === ".env.example") {
    continue;
  }

  const ext = path.extname(file);
  if (!textExtensions.has(ext)) {
    continue;
  }

  let content;
  try {
    content = readFileSync(path.join(root, file), "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          file,
          line: i + 1,
          name: pattern.name,
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Security check failed: potential secrets found.");
  for (const finding of findings) {
    console.error(`- ${finding.name} at ${finding.file}:${finding.line}`);
  }
  process.exit(1);
}

console.log("Security check passed: no obvious hardcoded secrets were detected.");
