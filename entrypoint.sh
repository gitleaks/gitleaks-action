#!/bin/bash

INPUT_CONFIG_PATH="$1"
INPUT_COMMIT_BEFORE="$2"
CONFIG=""

# Check if a custom config has been provided.
if [ -f "$GITHUB_WORKSPACE/$INPUT_CONFIG_PATH" ]; then
  CONFIG=" --config-path=$GITHUB_WORKSPACE/$INPUT_CONFIG_PATH"
fi

DONATE_MSG="👋 maintaining gitleaks takes a lot of work so consider sponsoring me or donating a little something\n\e[36mhttps://github.com/sponsors/zricethezav\n\e[36mhttps://www.paypal.me/zricethezav\n"

# Use the base branch for pull requests and the "before" commit for pushes as the scan boundary.
case "$GITHUB_EVENT_NAME" in
 "push")         TARGET_REF="$INPUT_COMMIT_BEFORE" ;;
 "pull_request") TARGET_REF="remotes/origin/$GITHUB_BASE_REF" ;;
 *)              echo "Unsupported event type: $GITHUB_EVENT_NAME"; exit 1 ;;
esac

echo "Scanning commits back to $TARGET_REF"

# Create list of commits since the target ref.
git --git-dir="$GITHUB_WORKSPACE/.git" log --left-right --cherry-pick --pretty=format:"%H" $TARGET_REF... > commit_list.txt

echo running gitleaks "$(gitleaks --version) with the following command👇"
echo gitleaks --path=$GITHUB_WORKSPACE --verbose --redact --commits-file=commit_list.txt $CONFIG
CAPTURE_OUTPUT=$(gitleaks --path=$GITHUB_WORKSPACE --verbose --redact --commits-file=commit_list.txt $CONFIG)

if [ $? -eq 1 ]
then
  GITLEAKS_RESULT=$(echo -e "\e[31m🛑 STOP! Gitleaks encountered leaks")
  echo "$GITLEAKS_RESULT"
  echo "::set-output name=exitcode::$GITLEAKS_RESULT"
  echo "----------------------------------"
  echo "$CAPTURE_OUTPUT"
  echo "::set-output name=result::$CAPTURE_OUTPUT"
  echo "----------------------------------"
  echo -e $DONATE_MSG
  exit 1
else
  GITLEAKS_RESULT=$(echo -e "\e[32m✅ SUCCESS! Your code is good to go!")
  echo "$GITLEAKS_RESULT"
  echo "::set-output name=exitcode::$GITLEAKS_RESULT"
  echo "------------------------------------"
  echo -e $DONATE_MSG
fi
