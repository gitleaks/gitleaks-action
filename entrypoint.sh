#!/bin/bash

CONFIG=""
# check if using gitleaks config or not
if [ -f "$GITHUB_WORKSPACE/.gitleaks.toml" ]
then
  CONFIG=" --config=$GITHUB_WORKSPACE/.gitleaks.toml"
fi

echo running gitleaks "$(gitleaks --version) with the following command👇"

DONATE_MSG="👋 maintaining gitleaks takes a lot of work so consider sponsoring me or donating a little something\n\e[36mhttps://github.com/sponsors/zricethezav\n\e[36mhttps://www.paypal.me/zricethezav\n"
GITLEAKS_RESULTS="test"

if [ "$GITHUB_EVENT_NAME" = "push" ]
then
  echo gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA $CONFIG
  gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA $CONFIG
elif [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then
  git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF...remotes/origin/$GITHUB_HEAD_REF > commit_list.txt
  echo gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit-from="$(head -n 1 commit_list.txt)" --commit-to="$(tail -n 1 commit_list.txt)" $CONFIG
  gitleaks --pretty --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit-from="$(head -n 1 commit_list.txt)" --commit-to="$(tail -n 1 commit_list.txt)" $CONFIG
fi
GITLEAKS_RESULTS=$?
echo $GITLEAKS_RESULTS
if [ $? -eq 1 ]
then
  echo -e "\e[31m🛑 STOP! Gitleaks encountered leaks"
  echo "----------------------------------"
  echo -e $DONATE_MSG
  exit 1
else
  echo -e "\e[32m✅ SUCCESS! Your code is good to go!"
  echo "------------------------------------"
  echo -e $DONATE_MSG
fi
