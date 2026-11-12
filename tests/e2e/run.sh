#!/bin/sh
# Run the browser walkthrough in the Playwright Docker image, so no local
# Node.js or browser is needed. Pass the BIE_* variables described in
# walkthrough.mjs; screenshots and results.json go to tests/e2e/output/.
#
#   BIE_WIKI_URL=https://wiki.example BIE_USER=TestUser BIE_PASSWORD=... tests/e2e/run.sh
set -eu

PLAYWRIGHT_VERSION=1.49.1
dir=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$dir/output"

# --network host lets the container reach a wiki on this machine.
exec docker run --rm --network host --ipc=host \
	--user "$(id -u):$(id -g)" \
	-e HOME=/tmp \
	-e BIE_WIKI_URL -e BIE_USER -e BIE_PASSWORD -e BIE_INSECURE_TLS \
	-e BIE_OUTPUT=/e2e/output \
	-v "$dir:/e2e" \
	"mcr.microsoft.com/playwright:v$PLAYWRIGHT_VERSION-noble" \
	sh -c "cd /tmp && npm install --silent --no-save playwright@$PLAYWRIGHT_VERSION >/dev/null && cp /e2e/walkthrough.mjs /tmp/ && node /tmp/walkthrough.mjs"
