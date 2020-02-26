#!/bin/bash

echo running gitleaks "$(gitleaks --version)"
if [ "$GITHUB_EVENT_NAME" = "push" ]
then
  gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA
elif [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then 
  git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF...remotes/origin/$GITHUB_HEAD_REF > commit_list.txt
  gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit-from="$(head -n 1 commit_list.txt)" --commit-to="$(tail -n 1 commit_list.txt)"
fi 

if [ $? -eq 1 ]
then
  echo "STOP! Gitleaks encountered leaks"
  echo "pssst, maintaining gitleaks takes a lot of work... consider sponsoring or donating a little something"
  echo "https://github.com/sponsors/zricethezav"
  echo "https://www.paypal.me/zricethezav"
  exit 1
else
  echo "Your code is good to go"
  echo "pssst, maintaining gitleaks takes a lot of work... consider sponsoring or donating a little something"
  echo "https://github.com/sponsors/zricethezav"
  echo "https://www.paypal.me/zricethezav"
fi
