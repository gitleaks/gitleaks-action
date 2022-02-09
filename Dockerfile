FROM zricethezav/gitleaks:v7.6.1

LABEL "com.github.actions.name"="gitleaks-action"
LABEL "com.github.actions.description"="runs gitleaks on push and pull request events"
LABEL "com.github.actions.icon"="shield"
LABEL "com.github.actions.color"="purple"
LABEL "repository"="https://github.com/zricethezav/gitleaks-action"

ADD entrypoint.sh /entrypoint.sh
ADD gitleaks.toml /gitleaks.toml
ENTRYPOINT ["/entrypoint.sh"]
