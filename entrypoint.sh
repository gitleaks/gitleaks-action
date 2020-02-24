#!/bin/bash
echo "hello"
printenv
if [ "$GITHUB_EVENT_NAME" = "push" ]
then 
  echo "this is a push";
fi

if [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then 
  echo "pull_request";
fi 

echo "$GITHUB_EVENT_NAME"
echo "???"

gitleaks --help
gitleaks --version

echo $GITHUB_WORKSPACE
ls -al /github/workspace
ls -al "$GITHUB_WORKSPACE"

echo "eh"
echo "mmm"
echo "we need two commits to test?"
