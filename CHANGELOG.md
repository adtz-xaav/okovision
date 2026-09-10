# Changelog

All notable user-visible changes to Okovision are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-09-11

First stable release of the Okovision rewrite: a self-hosted, containerized replacement for the original PHP app, built for any Okofen Pellematic Touch owner to run on their own network.

### Added
- Bilingual (EN/FR) web UI: sign-in/registration (first account becomes admin), sensor history browsing, live values with control of writable tags, ECharts-based graphs, and daily/season consumption reports (degree-days, pellet usage, burner cycle counts).
- Admin sensor mapping (CSV column or live tag), boiler connection setup, and an admin-configurable synthesis config so reports work with any sensor naming, not hardcoded ones.
- Season and silo-delivery tracking for season-over-season efficiency reporting.
- Automatic scheduled ingestion from the boiler's daily CSV logs, with a dependency-triggered daily synthesis job.
- Docker Compose deployment (`postgres` + `backend` + `frontend`), portable to any Linux Docker host (NAS, Raspberry Pi, mini PC) — see `README.md`.
- Multi-arch (amd64/arm64) container images published to GHCR on tagged releases.

### Security
- Confirmation prompts before every destructive delete action in the UI.
- Closed a first-registration race where two simultaneous sign-ups on a fresh instance could both become admin.
- Optional min/max bounds on writable live values, enforced server-side before anything is sent to the boiler.

### Fixed
- Ingestion completeness check now matches the boiler's real last-log-of-the-day timestamp instead of assuming an exact second, which had silently made daily synthesis skip every real day.

---

# Changelog (FR)

Historique des changements visibles pour les utilisateurs d'Okovision. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).

## [1.0.0] — 2026-09-11

Première version stable de la réécriture d'Okovision : une alternative auto-hébergée et conteneurisée à l'application PHP d'origine, pensée pour que tout propriétaire d'une Pellematic Touch puisse la faire tourner sur son propre réseau.

### Ajouté
- Interface web bilingue (EN/FR) : connexion/inscription (le premier compte créé devient administrateur), historique des capteurs, valeurs temps réel avec pilotage des variables modifiables, graphiques ECharts, et bilans journaliers/saisonniers (degrés-jours, consommation de granulés, cycles du brûleur).
- Correspondance des capteurs côté admin (colonne CSV ou variable temps réel), configuration de la connexion à la chaudière, et un paramétrage des bilans par l'admin pour que les rapports fonctionnent avec n'importe quel nommage de capteurs.
- Suivi des saisons et des livraisons de granulés pour comparer l'efficacité d'une saison à l'autre.
- Récupération automatique et planifiée des journaux CSV de la chaudière, avec un calcul de bilan journalier déclenché en chaîne après l'import.
- Déploiement via Docker Compose (`postgres` + `backend` + `frontend`), portable sur tout hôte Linux Docker (NAS, Raspberry Pi, mini PC) — voir `README.md`.
- Images conteneur multi-architecture (amd64/arm64) publiées sur GHCR à chaque version taguée.

### Sécurité
- Confirmation demandée avant toute suppression dans l'interface.
- Correction d'une situation de compétition à la première inscription où deux créations de compte simultanées sur une instance vierge pouvaient toutes deux devenir administrateur.
- Bornes min/max optionnelles sur les valeurs temps réel modifiables, vérifiées côté serveur avant tout envoi à la chaudière.

### Corrigé
- La vérification de complétude de l'import correspond désormais au réel horodatage de dernière ligne journalière de la chaudière plutôt que de supposer une seconde exacte, ce qui faisait échouer silencieusement le calcul des bilans sur toutes les journées réelles.
