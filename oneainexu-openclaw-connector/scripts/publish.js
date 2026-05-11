#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const VERSION_ARG = process.argv[2];
const VALID_BUMP_TYPES = new Set(["patch", "minor", "major"]);
const SEMVER_OR_V_SEMVER = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const IS_NPM_PUBLISH_LIFECYCLE =
  !VERSION_ARG &&
  process.env.npm_lifecycle_event === "publish" &&
  process.env.npm_command === "publish";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function usageAndExit() {
  console.error(
    "Usage: npm run publish -- <patch|minor|major|x.y.z|vx.y.z>\n" +
      "Example: npm run publish -- patch\n" +
      "Example: npm run publish -- 0.1.1"
  );
  process.exit(1);
}

if (IS_NPM_PUBLISH_LIFECYCLE) {
  console.log("Skip publish lifecycle re-entry.");
  process.exit(0);
}

if (!VERSION_ARG) {
  usageAndExit();
}

const normalizedVersion = VERSION_ARG.startsWith("v")
  ? VERSION_ARG.slice(1)
  : VERSION_ARG;

if (!VALID_BUMP_TYPES.has(VERSION_ARG) && !SEMVER_OR_V_SEMVER.test(VERSION_ARG)) {
  usageAndExit();
}

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJsonText = readFileSync(packageJsonPath, "utf8").replace(/^\uFEFF/, "");
const pkg = JSON.parse(packageJsonText);

console.log(`Publishing package: ${pkg.name}`);
console.log(`Current version: ${pkg.version}`);
console.log(`Target version: ${VALID_BUMP_TYPES.has(VERSION_ARG) ? VERSION_ARG : normalizedVersion}`);

run("npm", [
  "version",
  VALID_BUMP_TYPES.has(VERSION_ARG) ? VERSION_ARG : normalizedVersion,
  "--no-git-tag-version"
]);
run("npm", ["run", "build"]);
run("npm", ["run", "test"]);
run("npm", ["publish", "--access", "public"]);

console.log("Publish completed.");
