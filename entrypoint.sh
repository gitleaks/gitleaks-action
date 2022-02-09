#!/bin/bash

INPUT_CONFIG_PATH="$1"
CONFIG=" --config-path=/gitleaks.toml"

# check if a custom config have been provided
if [ -f "$GITHUB_WORKSPACE/$INPUT_CONFIG_PATH" ]; then
  CONFIG="$CONFIG --additional-config=$GITHUB_WORKSPACE/$INPUT_CONFIG_PATH"
fi

echo running gitleaks "$(gitleaks --version) with the following command👇"

if [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then 
  git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF... > commit_list.txt
  echo gitleaks --path=$GITHUB_WORKSPACE --verbose --redact --commits-file=commit_list.txt $CONFIG
  CAPTURE_OUTPUT=$(gitleaks --path=$GITHUB_WORKSPACE --verbose --redact --commits-file=commit_list.txt $CONFIG)
else
  echo gitleaks --path=$GITHUB_WORKSPACE --verbose --report=gitleaks-output.json --redact $CONFIG
  CAPTURE_OUTPUT=$(gitleaks --path=$GITHUB_WORKSPACE --verbose --report=gitleaks-output.json --redact $CONFIG)
fi

if [ $? -eq 1 ]
then
  GITLEAKS_RESULT=$(echo -e "\e[31m🛑 STOP! Gitleaks encountered leaks")
  echo "$GITLEAKS_RESULT"
  echo "::set-output name=exitcode::1"
  echo "----------------------------------"
  echo "$CAPTURE_OUTPUT"
  echo "::set-output name=result::$CAPTURE_OUTPUT"
  echo "----------------------------------"
  exit 1
else
  GITLEAKS_RESULT=$(echo -e "\e[32m✅ SUCCESS! Your code is good to go!")
  echo "$GITLEAKS_RESULT"
  echo "::set-output name=exitcode::0"
  echo "------------------------------------"
fi
