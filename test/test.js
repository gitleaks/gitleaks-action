const chai = require("chai");
const { exec } = require("node:child_process");
const fetch = require("node-fetch");
const path = require("node:path");

describe("Unlimited license with hearbeat", () => {
  let LICENSE_ID;

  before(() => {
    if (!process.env.KEYGEN_ACCOUNT) {
      throw new Error(`KEYGEN_ACCOUNT environment variable must be set.`);
    }

    if (!process.env.KEYGEN_TOKEN) {
      throw new Error(`KEYGEN_TOKEN environment variable must be set.`);
    }

    if (!process.env.GITHUB_TOKEN) {
      throw new Error(`GITHUB_TOKEN environment variable must be set.`);
    }

    console.log(
      `This license was created by [${__filename
        .split(path.sep)
        .slice(-3)
        .join("/")}] during automated testing.`
    ); // TODO(AW) Remove
    console.log(`keygen account length [${process.env.KEYGEN_ACCOUNT.length}]`); // TODO(AW) Remove
    console.log(`keygen token length [${process.env.KEYGEN_TOKEN.length}]`); // TODO(AW) Remove
    console.log(`github token length [${process.env.GITHUB_TOKEN.length}]`); // TODO(AW) Remove

    // Create license
    const policyUnlimitedWithHeartbeart =
      "5713ea99-6167-430b-8b64-e8e74b1a01d5";

    fetch(
      `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT}/licenses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${process.env.KEYGEN_TOKEN}`,
        },

        body: JSON.stringify({
          data: {
            type: "licenses",
            attributes: {
              name: "gitleaks-action-test-unlimited-with-heartbeat",
              metadata: {
                description: `This license was created by [${__filename
                  .split(path.sep)
                  .slice(-3)
                  .join("/")}] during automated testing.`,
              },
            },
            relationships: {
              policy: {
                data: { type: "policies", id: policyUnlimitedWithHeartbeart },
              },
            },
          },
        }),
      }
    ).then((response) => {
      response.json().then(({ data, errors }) => {
        console.log(`data [${JSON.stringify(data)}]`);
        console.error(`errors [${JSON.stringify(errors)}]`);

        LICENSE_ID = data.id;
      });
    });

    // Store license as env variable
  });

  it("Running with no license should fail", () => {
    const actCommand = `act pull_request --secret GITHUB_TOKEN="${
      process.env.GITHUB_TOKEN
    }"
            --secret GITLEAKS_LICENSE="${process.env.GITLEAKS_LICENSE}"
            --workflows="${path.join(
              ".github",
              "workflows",
              "local-action.yml"
            )}"
            --eventpath="${path.join(
              "events",
              "example-pull-request-event-no-secrets.json"
            )}"
            --env=GITHUB_STEP_SUMMARY=/dev/stdout`;

    const act = exec(actCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }

      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });

    act.on("close", (code, signal) => {
      console.log(
        `act terminated with exit code [${code}] due to signal [${signal}].`
      );
    });
  });

  it("Running with wrong license should fail", () => {});

  it("Running with license should succeed", () => {});

  it("Running with license again should succeed", () => {});

  it("Running with expired heartbeat should reactivate machine and succeed", () => {});

  after(() => {
    // Delete machine

    // Delete license
    const response = fetch(
      `https://api.keygen.sh/v1/accounts/{ACCOUNT}/licenses/${LICENSE_ID}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${process.env.KEYGEN_TOKEN}`,
        },
      }
    ).then((response) => {
      response.json().then(({ data, errors }) => {
        console.log(`data [${JSON.stringify(data)}]`);
        console.error(`errors [${JSON.stringify(errors)}]`);
      });
    });
  });
});
