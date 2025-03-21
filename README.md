# Gitleaks Action

```

  ┌─○───┐
  │ │╲  │
  │ │ ○ │
  │ ○ ┌─┴───────────────────┐
  └─░─┤  4 github actions   │
      └─────────────────────┘

```

<p align="left">
    <a href="https://github.com/zricethezav/gitleaks-action">
        <img alt="gitleaks badge" src="https://img.shields.io/badge/protected%20by-gitleaks-blue">
    </a>
</p>

Gitleaks is a SAST tool for detecting and preventing hardcoded secrets like passwords, API keys, and tokens in git repos. Gitleaks is an easy-to-use, all-in-one solution for detecting secrets, past or present, in your code. Enable **Gitleaks-Action** in your GitHub workflows to be alerted when secrets are leaked as soon as they happen. Check out our demos [here (.gif)](https://user-images.githubusercontent.com/15034943/178513034-de5a1906-b71d-454a-a792-47b7ac0e21e6.gif) and [here (.png)](https://user-images.githubusercontent.com/15034943/193462170-7314a63b-1c37-4c9e-ac93-33d6d3fc561a.png), or see what's new in v2 [here](v2.md). Don't forget to check out our [blog](https://blog.gitleaks.io), which details how to configure and set up Gitleaks-Action for organizations and enterprises.

## Usage Example

```yml
name: gitleaks
on:
  pull_request:
  push:
  workflow_dispatch:
  schedule:
    - cron: "0 4 * * *" # run once a day at 4 AM
jobs:
  scan:
    name: gitleaks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }} # Only required for Organizations, not personal accounts.
```


---
### Environment Variables:

- `GITHUB_TOKEN`: This variable is automatically assigned by GitHub when any action gets kicked off. You can read more about the token [here](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret).
  **gitleaks-action** uses this token to call [a GitHub API](https://octokit.github.io/rest.js/v18#pulls-create-review-comment) to comment on PRs.
- `GITLEAKS_LICENSE` (required for organizations, not required for user accounts): A **gitleaks-action** license can be obtained at [gitleaks.io](https://gitleaks.io). **It should be added as an encrypted secret [to the repo](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) or [to the organization](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization).**
- `GITLEAKS_NOTIFY_USER_LIST` (optional): A list of GitHub accounts that should be alerted when **gitleaks-action** detects a leak. An email will be sent by GitHub to the user if their GitHub notification settings permit it. The format should be comma-separated with each username prefixed with `@`. Ex: `@octocat,@zricethezav,@gitleaks`. Spaces are okay too.
- `GITLEAKS_ENABLE_COMMENTS` (optional): Boolean value that turns on or off PR commenting. Default value is `true`.
  Set to `false` to disable comments.
- `GITLEAKS_CONFIG` (optional): Path to a [gitleaks configuration file](https://github.com/zricethezav/gitleaks#configuration).
- `GITLEAKS_ENABLE_UPLOAD_ARTIFACT` (optional): Boolean value that turns on or off uploading a sarif artifact when gitleaks detects secrets. Defaults to `true`.
- `GITLEAKS_ENABLE_SUMMARY` (optional): Boolean value to enable or disable gitleaks job summary. Defaults to `true`.
- `GITLEAKS_VERSION` (optional): A particular Gitleaks version to use (e.g. `8.15.3`, no `v` prefix) or use `latest` to always use the newest available version. Defaults to a hard-coded version number.
---

## Questions

### Do I need a _free_ license key?
If you are scanning repos that belong to [an organization account](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/about-organizations), you will need to obtain a [free license key](https://gitleaks.io)

If you are scanning repos that belong to [a personal account](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts#personal-accounts), then no license key is required.

### How do I get a _free_ license key?

You can visit [gitleaks.io](https://gitleaks.io) to sign up for a
free license key. Clicking "Sign Up" will take you to a google form where you will need to supply name, email, and company. An email with a license key will show up shortly after submission.

### Can I use a custom gitleaks configuration?

You can! This GitHub Action follows a similar order of precedence
as the gitleaks CLI tool. You can use `GITLEAKS_CONFIG` to explicitly set a
config path _or_ create a `gitleaks.toml` at the root of the repo which will be
automatically detected and used by **gitleaks-action**.

### Does this GitHub Action send any data to 3rd parties?

The only data that **gitleaks-action** sends to any third party is data related to license key validation (namely `GITLEAKS_LICENSE`, [repo name](https://github.com/zricethezav/gitleaks-action/blob/v2/src/keygen.js#L76), and [repo owner](https://github.com/zricethezav/gitleaks-action/blob/v2/src/keygen.js#L18)), which is sent to the license key validation service, [keygen](https://keygen.sh). Your code never leaves GitHub because the scanning takes place within the GitHub Actions docker container.

### Can I use **gitleaks-action** as a third-party tool for [GitHub code scanning](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/setting-up-code-scanning-for-a-repository)?

You _can_ but it is not recommended because it gives a false sense of security. If a secret is leaked in one commit, then removed in a subsequent commit,
the security alert in the GitHub Security dashboard will show as resolved, even though the secret is still visible in the commit history. To truly address the leak,
you should rotate the secret (and also consider re-writing the git history to remove the leak altogether).

### Why is my gitleaks-action job suddenly failing?
_6/21/2022_

On June 21, 2022, we merged [Gitleaks Action v2](https://github.com/gitleaks/gitleaks-action/releases/tag/v2.0.0) into the `master` branch. This was a breaking update, and we made an effort to contact as many of our users as possible via GitHub, social media, etc. If you didn't know this breaking update was coming, we sincerely apologize for the inconvenience. The good news is, remedying the job failure is straightforward! You can either:
1. [Upgrade to v2](v2.md#how-to-upgrade-to-v2), or
1. [Pin to an older version](v2.md#how-to-pin-to-v160)

Please note that if you are scanning repos that belong to an organization, you'll have to [acquire a GITLEAKS_LICENSE](https://github.com/gitleaks/gitleaks-action#environment-variables) to use v2 (free "Trial" license available). That might come as a surprise to my users that are accustomed to using Gitleaks-Action free of charge, so I wrote a blog post explaining how/why I decided to monetize this project: https://blog.gitleaks.io/gitleaks-llc-announcement-d7d06a52e801

Finally, please see above for a summary of why I think you'll love the new v2 release: [v2 Benefits](v2.md#v2-benefits)

### How can I get a gitleaks badge on my readme?

Enable this **gitleaks-action** and copy
`<img alt="gitleaks badge" src="https://img.shields.io/badge/protected%20by-gitleaks-blue">` to your readme.

## License Change
Since v2.0.0 of Gitleaks-Action, the license has changed from MIT to a [commercial license](https://github.com/zricethezav/gitleaks-action/blob/v2/COMMERCIAL-LICENSE.txt). Prior versions to v2.0.0 of Gitleaks-Actions will remain under the MIT license.

## Contributing
Please see our [contributing guidelines](CONTRIBUTING.md).

_Copyright © 2022 Gitleaks LLC - All Rights Reserved_
