FROM zricethezav/gitleaks:v8.8.2

LABEL "com.github.actions.name"="gitleaks-action"
LABEL "com.github.actions.description"="runs gitleaks on push and pull request events"
LABEL "com.github.actions.icon"="shield"
LABEL "com.github.actions.color"="purple"
LABEL "repository"="https://github.com/zricethezav/gitleaks-action"

# User 'root' is required to successfully modify the system `git` permissions so
# that the GITHUB_WORKSPACE can be marked as safe, despite being owned by someone
# else (i.e. a user outside of Docker).
USER root

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
