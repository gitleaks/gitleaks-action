<p align="center">
  <img alt="gitleaks" src="https://raw.githubusercontent.com/zricethezav/gifs/master/gitleakslogo.png" height="70" />
</p>

Gitleaks Action provides a simple way to run gitleaks in your CI/CD pipeline.

Attention: this project is a fork of the original project [zricethezav/gitleaks-action](https://github.com/zricethezav/gitleaks-action).
For everything that is not discussed in this document see the official documentation [here](https://github.com/zricethezav/gitleaks-action/blob/master/README.md).

### OF Customizations
- The `exitcode` action's output (i.e. `steps.<gitleaks_action_id>.outputs.exitcode`) returns `0` or `1` according to the result of the test.
- The Action's input called `config-path`, used to replace the Gitleaks config using the `--config-path` parameter, is now used for passing additional configurations by using the `--additional-config` instead.
- On every Github `push` event the action creates a report file called `gitleaks-output.json` on the root of the project.


### Adding custom .gitleaks.toml configuration

This action assumes by default the use of all Gitleaks rules and can be customized using the `config-path` argument.
The rules provided will be merged with the existing default rules and not, as in the original action, been replaced.

```
name: gitleaks

on: [push,pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: gitleaks-action
      uses: motain/gitleaks-action@master
      with:
        config-path: .of/security/gitleaks.toml
```
    > The `config-path` is relative to your GitHub Worskpace

### TODOs
- Perhaps, instead of hardcoding these changes on a forked repository, we should parametrize the changes as action inputs and open a PR on the official project.
