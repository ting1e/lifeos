#!/bin/sh
set -e

mkdir -p /data/uploads
chown -R nextjs:nodejs /data/uploads 2>/dev/null || true

exec su-exec nextjs "$@"
