#!/bin/bash

echo running gitleaks "$(gitleaks --version)"

DONATE_MSG="👋 maintaining gitleaks takes a lot of work... consider sponsoring me or donating a little something\nhttps://github.com/sponsors/zricethezav\nhttps://www.paypal.me/zricethezav\n"

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
  echo -e "\e[31m 🛑 STOP! Gitleaks encountered leaks"
  echo "------------------"
  echo -e $DONATE_MSG
  exit 1
else
  echo -e "\e[32m ✅ SUCESS! Your code is good to go!"
  echo "------------------"
  echo -e $DONATE_MSG
fi
