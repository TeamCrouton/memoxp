#!/usr/bin/env bash
# Deploie memoXP sur le cluster K3s.
# Usage : scripts/k8s-deploy.sh <organisation-github> [tag]
#   ex.  : scripts/k8s-deploy.sh mon-groupe-memoxp a1b2c3d
# Le mot de passe de la base est demande au premier lancement et stocke dans un Secret
# Kubernetes (jamais dans Git).
set -euo pipefail

ORG="${1:?Donne le nom de l'organisation GitHub (en minuscules)}"
TAG="${2:-prod}"
NS=memoxp

kubectl apply -f k8s/00-namespace.yaml

if ! kubectl -n "$NS" get secret db > /dev/null 2>&1; then
  read -rsp "Mot de passe de la base (laisser vide = genere) : " PASS; echo
  PASS="${PASS:-$(openssl rand -hex 24)}"
  kubectl -n "$NS" create secret generic db --from-literal=password="$PASS"
fi

# Remplace ORGANISATION et le tag dans les manifests, sans modifier les fichiers du depot
for f in k8s/[1-9]*.yaml; do
  sed -e "s#ghcr.io/ORGANISATION/\(memoxp-[a-z]*\):prod#ghcr.io/$ORG/\1:$TAG#" "$f"
  echo "---"
done | kubectl apply -f -

kubectl -n "$NS" rollout status statefulset/db --timeout=180s
kubectl -n "$NS" rollout status deploy/api --timeout=180s
kubectl -n "$NS" rollout status deploy/web --timeout=180s
kubectl -n "$NS" get pods,svc,ingress
