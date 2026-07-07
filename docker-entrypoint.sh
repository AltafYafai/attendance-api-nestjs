#!/bin/sh
set -e

# Apply pending migrations before the API starts accepting traffic.
npx prisma migrate deploy

exec node dist/main.js
