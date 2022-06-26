/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 742:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.

const exec = __nccwpck_require__(478);
const cache = __nccwpck_require__(350);
const core = __nccwpck_require__(684);
const tc = __nccwpck_require__(489);
const { readFileSync } = __nccwpck_require__(147);
const os = __nccwpck_require__(37);
const path = __nccwpck_require__(17);
const artifact = __nccwpck_require__(753);

const EXIT_CODE_LEAKS_DETECTED = 2;

// TODO: Make a gitleaks class with an octokit attribute so we don't have to pass in the octokit to every method.

// Install will download the version of gitleaks specified in GITLEAKS_VERSION
// or use the latest version of gitleaks if GITLEAKS_VERSION is not specified.
// This function will also cache the downloaded gitleaks binary in the tool cache.
async function Install(version) {
  const pathToInstall = path.join(os.tmpdir(), `gitleaks-${version}`);
  core.info(
    `Version to install: ${version} (target directory: ${pathToInstall})`
  );
  const cacheKey = `gitleaks-cache-${version}-${process.platform}-${process.arch}`;
  let restoredFromCache = undefined;
  try {
    restoredFromCache = await cache.restoreCache([pathToInstall], cacheKey);
  } catch (error) {
    core.warning(error);
  }

  if (restoredFromCache !== undefined) {
    core.info(`Gitleaks restored from cache`);
  } else {
    const gitleaksReleaseURL = downloadURL(
      process.platform,
      process.arch,
      version
    );
    core.info(`Downloading gitleaks from ${gitleaksReleaseURL}`);
    let downloadPath = "";
    try {
      downloadPath = await tc.downloadTool(
        gitleaksReleaseURL,
        path.join(os.tmpdir(), `gitleaks.tmp`)
      );
    } catch (error) {
      core.error(
        `could not install gitleaks from ${gitleaksReleaseURL}, error: ${error}`
      );
    }

    if (gitleaksReleaseURL.endsWith(".zip")) {
      await tc.extractZip(downloadPath, pathToInstall);
    } else if (gitleaksReleaseURL.endsWith(".tar.gz")) {
      await tc.extractTar(downloadPath, pathToInstall);
    } else {
      core.error(`Unsupported archive format: ${gitleaksReleaseURL}`);
    }

    try {
      await cache.saveCache([pathToInstall], cacheKey);
    } catch (error) {
      core.warning(error);
    }
  }

  core.addPath(pathToInstall);
}

function downloadURL(platform, arch, version) {
  const baseURL = "https://github.com/zricethezav/gitleaks/releases/download";
  if (platform == "win32") {
    platform = "windows";
  }
  return `${baseURL}/v${version}/gitleaks_${version}_${platform}_${arch}.tar.gz`;
}

async function Latest(octokit) {
  // docs: https://octokit.github.io/rest.js/v18#repos-get-latest-release
  const latest = await octokit.rest.repos.getLatestRelease({
    owner: "zricethezav",
    repo: "gitleaks",
  });

  return latest.data.tag_name.replace(/^v/, "");
}

async function Scan(gitleaksEnableUploadArtifact, scanInfo, eventType) {
  let args = [
    "detect",
    "--redact",
    "-v",
    "--exit-code=2",
    "--report-format=sarif",
    "--report-path=results.sarif",
    "--log-level=debug",
  ];
  if (eventType == "pull_request" || eventType == "push") {
    args.push(`--log-opts=${scanInfo.baseRef}^..${scanInfo.headRef}`);
  }
  core.info(`gitleaks cmd: gitleaks ${args.join(" ")}`);
  let exitCode = await exec.exec("gitleaks", args, {
    ignoreReturnCode: true,
    delay: 60 * 1000,
  });
  core.setOutput("exit-code", exitCode);

  if (exitCode == EXIT_CODE_LEAKS_DETECTED) {
    const artifactClient = artifact.create();
    const artifactName = "gitleaks-results.sarif";
    const options = {
      continueOnError: true,
    };

    if (gitleaksEnableUploadArtifact == true) {
      await artifactClient.uploadArtifact(
        artifactName,
        ["results.sarif"],
        process.env.HOME,
        options
      );
    }
  }
  return exitCode;
}

async function ScanPullRequest(
  gitleaksEnableUploadArtifact,
  octokit,
  eventJSON,
  eventType
) {
  const fullName = eventJSON.repository.full_name;
  const [owner, repo] = fullName.split("/");

  if (!process.env.GITHUB_TOKEN) {
    core.error(
      "🛑 GITHUB_TOKEN is now required to scan pull requests. You can use the automatically created token as shown in the [README](https://github.com/gitleaks/gitleaks-action#usage-example). For more info about the recent breaking update, see [here](https://github.com/gitleaks/gitleaks-action#-announcement)."
    );
    process.exit(1);
  }

  let commits = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
    {
      owner: owner,
      repo: repo,
      pull_number: eventJSON.number,
    }
  );

  let scanInfo = {
    baseRef: commits.data[0].sha,
    headRef: commits.data[commits.data.length - 1].sha,
  };

  const exitCode = await Scan(
    gitleaksEnableUploadArtifact,
    scanInfo,
    eventType
  );

  // skip comments if `GITLEAKS_ENABLE_COMMENTS` is set to false
  if (process.env.GITLEAKS_ENABLE_COMMENTS == "false") {
    core.info("skipping comments");
    return exitCode;
  }

  if (exitCode == EXIT_CODE_LEAKS_DETECTED) {
    // read results.sarif file
    const sarif = JSON.parse(readFileSync("results.sarif", "utf8"));
    // iterate through results
    for (let i = 0; i < sarif.runs[0].results.length; i++) {
      let results = sarif.runs[0].results[i];
      const commit_sha = results.partialFingerprints.commitSha;

      let proposedComment = {
        owner: owner,
        repo: repo,
        pull_number: eventJSON.number,
        body: `🛑 **gitleaks** has detected a secret with rule-id \`${results.ruleId}\` in commit ${commit_sha}
If this secret is a true positive, please rotate the secret ASAP and rebase the commit containing the secret.`,
        commit_id: commit_sha,
        path: results.locations[0].physicalLocation.artifactLocation.uri,
        side: "RIGHT",
        line: results.locations[0].physicalLocation.region.startLine,
      };

      // check if there are any GITLEAKS_NOTIFY_USER_LIST env variable
      if (process.env.GITLEAKS_NOTIFY_USER_LIST) {
        proposedComment.body += `\n\ncc ${process.env.GITLEAKS_NOTIFY_USER_LIST}`;
      }

      // check if there are any review comments on the pull request currently
      let comments = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
        {
          owner: owner,
          repo: repo,
          pull_number: eventJSON.number,
        }
      );

      let skip = false;
      // iterate through comments, checking if the proposed comment is already present
      // TODO: If performance becomes too slow, pull this for loop out of the
      // outer for loop and create a dictionary of all the existing comments
      comments.data.forEach((comment) => {
        if (
          comment.body == proposedComment.body &&
          comment.path == proposedComment.path &&
          comment.original_line == proposedComment.line
        ) {
          // comment already present, skip
          skip = true;
          return;
        }
      });

      if (skip == true) {
        continue;
      }

      try {
        await octokit.rest.pulls.createReviewComment(proposedComment);
      } catch (error) {
        core.warning(`Error encountered when attempting to write a comment on PR #${eventJSON.number}. 
Likely an issue with too large of a diff for the comment to be written. 
All secrets that have been leaked will be reported in the summary and job artifact.`);
      }
    }
  }

  // exit code 2 means leaks detected
  // exit code 1 means error has occurred in gitleaks
  // exit code 0 means no leaks detected
  return exitCode;
}

module.exports.Scan = Scan;
module.exports.Latest = Latest;
module.exports.Install = Install;
module.exports.ScanPullRequest = ScanPullRequest;
module.exports.EXIT_CODE_LEAKS_DETECTED = EXIT_CODE_LEAKS_DETECTED;


/***/ }),

/***/ 818:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const https = __nccwpck_require__(687);

const GITLEAKS_LICENSE = process.env.GITLEAKS_LICENSE;

// This is publishable, don't worry ;)
const KEYGEN_ACCOUNT =
  "64626262306364622d353538332d343662392d613563302d346337653865326634623032";
const KEYGEN_HOST = "api.keygen.sh";

// validateKey handles the validation and/or activation of a GITLEAKS_LICENSE
// key if one is available.
async function ValidateKey(eventJSON) {
  const REPO_FINGERPRINT =
    eventJSON.repository.owner.node_id + "|" + eventJSON.repository.node_id;
  var validateKeyRequestOptions = {
    method: "POST",
    hostname: KEYGEN_HOST,
    path: `/v1/accounts/${Buffer.from(
      KEYGEN_ACCOUNT,
      "hex"
    )}/licenses/actions/validate-key`,
    headers: {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
  };

  // TODO add machines(repo) info to validate
  var validateKeyRequestData = JSON.stringify({
    meta: {
      key: `${GITLEAKS_LICENSE}`,
      scope: {
        fingerprint: `${REPO_FINGERPRINT}`,
      },
    },
  });
  let validateKeyResponse = await doRequest(
    validateKeyRequestOptions,
    validateKeyRequestData
  );
  switch (validateKeyResponse.meta.constant) {
    case "VALID":
      console.log("👍 license valid");
      return;
    case "TOO_MANY_MACHINES":
      console.error(
        `🛑 Cannot use gitleaks-action on this repo. Your license key has already reached its limit of [${validateKeyResponse.data.attributes.maxMachines}] repos. Go to gitleaks.io to upgrade your license to enable additional repos.`
      );
      process.exit(1);
    case "FINGERPRINT_SCOPE_MISMATCH":
    case "NO_MACHINES": // Intentional fall-through
    case "NO_MACHINE":
      // If no machines are associated with the license, but the license exists and is not expired
      // then we can try to activate a "machine", or repo, for the license.
      var activationRequestOptions = {
        method: "POST",
        hostname: KEYGEN_HOST,
        path: `/v1/accounts/${Buffer.from(KEYGEN_ACCOUNT, "hex")}/machines`,
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          Authorization: `License ${GITLEAKS_LICENSE}`,
        },
      };

      var activationRequestData = JSON.stringify({
        data: {
          type: "machines",
          attributes: {
            fingerprint: `${REPO_FINGERPRINT}`,
            platform: "github-actions",
            name: `${eventJSON.repository.full_name}`,
          },
          relationships: {
            license: {
              data: {
                type: "licenses",
                id: validateKeyResponse.data.id,
              },
            },
          },
        },
      });

      console.log(
        "❗ this repo has not been associated with the license, attempting to activate a repo for the license"
      );

      let activationResponse = await doRequest(
        activationRequestOptions,
        activationRequestData
      );

      if (activationResponse.hasOwnProperty("errors")) {
        console.error(
          `🛑 Activation request returned [${activationResponse.errors.length}] errors:`
        );
        activationResponse.errors.forEach((error) => {
          const errorCode = error.code || "";
          const errorTitle = error.title || "";
          const errorDetail = error.detail || "";
          const errorSourcePointer = error.source.pointer || "";
          const errorSourceParameter = error.source.parameter || "";
          console.error(
            `🛑 Error activating repo: ${errorCode} | ${errorTitle} | ${errorDetail} | ${errorSourcePointer} | ${errorSourceParameter}`
          );
        });

        process.exit(1);
      }

      console.debug(`Response: ${JSON.stringify(activationResponse)}`); // TODO: Consider removing or moving this log.

      if (activationResponse.status == 201) {
        console.log(
          `Successfully added repo [${activationResponse.data.attributes.name}] to license.`
        );
        return 201;
      } else {
        console.log(
          `Activation response returned status [${activationResponse.status}].`
        );
      }
      break;
    default:
      console.error(
        `🛑 Error: Validating key returned [${JSON.stringify(
          validateKeyResponse
        )}]`
      );
      process.exit(1);
  }
}

function doRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(responseBody));
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

module.exports.ValidateKey = ValidateKey;


/***/ }),

/***/ 667:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const core = __nccwpck_require__(684);
const { readFileSync } = __nccwpck_require__(147);

async function Write(exitCode, eventJSON) {
  const repo_url = eventJSON.repository.html_url;
  const EXIT_CODE_LEAKS_DETECTED = 2;

  if (exitCode == EXIT_CODE_LEAKS_DETECTED) {
    let resultsRows = [[]];
    let resultsHeader = [
      { data: "Rule ID", header: true },
      { data: "Commit", header: true },
      { data: "Secret URL", header: true },
      { data: "Start Line", header: true },
      { data: "Author", header: true },
      { data: "Date", header: true },
      { data: "Email", header: true },
      { data: "File", header: true },
    ];
    const sarif = JSON.parse(readFileSync("results.sarif", "utf8"));
    sarif.runs[0].results.forEach((result) => {
      const commitSha = result.partialFingerprints.commitSha;
      const commitURL = `${repo_url}/commit/${commitSha}`;
      const secretURL = `${repo_url}/blob/${commitSha}/${result.locations[0].physicalLocation.artifactLocation.uri}/#L${result.locations[0].physicalLocation.region.startLine}`;
      const fileURL = `${repo_url}/blob/${commitSha}/${result.locations[0].physicalLocation.artifactLocation.uri}`;
      resultsRows.push([
        result.ruleId,
        `<a href="${commitURL}">${commitSha.substring(0, 7)}</a>`,
        `<a href="${secretURL}">View Secret</a>`,
        result.locations[0].physicalLocation.region.startLine.toString(),
        result.partialFingerprints.author,
        result.partialFingerprints.date,
        result.partialFingerprints.email,
        `<a href="${fileURL}">${result.locations[0].physicalLocation.artifactLocation.uri}</a>`,
      ]);
    });
    await core.summary
      .addHeading("🛑 Gitleaks detected secrets 🛑")
      .addTable([resultsHeader, ...resultsRows])
      .write();
  } else {
    await core.summary.addHeading("No leaks detected ✅").write();
  }
}

module.exports.Write = Write;


/***/ }),

/***/ 753:
/***/ ((module) => {

module.exports = eval("require")("@actions/artifact");


/***/ }),

/***/ 350:
/***/ ((module) => {

module.exports = eval("require")("@actions/cache");


/***/ }),

/***/ 684:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 478:
/***/ ((module) => {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 489:
/***/ ((module) => {

module.exports = eval("require")("@actions/tool-cache");


/***/ }),

/***/ 101:
/***/ ((module) => {

module.exports = eval("require")("@octokit/rest");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 687:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 37:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.

const { Octokit } = __nccwpck_require__(101);
const { readFileSync } = __nccwpck_require__(147);
const core = __nccwpck_require__(684);
const summary = __nccwpck_require__(667);
const keygen = __nccwpck_require__(818);
const gitleaks = __nccwpck_require__(742);

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
const eventJSON = JSON.parse(
  readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")
);

// Examples of event types: "workflow_dispatch", "push", "pull_request", etc
const eventType = process.env.GITHUB_EVENT_NAME;

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

    // start the scan
    start();
  });

// start validates the license first and then starts the scan
// if license is valid
async function start() {
  const supportedEvents = ["push", "pull_request", "workflow_dispatch"];

  if (!supportedEvents.includes(eventType)) {
    core.error(`ERROR: The [${eventType}] event is not yet supported`);
    process.exit(1);
  }

  // validate key first
  if (shouldValidate) {
    await keygen.ValidateKey(eventJSON);
  }

  // default exit code, this value will be overwritten if gitleaks
  // detects leaks or errors
  let exitCode = 0;

  // check gitleaks version
  let gitleaksVersion =
    process.env.GITLEAKS_VERSION || (await gitleaks.Latest(octokit));
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
    exitCode = await gitleaks.Scan(
      gitleaksEnableUploadArtifact,
      scanInfo,
      eventType
    );
  } else if (eventType === "workflow_dispatch") {
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

})();

module.exports = __webpack_exports__;
/******/ })()
;