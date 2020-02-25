#!/bin/bash

echo running gitleaks "$(gitleaks --version)"
if [ "$GITHUB_EVENT_NAME" = "push" ]
then
  gitleaks --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA
fi

if [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then 
  gitleaks --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA
fi 

# git --git-dir="$GITHUB_WORKSPACE/.git" log $GITHUB_WORKSPACE
git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --graph --cherry-pick --oneline $GITHUB_BASE_REF...$GITHUB_HEAD_REF

printenv
echo "anything?"

