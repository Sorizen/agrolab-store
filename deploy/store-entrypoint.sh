#!/bin/sh
set -e
node scripts/db-setup.mjs
exec "$@"
