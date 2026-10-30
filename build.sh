#!/usr/bin/env bash
set -e
node scripts/generate-pages.mjs
echo "Static landing pages ready in public/"
