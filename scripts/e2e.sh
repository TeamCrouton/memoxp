#!/usr/bin/env bash
# Tests de bout en bout de memoXP.
# Usage : scripts/e2e.sh [URL de base]   (par défaut http://localhost:8080)
# Utilisé par la CI, et lançable à la main contre le VPS ou Kubernetes.
set -euo pipefail

BASE="${1:-http://localhost:8080}"
API="$BASE/api/memos"
JSON='Content-Type: application/json'

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
ok()   { echo "OK  $1"; }

# Liste de départ (le test doit marcher même si la base contient déjà des mémos)
before=$(curl -fsS "$API" | jq 'length')

id=$(curl -fsS -X POST -H "$JSON" -d '{"content":"memo de test e2e"}' "$API" | jq -r .id)
[ "$id" != "null" ]; ok "création (id $id)"

curl -fsS "$API" | jq -e "length == $before + 1" > /dev/null; ok "le mémo apparaît dans la liste"

curl -fsS -X PATCH -H "$JSON" -d '{"pinned":true}' "$API/$id" | jq -e '.pinned == true' > /dev/null
curl -fsS "$API" | jq -e ".[0].id == $id" > /dev/null; ok "épinglé et remonté en tête"

[ "$(code -X POST -H "$JSON" -d '{"content":"   "}' "$API")" = "422" ]; ok "mémo vide refusé (422)"

[ "$(code -X DELETE "$API/$id")" = "204" ]; ok "suppression (204)"
[ "$(code -X DELETE "$API/$id")" = "404" ]; ok "double suppression (404)"
[ "$(code -X PATCH -H "$JSON" -d '{"pinned":true}' "$API/999999999")" = "404" ]; ok "mémo inconnu (404)"

curl -fsS "$API" | jq -e "length == $before" > /dev/null; ok "liste revenue à l'état initial"

# Front : seulement si la base est servie par Nginx (pas en test direct de l'API)
if [ "${SKIP_FRONT:-0}" != "1" ]; then
  curl -fsS "$BASE/" -o /tmp/memoxp-index.html
  grep -q 'id="root"' /tmp/memoxp-index.html; ok "le front est servi"
  [ "$(code "$BASE/une/route/inconnue")" = "200" ]; ok "fallback SPA (200)"
  curl -sI "$BASE/" -o /tmp/memoxp-headers.txt   # fichier puis grep : evite le SIGPIPE
  grep -iq 'cache-control: no-cache' /tmp/memoxp-headers.txt; ok "index.html non mis en cache"
fi

echo "Tous les tests sont passés."
