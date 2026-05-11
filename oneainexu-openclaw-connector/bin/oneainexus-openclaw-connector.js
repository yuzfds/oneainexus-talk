#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const PACKAGE_NAME = "@yuzhf/oneainexus-openclaw-connector";
const MIN_NODE_MAJOR = 22;

function printUsage() {
  console.log(
    [
      "Usage:",
      "  oneainexus-openclaw-connector check",
      "  oneainexus-openclaw-connector install-hint",
      "",
      "Commands:",
      "  check         Verify Node.js/OpenClaw CLI availability",
      "  install-hint  Print recommended install commands",
    ].join("\n"),
  );
}

function parseNodeMajor() {
  const major = Number(process.versions.node.split(".")[0]);
  return Number.isFinite(major) ? major : 0;
}

function runOpenClawVersionCheck() {
  try {
    execFileSync("openclaw", ["-v"], { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function runCheck() {
  const nodeMajor = parseNodeMajor();
  if (nodeMajor < MIN_NODE_MAJOR) {
    console.error(`Node.js version must be >= ${MIN_NODE_MAJOR}, current: ${process.versions.node}`);
    process.exit(1);
  }

  const hasOpenClaw = runOpenClawVersionCheck();
  if (!hasOpenClaw) {
    console.error("OpenClaw CLI not found. Install it first: npm install -g openclaw");
    process.exit(1);
  }

  console.log("Environment check passed.");
}

function printInstallHint() {
  console.log("Recommended install commands:");
  console.log(`  npm install ${PACKAGE_NAME}`);
  console.log("  # or local debug");
  console.log("  npm install <local-path-to-oneainexu-openclaw-connector>");
}

const command = process.argv[2];

if (!command || command === "-h" || command === "--help") {
  printUsage();
  process.exit(0);
}

if (command === "check") {
  runCheck();
  process.exit(0);
}

if (command === "install-hint") {
  printInstallHint();
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
printUsage();
process.exit(1);
