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
ls /github/workspace
ls "$GITHUB_WORKSPACE"

echo "eh"
echo "mmm"
