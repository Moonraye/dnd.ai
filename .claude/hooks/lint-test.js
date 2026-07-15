#!/usr/bin/env node
/**
 * PostToolUse hook: after Claude edits/writes a JS/TS file, run ESLint (--fix)
 * and Jest --findRelatedTests for it, scoped to the workspace (client/ or server/).
 * Both run in parallel; ESLint uses a cache under node_modules/.cache.
 * Exit 2 feeds the failure output back to Claude so it fixes the problem.
 */
const { spawn } = require("child_process");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WORKSPACES = ["client", "server"]; // packages/shared has no eslint/jest

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const file = payload.tool_input && payload.tool_input.file_path;
  if (!file || !/\.(ts|tsx|js|jsx)$/i.test(file)) process.exit(0);

  const rel = path.relative(REPO_ROOT, file);
  if (
    rel.startsWith("..") ||
    /(^|[\\/])(node_modules|dist|\.next|coverage)([\\/]|$)/.test(rel)
  ) {
    process.exit(0);
  }

  const ws = WORKSPACES.find((w) => rel.startsWith(w + path.sep));
  if (!ws) process.exit(0);

  const cwd = path.join(REPO_ROOT, ws);
  // Forward slashes: safe to pass through cmd.exe on Windows, and both
  // eslint and jest accept them.
  const wsRel = path.relative(cwd, file).replace(/\\/g, "/");

  const run = (label, args) =>
    new Promise((resolve) => {
      const child = spawn(`npx ${args.join(" ")}`, { cwd, shell: true });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      const timer = setTimeout(() => child.kill(), 110_000);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve(null);
        resolve(`--- ${label} failed for ${ws}/${wsRel} ---\n${out.trim()}`);
      });
      child.on("error", (err) =>
        resolve(`--- ${label} could not start ---\n${err.message}`),
      );
    });

  Promise.all([
    run("eslint", [
      "eslint",
      "--fix",
      "--no-warn-ignored",
      "--cache",
      "--cache-location",
      "node_modules/.cache/eslint-hook/",
      `"${wsRel}"`,
    ]),
    run("jest (related tests)", [
      "jest",
      "--findRelatedTests",
      `"${wsRel}"`,
      "--passWithNoTests",
      "--silent",
    ]),
  ]).then((results) => {
    const problems = results.filter(Boolean);
    if (problems.length > 0) {
      console.error(problems.join("\n\n"));
      process.exit(2);
    }
    process.exit(0);
  });
});
