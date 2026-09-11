# Changelog

All notable user-visible changes to Okovision are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [2.0.1] — 2026-09-11

### Added
- Raw boiler CSV logs are now archived in the database as they're ingested, so daily history survives the Pellematic Touch's own ~4-day log retention window. If an ingestion run is ever down longer than that, or if the parsing/column-mapping logic changes later, past days can be recovered and reprocessed from the archive instead of being lost for good.

## [2.0.0] — 2026-09-11

First public release of the Okovision rewrite: a full re-engineering, from scratch, of the original PHP application (versions 1.x) into a self-hosted, containerized, bilingual web app for any Okofen Pellematic Touch owner to run on their own network. Versioning starts at 2.0.0 to stay clear of the legacy app's own 1.x tags.

### Added
- Bilingual (EN/FR) web UI: sign-in/registration (first account becomes admin), sensor history browsing, live values with control of writable tags, ECharts-based graphs, and daily/season consumption reports (degree-days, pellet usage, burner cycle counts).
- Admin sensor mapping (CSV column or live tag), boiler connection setup, and an admin-configurable synthesis config so reports work with any sensor naming, not hardcoded ones.
- Season and silo-delivery tracking for season-over-season efficiency reporting.
- Automatic scheduled ingestion from the boiler's daily CSV logs, with a dependency-triggered daily synthesis job.
- "Living System" redesign: a calm, ambient, tablet-first interface for daily use (Now/Trends/History/Settings), with an idle-screen clock/status display for a device left running in a room, responsive across phone/tablet/desktop and portrait/landscape. Admin screens (Sensors, Graphs, Synthesis) restyled to match.
- History page: overlay several sensor readings on one chart and save favorite combinations as reusable named views.
- Docker Compose deployment (`postgres` + `backend` + `frontend`), portable to any Linux Docker host (NAS, Raspberry Pi, mini PC) — see `README.md`.
- Multi-arch (amd64/arm64) container images published to GHCR on tagged releases.

### Security
- Confirmation prompts before every destructive delete action in the UI.
- Closed a first-registration race where two simultaneous sign-ups on a fresh instance could both become admin.
- Optional min/max bounds on writable live values, enforced server-side before anything is sent to the boiler.

### Fixed
- Ingestion completeness check now matches the boiler's real last-log-of-the-day timestamp instead of assuming an exact second, which had silently made daily synthesis skip every real day.
- Graphs page: a newly created graph is now selected automatically instead of silently reverting to the first one ever created.

### Licensing
- Added a `LICENSE` (PolyForm Noncommercial 1.0.0): free for personal/noncommercial use, commercial licensing available from SAS Additiz. The legacy PHP app (unlicensed upstream) is no longer distributed with this repo, kept only for local reference during development.

---

# Changelog (FR)

Historique des changements visibles pour les utilisateurs d'Okovision. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).

## [2.0.1] — 2026-09-11

### Ajouté
- Les journaux CSV bruts de la chaudière sont désormais archivés en base au fur et à mesure de leur import, afin que l'historique journalier survive à la fenêtre de rétention d'environ 4 jours de la Pellematic Touch elle-même. En cas d'arrêt de l'import plus long que cette fenêtre, ou si la logique d'analyse/correspondance des colonnes évolue par la suite, les journées passées peuvent être récupérées et retraitées depuis l'archive plutôt que d'être perdues définitivement.

## [2.0.0] — 2026-09-11

Première version publique de la réécriture d'Okovision : une refonte complète, entièrement réécrite, de l'application PHP d'origine (versions 1.x), sous forme d'application web bilingue, auto-hébergée et conteneurisée, pensée pour que tout propriétaire d'une Pellematic Touch puisse la faire tourner sur son propre réseau. Le versionnage démarre à 2.0.0 pour ne pas entrer en collision avec les tags 1.x de l'application historique.

### Ajouté
- Interface web bilingue (EN/FR) : connexion/inscription (le premier compte créé devient administrateur), historique des capteurs, valeurs temps réel avec pilotage des variables modifiables, graphiques ECharts, et bilans journaliers/saisonniers (degrés-jours, consommation de granulés, cycles du brûleur).
- Correspondance des capteurs côté admin (colonne CSV ou variable temps réel), configuration de la connexion à la chaudière, et un paramétrage des bilans par l'admin pour que les rapports fonctionnent avec n'importe quel nommage de capteurs.
- Suivi des saisons et des livraisons de granulés pour comparer l'efficacité d'une saison à l'autre.
- Récupération automatique et planifiée des journaux CSV de la chaudière, avec un calcul de bilan journalier déclenché en chaîne après l'import.
- Refonte « Living System » : une interface calme, ambiante et pensée pour la tablette au quotidien (Accueil/Tendances/Historique/Réglages), avec un écran de veille (horloge + statut) pour un appareil laissé allumé dans une pièce, responsive du téléphone au bureau, portrait comme paysage. Les écrans d'administration (Capteurs, Graphiques, Bilans) reprennent le même habillage.
- Page Historique : superposition de plusieurs mesures sur un même graphique, avec possibilité d'enregistrer des combinaisons favorites comme vues réutilisables.
- Déploiement via Docker Compose (`postgres` + `backend` + `frontend`), portable sur tout hôte Linux Docker (NAS, Raspberry Pi, mini PC) — voir `README.md`.
- Images conteneur multi-architecture (amd64/arm64) publiées sur GHCR à chaque version taguée.

### Sécurité
- Confirmation demandée avant toute suppression dans l'interface.
- Correction d'une situation de compétition à la première inscription où deux créations de compte simultanées sur une instance vierge pouvaient toutes deux devenir administrateur.
- Bornes min/max optionnelles sur les valeurs temps réel modifiables, vérifiées côté serveur avant tout envoi à la chaudière.

### Corrigé
- La vérification de complétude de l'import correspond désormais au réel horodatage de dernière ligne journalière de la chaudière plutôt que de supposer une seconde exacte, ce qui faisait échouer silencieusement le calcul des bilans sur toutes les journées réelles.
- Page Graphiques : un graphique nouvellement créé est désormais sélectionné automatiquement au lieu de revenir silencieusement au tout premier créé.

### Licence
- Ajout d'une `LICENSE` (PolyForm Noncommercial 1.0.0) : libre pour tout usage personnel/non commercial, licence commerciale disponible auprès de SAS Additiz. L'application PHP historique (non licenciée en amont) n'est plus distribuée avec ce dépôt, conservée uniquement en local pour référence pendant le développement.
