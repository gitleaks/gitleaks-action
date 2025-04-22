// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.

const { Octokit } = require("@octokit/rest");
const { readFileSync } = require("fs");
const core = require("@actions/core");
const summary = require("./summary.js");
const keygen = require("./keygen.js");
const gitleaks = require("./gitleaks.js");

let gitleaksEnableSummary = true;
if (
  process.env.GITLEAKS_ENABLE_SUMMARY == "false" ||
  process.env.GITLEAKS_ENABLE_SUMMARY == 0
) {
  core.debug("Disabling GitHub Actions Summary.");
  gitleaksEnableSummary = false;
}

let gitleaksEnableUploadArtifact = true;
if (
  process.env.GITLEAKS_ENABLE_UPLOAD_ARTIFACT == "false" ||
  process.env.GITLEAKS_ENABLE_UPLOAD_ARTIFACT == 0
) {
  core.debug("Disabling uploading of results.sarif artifact.");
  gitleaksEnableUploadArtifact = false;
}

// Event JSON example: https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-example-32
let eventJSON = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));

// Examples of event types: "workflow_dispatch", "push", "pull_request", etc
const eventType = process.env.GITHUB_EVENT_NAME;
const supportedEvents = [
  "push",
  "pull_request",
  "workflow_dispatch",
  "schedule",
];

if (!supportedEvents.includes(eventType)) {
  core.error(`ERROR: The [${eventType}] event is not yet supported`);
  process.exit(1);
}

// Determine if the github user is an individual or an organization
const githubUsername = eventJSON.repository.owner.login;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  baseUrl: process.env.GITHUB_API_URL,
});

var shouldValidate = true;

// Docs: https://docs.github.com/en/rest/users/users#get-a-user
octokit
  .request("GET /users/{username}", {
    username: githubUsername,
  })
  .then((user) => {
    const githubUserType = user.data.type;

    switch (githubUserType) {
      case "Organization":
        core.info(
          `[${githubUsername}] is an organization. License key is required.`
        );
        break;
      case "User":
        core.info(
          `[${githubUsername}] is an individual user. No license key is required.`
        );
        shouldValidate = false;
        break;
      default:
        core.warning(
          `[${githubUsername}] is an unexpected type [${githubUserType}]. License key validation will be enforced 🤷.`
        );
        core.debug(`GitHub GET user API returned [${JSON.stringify(user)}]`);
    }
  })
  .catch((err) => {
    core.warning(
      `Get user [${githubUsername}] failed with error [${err}]. License key validation will be enforced 🤷.`
    );
  })
  .finally(() => {
    // check if a gitleaks license is available, if not log error message
    if (shouldValidate && !process.env.GITLEAKS_LICENSE) {
      core.error(
        "🛑 missing gitleaks license. Go grab one at gitleaks.io and store it as a GitHub Secret named GITLEAKS_LICENSE. For more info about the recent breaking update, see [here](https://github.com/gitleaks/gitleaks-action#-announcement)."
      );
      process.exit(1);
    }

    start();
  });

// start validates the license first and then starts the scan
// if license is valid
async function start() {
  // validate key first

  // keygen payment method is getting declined... disable this check for now. 
  // if (shouldValidate) {
  //   core.debug(
  //     `eventJSON.repository.full_name: ${eventJSON.repository.full_name}`
  //   );
  //   await keygen.ValidateKey(eventJSON);
  // }

  // default exit code, this value will be overwritten if gitleaks
  // detects leaks or errors
  let exitCode = 0;

  // check gitleaks version

  let gitleaksVersion = process.env.GITLEAKS_VERSION || "8.24.3";
  if (gitleaksVersion === "latest") {
    gitleaksVersion = await gitleaks.Latest(octokit);
  }
  core.info("gitleaks version: " + gitleaksVersion);
  let gitleaksPath = await gitleaks.Install(gitleaksVersion);

  // default scanInfo
  let scanInfo = {
    gitleaksPath: gitleaksPath,
  };

  // determine how to run gitleaks based on event type
  core.info("event type: " + eventType);
  if (eventType === "push") {
    // check if eventsJSON.commits is empty, if it is send a info message
    // saying we don't have to run gitleaks
    if (eventJSON.commits.length === 0) {
      core.info("No commits to scan");
      process.exit(0);
    }

    scanInfo = {
      baseRef: eventJSON.commits[0].id,
      headRef: eventJSON.commits[eventJSON.commits.length - 1].id,
    };

    // Override scanInfo.baseRef if `BASE_REF` is set.
    if (process.env.BASE_REF) {
      scanInfo.baseRef = process.env.BASE_REF;
      core.info(`Overriding baseRef for scan with ${process.env.BASE_REF}.`)
    }

    exitCode = await gitleaks.Scan(
      gitleaksEnableUploadArtifact,
      scanInfo,
      eventType
    );
  } else if (eventType === "workflow_dispatch" || eventType === "schedule") {
    exitCode = await gitleaks.Scan(
      gitleaksEnableUploadArtifact,
      scanInfo,
      eventType
    );
  } else if (eventType === "pull_request") {
    exitCode = await gitleaks.ScanPullRequest(
      gitleaksEnableUploadArtifact,
      octokit,
      eventJSON,
      eventType
    );
  }

  // after gitleaks scan, update the job summary
  if (gitleaksEnableSummary == true) {
    await summary.Write(exitCode, eventJSON);
  }

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
