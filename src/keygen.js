// Copyright © 2022 Gitleaks LLC - All Rights Reserved.
// You may use this code under the terms of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT.
// You should have received a copy of the GITLEAKS-ACTION END-USER LICENSE AGREEMENT with this file.
// If not, please visit https://gitleaks.io/COMMERCIAL-LICENSE.txt.
const core = require("@actions/core");
const https = require("https");

const GITLEAKS_LICENSE = process.env.GITLEAKS_LICENSE;

// This is publishable, don't worry ;)
const KEYGEN_ACCOUNT =
  "64626262306364622d353538332d343662392d613563302d346337653865326634623032";
const KEYGEN_HOST = "api.keygen.sh";

// validateKey handles the validation and/or activation of a GITLEAKS_LICENSE
// key if one is available.
async function ValidateKey(eventJSON) {
  const REPO_FINGERPRINT = eventJSON.repository.full_name;
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
      core.info(`👍 license valid for repo [${REPO_FINGERPRINT}]`);
      return;
    case "TOO_MANY_MACHINES":
      core.error(
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

      core.info(
        `❗ Repo [${REPO_FINGERPRINT}] has not been associated with the license. Attempting to activate this repo for the license...`
      );

      let activationResponse = await doRequest(
        activationRequestOptions,
        activationRequestData
      );

      if (activationResponse.hasOwnProperty("errors")) {
        core.error(
          `🛑 Activation request returned [${activationResponse.errors.length}] errors:`
        );
        activationResponse.errors.forEach((error) => {
          const errorCode = error.code || "";
          const errorTitle = error.title || "";
          const errorDetail = error.detail || "";
          const errorSourcePointer = error.source.pointer || "";
          const errorSourceParameter = error.source.parameter || "";
          core.error(
            `🛑 Error activating repo: ${errorCode} | ${errorTitle} | ${errorDetail} | ${errorSourcePointer} | ${errorSourceParameter}`
          );
        });

        process.exit(1);
      }

      core.debug(`Response: ${JSON.stringify(activationResponse)}`); // TODO: Consider removing or moving this log.

      if (activationResponse.status == 201) {
        core.info(
          `Successfully added repo [${activationResponse.data.attributes.name}] to license.`
        );
        return 201;
      } else {
        core.info(
          `Activation response returned status [${activationResponse.status}].`
        );
      }
      break;
    default:
      core.error(
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
