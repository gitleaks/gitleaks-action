<p align="center">
  <img alt="gitleaks" src="https://raw.githubusercontent.com/zricethezav/gifs/master/gitleakslogo.png" height="70" />
</p>

Gitleaks Action provides a simple way to run gitleaks in your CI/CD pipeline.


### Sample Workflow
```
name: gitleaks

on: [push,pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: gitleaks-action
      uses: zricethezav/gitleaks-action@master
```

### Using your own .gitleaks.toml configuration
Simple include a .gitleaks.toml in the root of your repo directory.

### NOTE!!!
You must use `- uses: actions/checkout@v1` before the gitleaks-action step
