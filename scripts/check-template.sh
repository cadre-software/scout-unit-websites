#!/usr/bin/env bash
set -euo pipefail
verify_release() {
  if [[ ${SCOUT_VERIFY_RELEASE:-0} == 1 ]]; then
    python3 scripts/verify-release.py
  fi
}
verify_release
node scripts/build-scout-demo.mjs
verify_release
port=${SCOUT_TEST_PORT:-18999}
python3 scripts/serve.py . --port "$port" > /tmp/scout-template-server-$$.log 2>&1 &
server=$!
cleanup() { kill "$server" 2>/dev/null || true; wait "$server" 2>/dev/null || true; rm -f /tmp/scout-template-server-$$.log; }
trap cleanup EXIT
python3 - "$port" <<'PY'
import sys,time,urllib.request
for attempt in range(40):
    try:
        with urllib.request.urlopen('http://127.0.0.1:'+sys.argv[1]+'/index.html',timeout=1) as response:
            assert response.status == 200
            break
    except OSError:
        time.sleep(.1)
else:
    raise SystemExit('Static test server did not start')
PY
node scripts/check-scout-demo.cjs "http://127.0.0.1:$port/"
node scripts/check-scout-contact.cjs "http://127.0.0.1:$port/"
node scripts/check-scout-editor.cjs "http://127.0.0.1:$port/"
node scripts/check-scout-publishing.cjs "http://127.0.0.1:$port/"

verify_release
