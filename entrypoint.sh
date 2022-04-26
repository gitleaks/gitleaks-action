#!/bin/bash

set -eu -o pipefail

# Assume the $GITHUB_WORKSPACE is a safe directory
# https://github.blog/2022-04-12-git-security-vulnerability-announced/
git config --global --add safe.directory "$GITHUB_WORKSPACE"

extra_args=""

# specify custom config if provided
if [ ! -z "${1-""}" ]; then
  extra_args="$extra_args --config $GITHUB_WORKSPACE/$1"
fi

shift
# specify no-git if provided
if [ "true" = "${1-""}" ]; then
  extra_args="$extra_args --no-git"
fi

# use log-opts to limit the commits scanned for pull requests
if [ "$GITHUB_EVENT_NAME" = "pull_request" ]
then
  log_opts="--left-right --cherry-pick --pretty=format:"%H" remotes/origin/$GITHUB_BASE_REF..."
  extra_args="$extra_args --log-opts \"$log_opts\""
fi

DONATE_MSG="👋 maintaining gitleaks takes a lot of work so consider sponsoring me or donating a little something\n\e[36mhttps://github.com/sponsors/zricethezav\n\e[36mhttps://www.paypal.me/zricethezav\n"

echo running gitleaks $(gitleaks version) with the following command👇
args="detect --source=$GITHUB_WORKSPACE --verbose --redact $extra_args"
echo gitleaks $args

set +e
CAPTURE_OUTPUT=$(gitleaks $args)

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
