#!/usr/bin/env bash
# Thin wrapper — Node script is the single source of truth.
# Usage: bash scripts/set-lan-ip.sh
exec node "$(cd "$(dirname "$0")" && pwd)/set-lan-ip.js" "$@"
