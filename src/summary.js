// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const core = require("@actions/core");
const { readFileSync } = require("fs");

async function Write(exitCode, eventJSON) {
  const repo_url = eventJSON.repository.html_url;
  const EXIT_CODE_NO_LEAKS_DETECTED = 0;
  const EXIT_CODE_GITLEAKS_ERROR = 1;
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
      const secretURL = `${repo_url}/blob/${commitSha}/${result.locations[0].physicalLocation.artifactLocation.uri}#L${result.locations[0].physicalLocation.region.startLine}`;
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
      .addHeading("🛑 Gitleaks detected secrets;) 🛑")
      .addTable([resultsHeader, ...resultsRows])
      .write();
  } else if (exitCode == EXIT_CODE_NO_LEAKS_DETECTED) {
    await core.summary.addHeading("No leaks detected ✅").write();
  } else if (exitCode == EXIT_CODE_GITLEAKS_ERROR) {
    await core.summary.addHeading(`❌ Gitleaks exited with error. Exit code [${exitCode}]`).write();
  } else {
    await core.summary.addHeading(`❌ Gitleaks exited with unexpected exit code [${exitCode}]`).write();
  }
}

module.exports.Write = Write;
