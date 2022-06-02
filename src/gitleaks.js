// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const { Octokit } = require("@octokit/rest");
const exec = require("@actions/exec");
const cache = require("@actions/cache");
const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const { readFileSync } = require("fs");
const os = require("os");
const path = require("path");
const artifact = require("@actions/artifact");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  baseUrl: process.env.GITHUB_API_URL,
});

const EXIT_CODE_LEAKS_DETECTED = 2;

// This is a dummy secret for a demonstration of some of the new capabilities for Gitleaks-Action v2.0.0
aws_secret="AKIAIMNOJVGFDXXXE4OA"
discord_client_secret="8dyfuiRyqFvVc3TRr_edRk-fK__JItpK"


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

async function Latest() {
  // docs: https://octokit.github.io/rest.js/v18#repos-get-latest-release
  const latest = await octokit.rest.repos.getLatestRelease({
    owner: "zricethezav",
    repo: "gitleaks",
  });

  return latest.data.tag_name.replace(/^v/, "");
}

async function Scan(scanInfo, eventType) {
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
    args.push(getLogOpts(scanInfo, eventType));
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
    await artifactClient.uploadArtifact(
      artifactName,
      ["results.sarif"],
      process.env.HOME,
      options
    );
  }
  return exitCode;
}

// getLogOpts attempts to run `git log` to ensure gitleaks will scan _something_ rather than fail on an invalid commit range.
// Invalid commit ranges should not happen often but if they do, we can just scan a single commit to maintain some gitleaks coverage for every event.
// After confirming that git log works, we can return the log options to be used in the gitleaks command.
function getLogOpts(scanInfo, eventType) {
  const NO_COMMIT_BEFORE = "0000000000000000000000000000000000000000";
  if (scanInfo.baseRef == NO_COMMIT_BEFORE) {
    scanInfo.baseRef = scanInfo.headRef;
  }
  if (scanInfo.baseRef == scanInfo.headRef) {
    return `--log-opts=${scanInfo.baseRef}^..${scanInfo.headRef}`;
  }
  if (eventType == "pull_request") {
    return `--log-opts=${scanInfo.baseRef}^..${scanInfo.headRef}`;
  }
  if (["push", "workflow_dispatch"].includes(eventType)) {
    return `--log-opts=${scanInfo.baseRef}..${scanInfo.headRef}`;
  }

  throw `Invalid scanInfo [${scanInfo}] or eventType [${eventType}]`;
}

async function ScanPullRequest(eventJSON, eventType) {
  const fullName = eventJSON.repository.full_name;
  const [owner, repo] = fullName.split("/");

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

  const exitCode = await Scan(scanInfo, eventType);

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
