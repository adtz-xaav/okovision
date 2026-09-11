# Okovision

Self-hosted monitoring and control for the Okofen Pellematic Touch pellet boiler. Containerized, portable — run it against your own boiler on any Docker host.

This is a full rewrite of the original [stawen/okovision](https://github.com/stawen/okovision) PHP application. See `CHANGELOG.md` for release history.

Status: stable, tagged release (`v2.0.0`).

## Structure

- `backend/` — Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL.
- `frontend/` — React + Vite + TypeScript SPA.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — free to use, modify, and self-host for any noncommercial purpose (personal, hobby, research, education, nonprofit). Commercial use requires a separate license from [SAS Additiz](https://additiz.com).

## Deployment

Run this on a Linux host on the same local network as your boiler (a NAS with Docker/Container Station support, a Raspberry Pi, a mini PC — anything that can run Docker Compose). **Don't use Docker Desktop for Mac or Windows for a real deployment**: its containers sit behind a VM that reaches the internet but not your LAN, so the app would never be able to reach the boiler. It's fine for frontend-only development.

1. Copy `.env.example` to `.env` and fill in the two generated secrets (commands are in the file's comments: `openssl rand -base64 48` for `JWT_SECRET`, `openssl rand -hex 32` for `BOILER_CREDENTIALS_KEY`). Set a real `POSTGRES_PASSWORD`. Adjust `BACKEND_PORT`/`FRONTEND_PORT` if the defaults (4000/8080) are already used on your host.
2. `docker compose up -d --build` — builds and starts `postgres`, `backend`, `frontend`; database migrations run automatically on backend startup.
3. Open `http://<host>:<FRONTEND_PORT>` and register — the first account created becomes the ADMIN/owner account. Register right after first startup: anyone who reaches the app before you becomes the admin instead, so don't expose the port to the internet before this step (keep it on your LAN or behind a VPN).
4. From the admin **Sensors** page, set your boiler's LAN IP and its own web-UI login (not your Okovision account) to enable history ingestion and live values/control.

### Exposing this to the internet (reverse proxy + TLS)

The default setup ("keep it on your LAN or behind a VPN") is the right call for most home installs. If you do want to reach your boiler's dashboard from outside your LAN — a genuinely common ask — put a TLS-terminating reverse proxy in front instead of port-forwarding the app directly: without TLS, your session cookie and boiler control commands travel in the clear.

The lowest-effort option is [Caddy](https://caddyserver.com/), with automatic Let's Encrypt certificates:

```caddyfile
okovision.example.com {
    reverse_proxy localhost:8080
}
```

[Traefik](https://traefik.io/traefik/) with its ACME provider is a similar low-effort alternative if you're already running it for other services; `nginx` + `certbot` also works but needs manual certificate renewal setup.

Once TLS is in front of the app, in `.env`:

- Set `COOKIE_SECURE=true` — required, or the session cookie won't be sent at all. **Never set this without TLS**: a `Secure` cookie is silently dropped by the browser over plain HTTP, which breaks login.
- Set `CORS_ORIGIN` to your public HTTPS origin (e.g. `https://okovision.example.com`) — it defaults to `http://localhost:<FRONTEND_PORT>`, which only works for local/LAN access.

### Updating

`git pull` (or fetch the new release) then `docker compose up -d --build` — this rebuilds only what changed and re-applies any new database migrations on backend startup. No manual migration step needed. Instead of building locally, you can also point `docker-compose.yml`'s `backend`/`frontend` services at the pre-built multi-arch images published for each tagged release: `ghcr.io/adtz-xaav/okovision-backend:<version>` and `okovision-frontend:<version>` (`amd64`/`arm64`).

### Connecting a local DB client (optional)

Postgres isn't published to the host by default — only `backend` can reach it, over the internal Compose network. If you want to connect a local client (`psql`, a GUI tool) for debugging, add a `docker-compose.override.yml` next to `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "5432:5432"
```

`docker compose up -d` automatically layers this file on top — no flag needed. Don't do this on an internet-facing host.

---

# Okovision (FR)

Supervision et pilotage auto-hébergés pour une chaudière à granulés Okofen Pellematic Touch. Conteneurisé et portable — à faire tourner sur sa propre chaudière, sur n'importe quel hôte Docker.

Réécriture complète de l'application PHP originale [stawen/okovision](https://github.com/stawen/okovision). Voir `CHANGELOG.md` pour l'historique des versions.

Statut : stable, version taguée (`v2.0.0`).

## Déploiement

À faire tourner sur un hôte Linux sur le même réseau local que la chaudière (NAS avec support Docker/Container Station, Raspberry Pi, mini PC — tout ce qui peut exécuter Docker Compose). **Ne pas utiliser Docker Desktop pour Mac ou Windows en déploiement réel** : ses conteneurs sont derrière une VM qui accède à internet mais pas au réseau local, donc l'application ne pourrait jamais joindre la chaudière. C'est en revanche suffisant pour développer côté frontend.

1. Copier `.env.example` en `.env` et renseigner les deux secrets générés (commandes en commentaire dans le fichier : `openssl rand -base64 48` pour `JWT_SECRET`, `openssl rand -hex 32` pour `BOILER_CREDENTIALS_KEY`). Définir un vrai `POSTGRES_PASSWORD`. Ajuster `BACKEND_PORT`/`FRONTEND_PORT` si les valeurs par défaut (4000/8080) sont déjà utilisées sur l'hôte.
2. `docker compose up -d --build` — construit et démarre `postgres`, `backend`, `frontend` ; les migrations de base de données s'appliquent automatiquement au démarrage du backend.
3. Ouvrir `http://<hôte>:<FRONTEND_PORT>` et créer un compte — le premier compte créé devient le compte ADMIN/propriétaire. Créer ce compte tout de suite après le premier démarrage : quiconque atteint l'application avant vous en devient l'administrateur à votre place — ne pas exposer le port à internet avant cette étape (rester sur le réseau local ou derrière un VPN).
4. Depuis la page admin **Capteurs**, renseigner l'adresse IP locale de la chaudière et ses propres identifiants de connexion web (pas le compte Okovision) pour activer l'historique et les valeurs/pilotage en temps réel.

### Exposer l'application sur internet (reverse proxy + TLS)

La configuration par défaut (« rester sur le réseau local ou derrière un VPN ») est le bon choix pour la plupart des installations domestiques. Pour accéder au tableau de bord de la chaudière depuis l'extérieur du réseau local — une demande fréquente et légitime — placer un reverse proxy avec terminaison TLS devant l'application plutôt que de rediriger le port directement : sans TLS, le cookie de session et les commandes de pilotage de la chaudière circulent en clair.

L'option la plus simple est [Caddy](https://caddyserver.com/), avec certificats Let's Encrypt automatiques :

```caddyfile
okovision.example.com {
    reverse_proxy localhost:8080
}
```

[Traefik](https://traefik.io/traefik/) avec son fournisseur ACME est une alternative similaire si vous l'utilisez déjà pour d'autres services ; `nginx` + `certbot` fonctionne aussi mais nécessite une configuration manuelle du renouvellement des certificats.

Une fois le TLS en place devant l'application, dans `.env` :

- Définir `COOKIE_SECURE=true` — obligatoire, sinon le cookie de session n'est pas envoyé du tout. **Ne jamais l'activer sans TLS** : un cookie `Secure` est silencieusement rejeté par le navigateur en HTTP simple, ce qui casse la connexion.
- Définir `CORS_ORIGIN` avec l'origine HTTPS publique (ex. `https://okovision.example.com`) — la valeur par défaut est `http://localhost:<FRONTEND_PORT>`, qui ne fonctionne que pour un accès local/réseau local.

### Mise à jour

`git pull` (ou récupérer la nouvelle version) puis `docker compose up -d --build` — seuls les services modifiés sont reconstruits, et les nouvelles migrations de base de données s'appliquent automatiquement au démarrage du backend. Aucune étape de migration manuelle. Plutôt que de reconstruire localement, `docker-compose.yml` peut aussi pointer les services `backend`/`frontend` vers les images multi-architecture publiées à chaque version taguée : `ghcr.io/adtz-xaav/okovision-backend:<version>` et `okovision-frontend:<version>` (`amd64`/`arm64`).

### Connexion d'un client BDD local (optionnel)

Postgres n'est pas exposé sur l'hôte par défaut — seul `backend` peut l'atteindre, via le réseau interne de Compose. Pour connecter un client local (`psql`, un outil graphique) à des fins de débogage, ajouter un fichier `docker-compose.override.yml` à côté de `docker-compose.yml` :

```yaml
services:
  postgres:
    ports:
      - "5432:5432"
```

`docker compose up -d` superpose automatiquement ce fichier — aucune option à ajouter. À ne pas faire sur un hôte exposé à internet.

## Licence

Sous licence [PolyForm Noncommercial License 1.0.0](LICENSE) — utilisation, modification et auto-hébergement libres pour tout usage non commercial (personnel, loisir, recherche, éducation, associatif). Un usage commercial nécessite une licence distincte auprès de [SAS Additiz](https://additiz.com).
