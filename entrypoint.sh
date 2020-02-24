#!/bin/bash
echo "hello"
printenv
if [ "$GITHUB_EVENT_NAME" = "push" ]; then echo "push"; else echo "not push"; fi
