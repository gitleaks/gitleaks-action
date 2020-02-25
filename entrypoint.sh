#!/bin/bash

echo running gitleaks "$(gitleaks --version)"
if [ "$GITHUB_EVENT_NAME" = "push" ]
then
  gitleaks --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit=$GITHUB_SHA
fi

if [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then 
  git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF...remotes/origin/$GITHUB_HEAD_REF > commit_list.txt
  cat commit_list.txt
  echo gitleaks --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit-from="$(head -n 1 commit_list.txt)" --commit-to="$(tail -n 1 commit_list.txt)"
  gitleaks --repo-path=$GITHUB_WORKSPACE --verbose --redact --commit-from="$(head -n 1 commit_list.txt)" --commit-to="$(tail -n 1 commit_list.txt)"  
fi 


printenv
git --git-dir="$GITHUB_WORKSPACE/.git" branch
git --git-dir="$GITHUB_WORKSPACE/.git" branch -a

echo "anything?"
echo "nejjjjjjjjw pr"

# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'
# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'
# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'

