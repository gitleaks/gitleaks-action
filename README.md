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

Gitleaks is a SAST tool for detecting and preventing hardcoded secrets like passwords, api keys, and tokens in git repos. Gitleaks is an easy-to-use, all-in-one solution for detecting secrets, past or present, in your code. Enable **Gitleaks-Action** in your GitHub workflows to be alerted when secrets are leaked as soon as they happen.

## 📢 Why is my gitleaks-action job suddenly failing?
_6/21/2022_

On June 21, 2022, we merged [Gitleaks Action v2](https://github.com/gitleaks/gitleaks-action/releases/tag/v2.0.0) into the `master` branch. This is a breaking update, and we made an effort to contact as many of our users as possible via GitHub, social media, etc. If you didn't know this breaking update was coming, we sincerely apologize for the inconvenience. The good news is, remedying the job failure is straightforward! You can either:
1. [Upgrade to v2](#how-to-upgrade-to-v2), or
1. [Pin to an older version](#how-to-pin-to-v160)

Please note that if you are scanning repos that belong to an organization, you'll have to [acquire a GITLEAKS_LICENSE](https://github.com/gitleaks/gitleaks-action#environment-variables) to use v2 (free tier available). That might come as a surprise to my users that are accustomed to using Gitleaks-Action free of charge, so I wrote a blog post explaining how/why I decided to monetize this project: https://blog.gitleaks.io/gitleaks-llc-announcement-d7d06a52e801

Finally, please see below for a summary of why I think you'll love the new v2 release: [v2 Benefits](#v2-benefits)

## 📢 Announcement
_6/13/2022_

On June 2, 2022, we released [Gitleaks Action v2](https://github.com/gitleaks/gitleaks-action/releases/tag/v2.0.0). There are a boatload of improvements
in v2, but it also represents a breaking change from the prior version (v1.6.0). We haven't merged v2 to the `master` branch yet because we noticed that
many users of Gitleaks Action don't pin their version. If you are using `zricethezav/gitleaks-action@master` (or now `gitleaks/gitleaks-action@master`),
then as soon as we merge v2 to master, your jobs will start failing.

We are planning to complete the merge on **June 20, 2022**. We recommend updating your .yml files to use v2 now so you aren't scrambling to do it after
your gitleaks-action jobs start failing. As an alternative, you can pin your version to v1.6.0 for now, if you aren't ready to upgrade at the moment.

#### How to upgrade to v2

For full details, see the rest of the v2 README [below](#usage-example). Here is the quick list of changes to your .yml:
* Change the "uses" line to `- uses: gitleaks/gitleaks-action@v2`
* Add an `env:` section with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
* If you are scanning repos that belong to an organization, you'll also have to [acquire a GITLEAKS_LICENSE](https://github.com/gitleaks/gitleaks-action#environment-variables),
  add the license to your GitHub Secrets, and add this line to the `env:` section: `GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE}}`

#### How to pin to v1.6.0
* Change your "uses" line to `gitleaks/gitleaks-action@v1.6.0`
* Set a reminder to upgrade to v2 later.

## v2 Benefits
If you are using Gitleaks-Action v2 to scan repos owned by an [Organization](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts#organization-accounts),
you will find that you need to [acquire a GITEAKS_LICENSE](https://gitleaks.io/products.html) in order for the action to run. A license to scan 1 repo is
free, but scanning more than 1 repo belonging to the same organization requires a paid license. This raises the obvious question:

**_Is v2 really worth paying for?_**

It's a fair question. We think that the new features and improvements in v2 deliver exceptional value for the price. We put together a list of some of the
top reasons we think v2 is worth paying for. Expand the section below to see details.

<table><tr><td>
<details>
<summary><em>Show/hide details</em></summary>

#### 1. On demand scans
You can now use `workflow_dispatch` events to trigger on demand gitleaks scans.

<img width="816" alt="Screen Shot 2022-05-30 at 8 30 31 PM" src="https://user-images.githubusercontent.com/15034943/171079785-4040ebc1-d353-4fa6-8c62-d19c806e372a.png">

#### 2. Gitleaks report artifact uploads
Not much more to say here. Download reports when leaks are present. Pretty useful feature.

<img width="1056" alt="Screen Shot 2022-05-30 at 9 20 36 PM" src="https://user-images.githubusercontent.com/15034943/171079991-387f2c1d-a8fd-4e5a-82aa-9f03b0c51b75.png">

#### 3. Powered by the latest version of Gitleaks
The latest version of gitleaks (v8.8.6 at the time of writing) has better performance, more configuration options, and is more accurate than the previous major version.

#### 4. Job summaries
Easy to understand report of a Gitleaks job. If no leaks are detected you'll see:

<img width="1054" alt="Screen Shot 2022-05-30 at 9 26 10 PM" src="https://user-images.githubusercontent.com/15034943/171080569-208da9fe-fb76-4d81-97f0-8adbd77febe4.png">


If leaks are detected you'll see something like:

<img width="1056" alt="Screen Shot 2022-05-30 at 8 41 07 PM" src="https://user-images.githubusercontent.com/15034943/171079699-a9a11f44-1579-4a70-86e7-eadedc29eda9.png">

#### 5. Faster job times
Gitleaks-Action Version 2 does not rely on Docker build anymore.

#### 6. Pull Request Comments
If a leak is encountered during a pull request, gitleaks-action will comment on the line number and commit containing the secret.

<img width="912" alt="Screen Shot 2022-05-31 at 9 31 06 PM" src="https://user-images.githubusercontent.com/15034943/171316255-575f92f3-15a3-472d-a56a-3cf30a25ffbc.png">

#### 7. Ensure Project Longevity
Gitleaks is used by thousands (millions?) of developers around the world. It is used by individuals, governments, and corporations to prevent and detect
leaked secrets. Until now, everything associated with gitleaks has been Free and Open Source under the MIT License, maintained primarily as a side project
by 1 person. Let's be honest, that wasn't a sustainable model (and it was starting to feel like an [xkcd comic](https://xkcd.com/2347/)).

By buying a `GITLEAKS_LICENSE` to use v2, you are supporting the gitleaks project as a whole and helping to ensure the longevity of the project.
</details>
</td></tr></table>

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
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE}} # Only required for Organizations, not personal accounts.
```

---
### Environment Variables:

- `GITHUB_TOKEN`: This variable is automatically assigned by GitHub when any action gets kicked off. You can read more about the token [here](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret).  
  **gitleaks-action** uses this token to call [a GitHub API](https://octokit.github.io/rest.js/v18#pulls-create-review-comment) to comment on PRs.
- `GITLEAKS_LICENSE` (required for organizations, not required for user accounts): A **gitleaks-action** license can be obtained at [gitleaks.io](https://gitleaks.io/products.html). **It should be added as an encrypted secret [to the repo](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) or [to the organization](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization).**
- `GITLEAKS_NOTIFY_USER_LIST` (optional): A list of GitHub accounts that should be alerted when **gitleaks-action** detects a leak. An email will be sent by GitHub to the user if their GitHub notification settings permit it. The format should be comma-separated with each username prefixed with `@`. Ex: `@octocat,@zricethezav,@gitleaks`. Spaces are okay too.
- `GITLEAKS_ENABLE_COMMENTS` (optional): Boolean value that turns on or off PR commenting. Default value is `true`.
  Set to `false` to disable comments.
- `GITLEAKS_CONFIG` (optional): Path to a [gitleaks configuration file](https://github.com/zricethezav/gitleaks#configuration).
- `GITLEAKS_ENABLE_UPLOAD_ARTIFACT` (optional): Boolean value that turns on or off uploading a sarif artifact when gitleaks detects secrets. Defaults to `true`.
- `GITLEAKS_ENABLE_SUMMARY` (optional): Boolean value to enable or disable gitleaks job summary. Defaults to `true`.
---
## Questions

### Do I need a license key?
If you are scanning repos that belong to [an organization account](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/about-organizations), you will need to obtain a license key. You can obtain a [free license key](https://gitleaks.io/products.html) for scanning 1 repo.

If you are scanning repos that belong to [a personal account](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts#personal-accounts), then no license key is required.

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

### License Change
Since v2.0.0 of Gitleaks-Action, the license has changed from MIT to a [commercial license](https://github.com/zricethezav/gitleaks-action/blob/v2/COMMERCIAL-LICENSE.txt). Prior versions to v2.0.0 of Gitleaks-Actions will remain under the MIT license.


_Copyright © 2022 Gitleaks LLC - All Rights Reserved_