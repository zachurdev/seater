#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR"/git-add.sh
"$SCRIPT_DIR"/git-commit.sh
"$SCRIPT_DIR"/git-push.sh
