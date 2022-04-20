# Updates coming soon

<p align="center">
  <img alt="gitleaks" src="https://raw.githubusercontent.com/zricethezav/gifs/master/gitleakslogo.png" height="70" />
</p>

Gitleaks Action provides a simple way to run gitleaks in your CI/CD pipeline.

This action should be used after a checkout. Be sure `actions/checkout` runs with the appropriate
`fetch-depth` that you need:

* `fetch-depth: 0` clones the entire history
* `fetch-depth: 1`, the default, fetches only the most recent commit.

### Sample Workflow
```
name: gitleaks

on: [push,pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: '0'
    - name: gitleaks-action
      uses: zricethezav/gitleaks-action@master
```

### Using your own .gitleaks.toml configuration
```
name: gitleaks

on: [push,pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: '0'
    - name: gitleaks-action
      uses: zricethezav/gitleaks-action@master
      with:
        config-path: security/.gitleaks.toml
```
    > The `config-path` is relative to your GitHub Worskpace
