# Okovision

Self-hosted monitoring and control for the Okofen Pellematic Touch pellet boiler. Containerized, portable — run it against your own boiler on any Docker host.

This is a full rewrite of the original [stawen/okovision](https://github.com/stawen/okovision) PHP application (kept for reference under [`legacy/`](legacy/)). See `CLAUDE.md` for architecture and contributor guidance.

Status: rewrite in progress. `backend/` and `frontend/` are the new application; `legacy/` is not maintained.

## Structure

- `backend/` — Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL.
- `frontend/` — React + Vite + TypeScript SPA.
- `legacy/` — the original PHP application, kept for reference during the rewrite.

---

# Okovision (FR)

Supervision et pilotage auto-hébergés pour une chaudière à granulés Okofen Pellematic Touch. Conteneurisé et portable — à faire tourner sur sa propre chaudière, sur n'importe quel hôte Docker.

Réécriture complète de l'application PHP originale [stawen/okovision](https://github.com/stawen/okovision) (conservée pour référence dans [`legacy/`](legacy/)). Voir `CLAUDE.md` pour l'architecture et les conventions.

Statut : réécriture en cours. `backend/` et `frontend/` constituent la nouvelle application ; `legacy/` n'est plus maintenu.
