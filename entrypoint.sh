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

git log $GITHUB_WORKSPACE
# git log --left-right --graph --cherry-pick --oneline master...origin/zricethezav-patch-3


# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'

