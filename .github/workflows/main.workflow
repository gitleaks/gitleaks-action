workflow "gitleaks my commits" {
    on = "push"
    resolves = ["gitleaks"]
}

action "gitleaks" {
    uses = "zricethezav/gitleaks-action@master"
}
