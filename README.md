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

## Usage Example

```yml
name: gitleaks
on: [pull_request, push, workflow_dispatch]
jobs:
  scan:
    name: gitleaks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: zricethezav/gitleaks-action@v2.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE}}
```

### Environment Variables:

- `GITHUB_TOKEN`: This variable is automatically assigned by GitHub when any action gets kicked off. You can read more about the token [here](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret).  
  **gitleaks-action** uses this token to call [a GitHub API](https://octokit.github.io/rest.js/v18#pulls-create-review-comment) to comment on PRs.
- `GITLEAKS_LICENSE` (required): A **gitleaks-action** license obtained at [gitleaks.io](https://gitleaks.io/products.html). **It should be added as an encrypted secret [to the repo](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) or [to the organization](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization).**
- `GITLEAKS_NOTIFY_USER_LIST` (optional): A list of GitHub accounts that should be alerted when **gitleaks-action** detects a leak. An email will be sent by GitHub to the user if their GitHub notification settings permit it. The format should be comma-separated with each username prefixed with `@`. Ex: `@octocat,@zricethezav,@gitleaks`. Spaces are okay too.
- `GITLEAKS_ENABLE_COMMENTS`: (optional): Boolean value that turns on or off PR commenting. Default value is `true`.
  Set to `false` to disable comments.
- `GITLEAKS_CONFIG`: (optional): Path to a [gitleaks configuration file](https://github.com/zricethezav/gitleaks#configuration).

## Questions

### How do I get a license key?

You can visit [gitleaks.io](https://gitleaks.io/products.html) to sign up for a
free license key limited to 1 repo, or choose from a paid tier to enable scanning of additional repos.

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

### How can I get a gitleaks badge on my readme?

Enable this **gitleaks-action** and copy
`<img alt="gitleaks badge" src="https://img.shields.io/badge/protected%20by-gitleaks-blue">` to your readme.

_Copyright © 2022 Gitleaks LLC - All Rights Reserved_
