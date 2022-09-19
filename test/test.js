var should = require("chai").should;
const spawn = require('cross-spawn'); // Using cross-spawn instead of node:child_process because of cross-platform
                                      // issues such as https://stackoverflow.com/q/37125619
const fetch = require("node-fetch");
const path = require("node:path");

describe("Unlimited license with hearbeat", function () {
  before(function () {
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

    return fetch(
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
        console.log(`create license response data [${JSON.stringify(data)}]`);
        console.error(`create license response errors [${JSON.stringify(errors)}]`);

        this.LICENSE_ID = data.id;
      });
    });
  });

  it("Running with no license should fail", function () {
    this.timeout(0);

    const actArgs = [
      "pull_request",
      `--secret GITHUB_TOKEN="${process.env.GITHUB_TOKEN}"`,
      
      `--workflows "${path.join(
        "test",
        ".github",
        "workflows",
        "local-action.yml"
      )}"`,
      `--eventpath "${path.join(
        "test",
        "events",
        "example-pull-request-event-no-secrets.json"
      )}"`,
      `--env GITHUB_STEP_SUMMARY=/dev/stdout`,
    ];

    const actCommand = 'act ' + actArgs.join(' ');

    console.log(`Running command [${actCommand}]`);
    actResult = spawn.sync(actCommand);

    if (actResult.error) {
      console.error(`act error: ${actResult.error}`);
    }

    console.log(`stdout: ${actResult.stdout}`);
    console.log(`stderr: ${actResult.stderr}`);

    console.log(
      `act terminated with exit code [${actResult.status}] due to signal [${actResult.signal}].`
    );

    actResult.status.should.equal(1);
    // actResult.stdout.should.contain('');
  });

  it("Running with wrong license should fail", function () {
    this.timeout(0);
    
    const actArgs = [
      "pull_request",
      `--secret GITHUB_TOKEN="${process.env.GITHUB_TOKEN}"`,
      `--secret GITLEAKS_LICENSE="fake-license"`,
      `--workflows "${path.join(
        "test",
        ".github",
        "workflows",
        "local-action.yml"
      )}"`,
      `--eventpath "${path.join(
        "test",
        "events",
        "example-pull-request-event-no-secrets.json"
      )}"`,
      `--env GITHUB_STEP_SUMMARY=/dev/stdout`,
    ];

    const actCommand = 'act ' + actArgs.join(' ');

    console.log(`Running command [${actCommand}]`);
    actResult = spawn.sync(actCommand);

    if (actResult.error) {
      console.error(`act error: ${actResult.error}`);
    }

    console.log(`stdout: ${actResult.stdout}`);
    console.log(`stderr: ${actResult.stderr}`);

    console.log(
      `act terminated with exit code [${actResult.status}] due to signal [${actResult.signal}].`
    );

    actResult.status.should.equal(1);
  });

  it("Running with license should succeed", function () {
    this.timeout(0);
    
    const actArgs = [
      "pull_request",
      `--secret GITHUB_TOKEN="${process.env.GITHUB_TOKEN}"`,
      `--secret GITLEAKS_LICENSE="${this.LICENSE_ID}"`,
      `--workflows "${path.join(
        "test",
        ".github",
        "workflows",
        "local-action.yml"
      )}"`,
      `--eventpath "${path.join(
        "test",
        "events",
        "example-pull-request-event-no-secrets.json"
      )}"`,
      `--env GITHUB_STEP_SUMMARY=/dev/stdout`,
    ];

    const actCommand = 'act ' + actArgs.join(' ');

    console.log(`Running command [${actCommand}]`);
    actResult = spawn.sync(actCommand);

    if (actResult.error) {
      console.error(`act error: ${actResult.error}`);
    }

    console.log(`stdout: ${actResult.stdout}`);
    console.log(`stderr: ${actResult.stderr}`);

    console.log(
      `act terminated with exit code [${actResult.status}] due to signal [${actResult.signal}].`
    );

    actResult.status.should.equal(0);
  });

  it("Running with same license and repo again should succeed", function () {
    this.timeout(0);
    
    const actArgs = [
      "pull_request",
      `--secret GITHUB_TOKEN="${process.env.GITHUB_TOKEN}"`,
      `--secret GITLEAKS_LICENSE="${this.LICENSE_ID}"`,
      `--workflows "${path.join(
        "test",
        ".github",
        "workflows",
        "local-action.yml"
      )}"`,
      `--eventpath "${path.join(
        "test",
        "events",
        "example-pull-request-event-no-secrets.json"
      )}"`,
      `--env GITHUB_STEP_SUMMARY=/dev/stdout`,
    ];

    const actCommand = 'act ' + actArgs.join(' ');

    console.log(`Running command [${actCommand}]`);
    actResult = spawn.sync(actCommand);

    if (actResult.error) {
      console.error(`act error: ${actResult.error}`);
    }

    console.log(`stdout: ${actResult.stdout}`);
    console.log(`stderr: ${actResult.stderr}`);

    console.log(
      `act terminated with exit code [${actResult.status}] due to signal [${actResult.signal}].`
    );

    actResult.status.should.equal(0);
  });

  it("Running with expired heartbeat should reactivate machine and succeed", function () {});

  after(function () {
    // Delete machine

    // Delete license
    console.log(`Running DELETE [${this.LICENSE_ID}]`);

    return fetch(
      `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT}/licenses/${this.LICENSE_ID}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${process.env.KEYGEN_TOKEN}`,
        },
      }
    ).then((response) => {
      response.json().then(({ data, errors }) => {
        console.log(`got response status [${response.status}]`);
        console.log(`delete license response data [${JSON.stringify(data)}]`);
        console.error(`delete license response errors [${JSON.stringify(errors)}]`);
      });
    });
  });
});
