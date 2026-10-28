#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")

git -C "$PARENT_DIR" commit -m "$TIMESTAMP"
