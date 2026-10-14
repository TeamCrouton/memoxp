# memoXP

Application de mémos (ajouter, épingler, supprimer) utilisée pour les labos DevOps :

| Labo | Contenu | Où |
| --- | --- | --- |
| XP01 | Application en 3 conteneurs, CI GitHub Actions, CD vers le VPS | `api/`, `web/`, `docker-compose.yml`, `.github/workflows/` |
| XP02 | Infrastructure Azure en code avec Terraform + cloud-init | `terraform/` |
| XP03 | Kubernetes (K3s) sur la VM Azure | `k8s/`, `scripts/k8s-deploy.sh` |

```
memoxp/
├── api/                 API Express + TypeScript + PostgreSQL (port 4000)
├── web/                 Front React + Vite, servi par Nginx (port 80)
├── docker-compose.yml   db + api + web
├── scripts/e2e.sh       tests de bout en bout (CI, VPS, Kubernetes)
├── scripts/k8s-deploy.sh
├── .github/workflows/   ci.yml (vérifie + publie les images), cd.yml (déploie sur le VPS)
├── terraform/           réseau, pare-feu, VM Azure, cloud-init
└── k8s/                 namespace, PostgreSQL, API, front, Ingress
```

## Lancer en local

Avec Docker :

```bash
docker compose up -d --build
# http://localhost:8080
scripts/e2e.sh http://localhost:8080
```

Pour développer (rechargement automatique) :

```bash
docker compose up -d db
cd api && npm install
DATABASE_URL=postgres://memoxp:memoxp@localhost:5432/memoxp npm run dev   # PowerShell : $env:DATABASE_URL="..." puis npm run dev
cd ../web && npm install && npm run dev                                   # http://localhost:5173
```

## API

| Méthode | Route | Réponse |
| --- | --- | --- |
| GET | `/health` | 200 si la base répond, 503 sinon |
| GET | `/api/memos` | liste, épinglés d'abord |
| POST | `/api/memos` `{"content": "..."}` | 201, ou 422 si vide |
| PATCH | `/api/memos/:id` `{"pinned": true}` | 200, ou 404 |
| DELETE | `/api/memos/:id` | 204, ou 404 |

## Flux Git

`feat/...` → Pull Request vers `dev` → PR `dev` → `prod`. La CI doit être verte pour fusionner
(règle de branche). Un push sur `dev` ou `prod` publie les images sur GHCR
(`ghcr.io/<organisation>/memoxp-api` et `memoxp-web`, tags = commit court + nom de branche).
Une CI verte sur `prod` déclenche `cd.yml`, qui met à jour le VPS.

## À configurer une fois

1. **GitHub** : dépôt dans une organisation (tous *Owner*). Branche par défaut = `prod`
   (nécessaire pour que `cd.yml` se déclenche). Rulesets sur `dev` et `prod` : PR obligatoire +
   checks `Qualite (api)`, `Qualite (web)`, `Images Docker de bout en bout`, `Terraform (format et validation)`,
   `Manifests Kubernetes`.
2. **GHCR** : après le premier push, rendre les paquets `memoxp-api` et `memoxp-web` publics
   (organisation → Packages → Package settings).
3. **VPS** : Docker installé, utilisateur `deploy` (groupe docker), dossier `/opt/memoxp` avec un `.env`
   copié de `.env.example`. Environment GitHub `production` avec les secrets `VPS_HOST`, `VPS_PORT`,
   `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` (et la variable `WEB_PORT` si ce n'est pas 80).
4. **Azure** : voir ci-dessous.

## XP02 — Terraform

```powershell
cd terraform
copy terraform.tfvars.example terraform.tfvars   # mettre ton IP publique
az login
terraform init        # puis commiter le .terraform.lock.hcl généré
terraform plan -out tfplan
terraform apply tfplan
```

La VM démarre avec SSH sur le port 62205 (clé uniquement), ufw, fail2ban, Docker et K3s.
Connexion : la commande affichée par `terraform output commande_ssh`.
Fin de session : `terraform destroy` pour ne plus consommer de crédits.

Erreur 403 `RequestDisallowedByAzure` → changer `location` ; erreur 409 `SkuNotAvailable` → changer `vm_size`.

## XP03 — Kubernetes

Sur la VM (ou depuis ton PC via un tunnel SSH vers le port 6443) :

```bash
scripts/k8s-deploy.sh <organisation-en-minuscules> [tag]
SKIP_FRONT=0 scripts/e2e.sh http://<ip_publique>
```

Démo : `kubectl -n memoxp delete pod -l app=api` (auto-réparation),
`kubectl -n memoxp scale deploy/api --replicas=3`, `kubectl -n memoxp rollout undo deploy/api`.
