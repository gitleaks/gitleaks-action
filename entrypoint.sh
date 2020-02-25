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
echo git --git-dir=$GITHUB_WORKSPACE/.git log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF...remotes/origin/$GITHUB_HEAD_REF
git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF...remotes/origin/$GITHUB_HEAD_REF


printenv
git --git-dir="$GITHUB_WORKSPACE/.git" branch
git --git-dir="$GITHUB_WORKSPACE/.git" branch -a

echo "anything?"
echo "nejjjjjjjjw pr"
echo "nejjjjjjjjw pr"


# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'
# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'
# aws_access_key_id='AKIAIO5FODNN7EXAMPLE'

