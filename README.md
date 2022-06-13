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

Gitleaks Action provides a simple way to run gitleaks in your CI/CD pipeline.

## Attention 📢
On June 2, 2022, we released [Gitleaks Action v2](https://github.com/gitleaks/gitleaks-action/releases/tag/v2.0.0). There are a boatload of improvements
in v2, but it also represents a breaking change from the prior version (v1.6.0). We haven't merged v2 to the `master` branch yet because we noticed that
many users of Gitleaks Action don't pin their version. If you are using `zricethezav/gitleaks-action@master` (or now `gitleaks/gitleaks-action@master`),
then as soon as we merge v2 to master, your jobs will start failing.

We are planning to complete the merge on **June 20, 2022**. We recommend updating your .yml files to use v2 now so you aren't scrambling to do it after
your gitleaks-action jobs start failing. As an alternative, you can pin your version to v1.6.0 for now, if you aren't ready to upgrade at the moment.

#### How to upgrade to v2

For full details, see the v2 README here: https://github.com/gitleaks/gitleaks-action/tree/v2. Here is the quick list of changes to your .yml:
* Change the "uses" line to `- uses: gitleaks/gitleaks-action@v2`
* Add an `env:` section with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
* If you are scanning repos that belong to an organization, you'll also have to [acquire a GITLEAKS_LICENSE](https://github.com/gitleaks/gitleaks-action#environment-variables),
  add the license to your GitHub Secrets, and add this line to the `env:` section: `GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE}}`

#### How to pin to v1.6.0
* Change your "uses" line to `gitleaks/gitleaks-action@v1.6.0`
* Set a reminder to upgrade to v2 later.
-------------------------------------------------------------------------

### Sample Workflow
```
name: gitleaks

on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: gitleaks-action
      uses: gitleaks/gitleaks-action@v1.6.0
```

### Using your own .gitleaks.toml configuration
```
name: gitleaks

on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: gitleaks-action
      uses: gitleaks/gitleaks-action@v1.6.0
      with:
        config-path: security/.gitleaks.toml
```
    > The `config-path` is relative to your GitHub Worskpace

### NOTE!!!
You must use `actions/checkout` before the gitleaks-action step. If you are using `actions/checkout@v2` you must specify a commit depth other than the default which is 1. 

ex: 
```
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: '0'
    - name: gitleaks-action
      uses: gitleaks/gitleaks-action@v1.6.0
```

using a fetch-depth of '0' clones the entire history. If you want to do a more efficient clone, use '2', but that is not guaranteed to work with pull requests.   
