#!/usr/bin/env sh
set -eu

mkdir -p public

node - <<'NODE'
const fs = require('fs')

const runtimeEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED:
    process.env.NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED || '',
}

fs.writeFileSync(
  'public/runtime-env.js',
  `window.__RUNTIME_ENV__ = ${JSON.stringify(runtimeEnv)};\n`
)
NODE

exec "$@"

