// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const { readFileSync } = require("fs");
const core = require("@actions/core");
const summary = require("./summary.js");
const keygen = require("./keygen.js");
const gitleaks = require("./gitleaks.js");

// Event JSON example: https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-example-32
const eventJSON = JSON.parse(
  readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")
);

// Examples of event types: "workflow_dispatch", "push", "pull_request", etc
const eventType = process.env.GITHUB_EVENT_NAME;

// check if a gitleaks license is available, if not log error message
if (!process.env.GITLEAKS_LICENSE) {
  core.error(
    "🛑 missing gitleaks license. Go grab one at gitleaks.io and store it as a GitHub Secret named GITLEAKS_LICENSE. See README.md for details."
  );
  process.exit(1);
}

// start validates the license first and then starts the scan
// if license is valid
async function start() {
  const supportedEvents = ["push", "pull_request", "workflow_dispatch"];

  if (!supportedEvents.includes(eventType)) {
    core.error(`ERROR: The [${eventType}] event is not yet supported`);
    process.exit(1);
  }

  // validate key first
  await keygen.ValidateKey(eventJSON);

  // default exit code, this value will be overwritten if gitleaks
  // detects leaks or errors
  let exitCode = 0;

  // check gitleaks version
  let gitleaksVersion =
    process.env.GITLEAKS_VERSION || (await gitleaks.Latest());
  core.info("gitleaks version: " + gitleaksVersion);
  let gitleaksPath = await gitleaks.Install(gitleaksVersion);

  // default scanInfo
  let scanInfo = {
    headRef: eventJSON.after, // The SHA of the most recent commit on ref after the push.
    baseRef: eventJSON.before, // The SHA of the most recent commit on ref before the push.
    gitleaksPath: gitleaksPath,
  };

  // determine how to run gitleaks based on event type
  core.info("event type: " + eventType);
  if (eventType === "push") {
    exitCode = await gitleaks.Scan(scanInfo, eventType);
  } else if (eventType === "workflow_dispatch") {
    exitCode = await gitleaks.Scan(scanInfo, eventType);
  } else if (eventType === "pull_request") {
    exitCode = await gitleaks.ScanPullRequest(eventJSON, eventType);
  }

  // after gitleaks scan, update the job summary
  await summary.Write(exitCode, eventJSON);

  if (exitCode == 0) {
    core.info("✅ No leaks detected");
  } else if (exitCode == gitleaks.EXIT_CODE_LEAKS_DETECTED) {
    core.warning("🛑 Leaks detected, see job summary for details");
    process.exit(1);
  } else {
    core.error(`ERROR: Unexpected exit code [${exitCode}]`);
    process.exit(exitCode);
  }
}

// start the scan
start();
