#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

npm ci --include=dev --no-audit --no-fund
npm run test:sso
npm run build

# Database schema changes require separate review; never push schemas
# automatically against the externally managed databases.
