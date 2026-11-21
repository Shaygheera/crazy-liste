# Crazy Liste

Application personnelle pour rechercher et suivre films, séries et anime avec TMDB.
Tout tient dans un seul fichier : **`crazy-liste.html`** (styles et JavaScript inclus, aucune compilation, aucune police externe).

## Ouvrir l'application

**En ligne (recommandé)** : https://shaygheera.github.io/crazy-liste/ — fonctionne sur ordinateur et téléphone, avec la synchronisation.

**En local** : double-clique sur `crazy-liste.html` (Chrome ou Edge recommandés). Internet est nécessaire pour les données TMDB et les affiches. Ta bibliothèque, elle, reste disponible hors ligne.

Raccourci : la touche **/** place le curseur dans la recherche.

## Configurer TMDB

- Le code ne contient aucune clé TMDB (le dépôt est public). Colle ta clé une fois dans Réglages : connecté avec Google, tes autres appareils la reçoivent automatiquement.
- Pour utiliser ta propre clé : **Réglages › Connexion TMDB**, colle une clé API v3 (32 caractères) ou un jeton d'accès v4, puis **Tester et enregistrer**. La clé n'est enregistrée que si TMDB l'accepte.
- Une clé placée dans une page web n'est jamais secrète : elle reste lisible dans le fichier et dans le navigateur.

## Synchroniser PC et téléphone

La version publiée en ligne (GitHub Pages) peut synchroniser ta liste entre tes appareils.

- **Connexion** : Réglages › Synchronisation › **Se connecter avec Google**, avec le même compte sur chaque appareil. Ta liste et ta clé TMDB arrivent automatiquement, et chaque changement apparaît sur les autres appareils en quelques secondes, sans recharger la page.
- **Stockage** : ta liste est enregistrée dans ton projet Firebase (formule gratuite Spark, sans carte bancaire). Les règles d'accès (`firestore.rules`) réservent la lecture et l'écriture à ton compte. Chaque appareil garde aussi sa copie et fonctionne hors connexion. Les changements faits sans Internet partent au retour de la connexion.
- **Conflits** : si un même contenu est modifié sur deux appareils, la modification la plus récente l'emporte. Deux contenus différents ne se gênent jamais.
- **Se déconnecter** garde la liste sur l'appareil. **Effacer mes données**, lorsque tu es connecté, efface la liste sur tous tes appareils (une copie de secours reste dans le navigateur).
- Le fichier `crazy-liste.html` ouvert par double-clic ne se synchronise pas : la connexion Google exige une adresse web.

### Publication automatique

Chaque envoi sur la branche `main` du dépôt GitHub lance `.github/workflows/publier.yml` : tous les tests dans Chrome, puis, seulement s'ils passent, la construction de la version publique et sa mise en ligne sur GitHub Pages. On peut donc modifier l'application depuis une session Claude Code dans le cloud (claude.ai/code), ordinateur éteint.

### Préparer la version en ligne à la main

1. Mets la configuration web de ton projet Firebase dans `firebase-config.json`. Ces valeurs identifient le projet et ne sont pas secrètes.
2. Lance `npm run build:public -- firebase-config.json`. Le résultat, `public/index.html`, ne contient pas la clé TMDB intégrée et demande aux moteurs de recherche de ne pas le référencer.
3. Publie le dossier `public/` sur GitHub Pages, puis ajoute l'adresse `<pseudo>.github.io` dans Firebase › Authentication › Paramètres › Domaines autorisés.

## Tes anciennes données

- Au premier lancement, si le navigateur contient une sauvegarde d'une ancienne version (`cinelog-data`, `cinelog-ultra-data` ou `cinevault-watch`), elle est reprise automatiquement. Les anciennes clés ne sont jamais modifiées, et une copie de secours est créée (`crazy-liste-backup-legacy`).
- Seuls les vrais suivis sont repris : statuts de films, statuts explicites d'épisodes, favoris et watchlist. Les contenus que l'ancienne version ajoutait au simple affichage ne le sont pas. Le statut d'une ancienne saison n'est jamais recopié sur ses épisodes.
- Une série marquée « Vu » sans le détail de ses épisodes n'est pas cochée automatiquement. Sa fiche propose de le faire en un clic.
- Autre navigateur, ou export JSON d'une ancienne version : **Réglages › Importer un fichier JSON…**.

## Fonctionnalités

- **Accueil** : tendances, films populaires, séries/anime populaires, anime populaires, films les mieux notés, films à venir. Chaque section se charge (et peut se relancer) indépendamment.
- **Cartes** : affiche, titre, année, type, note colorée, statut personnel, synopsis, et uniquement les boutons Favori et Watchlist. Un clic sur la carte ouvre la fiche.
- **Recherche et découverte** : par titre (saisie temporisée, Entrée, réponses obsolètes ignorées), ou sans titre pour explorer tout TMDB. Filtres : Tout / Films / Séries / Anime, statut (terminés ou non, pour les séries et anime), années, genre, note TMDB minimale ; tri par popularité, note, plus récents ou plus anciens. Les filtres restent dans l'adresse (rechargement, partage). Avec un titre, TMDB n'accepte pas ces filtres : ils sont appliqués aux résultats reçus, page par page. Le tri « Mieux notés » écarte les titres avec trop peu de votes.
- **Fiche** : synopsis, dates, note TMDB, statut de production TMDB (distinct de ton suivi ; « En cours de diffusion » seulement si un prochain épisode est annoncé, sinon « Pas terminée selon TMDB · aucun épisode annoncé »), favori, watchlist, saisons et épisodes.
- **Sagas** : MCU (phases 1 à 6, Saga de l'Infini et du Multivers, Marvel Television en option), DC (DCEU puis DCU), Star Wars et MonsterVerse, en frise « serpent » (en colonne sur téléphone). Ordre de sortie ou ordre de l'histoire, filtre Films / Séries, progression, prochain titre à voir, titres à venir. Phases et ordre de l'histoire sont définis dans le code (TMDB ne les fournit pas) ; titres, dates et affiches viennent de TMDB.
- **Images** : sur la fiche, jusqu'à 10 visuels officiels du titre (pas d'images d'épisodes, pour éviter les spoilers ; sans texte en priorité), en vignettes défilantes. Un clic ouvre la visionneuse plein écran (flèches, clavier ← →, balayage sur téléphone, Échap). Un clic sur l'affiche l'affiche en grand.
- **Bande-annonce** : bouton sur la fiche quand TMDB en propose une (VF en priorité, sinon VO signalée), lue dans un lecteur YouTube intégré qui s'arrête à la fermeture. Depuis le fichier local, YouTube refuse la lecture intégrée : utilise le lien « Ouvrir sur YouTube » ou la version en ligne.
- **Suivi** : boutons À voir / En cours / Vu par épisode et par saison, « Vu jusqu'ici », « Commencer le suivi », « Tout marquer comme vu », « Tout remettre à À voir ». La plupart des actions en masse s'annulent depuis la notification.
- **Reprendre** : les 5 contenus « En cours » modifiés le plus récemment, sur la page Reprendre et dans le panneau de droite (même liste).
- **Prochain contenu lié** (panneau de droite) : prochain épisode annoncé, dernier épisode diffusé, prochain épisode à regarder, film suivant d'une collection, recommandations TMDB signalées comme telles.
- **Bibliothèque / Favoris / Watchlist** : filtres Tous / Vu / En cours / À voir, type, tri.
- **Statistiques** : Vu, En cours, Favoris, Total personnel (contenus suivis, favoris et watchlist, comptés par contenu et non par épisode).
- **Réglages** : thème sombre (par défaut) ou clair, clé TMDB, export complet, export favoris + watchlist, import (fusion ou remplacement), effacement avec copie de secours.
- **Navigation** : adresses `#home`, `#search?q=…`, `#resume`, `#library`, `#favorites`, `#watchlist`, `#settings`, `#detail/tv/123`, `#detail/movie/456`. Le rechargement et les boutons précédent/suivant fonctionnent.

## Règles de statut

- Un épisode non renseigné est « À voir ».
- Saison : **Vu** si tous ses épisodes connus sont vus, **À voir** si aucun n'est commencé, sinon **En cours**. Une saison annoncée sans épisode n'est jamais « Vu ».
- Série / anime : **Vu** uniquement si toutes les saisons régulières indiquées par TMDB sont vues. La saison 0 (épisodes spéciaux) est exclue du calcul. Une saison jamais modifiée compte « À voir », et une saison impossible à charger n'est jamais considérée comme vue.
- La numérotation absolue des anime (ex. Naruto saison 2 = épisodes 53 à 104) est respectée.
- La date d'activité (ordre de Reprendre) change seulement sur une action de suivi. Ni l'affichage, ni l'ouverture d'une fiche, ni un favori ou la watchlist ne la modifient.

## Sauvegarde

Clé du navigateur : `crazy-liste-v1`. Les données sont rangées en blocs séparés :

```
{ schemaVersion: 1,
  tracking:   { "tv-1396": { inLibrary, favorite, watchlist, trackingStatus (films), intent (séries),
                             seasons: { "1": { episodes: { "3": "seen" } } }, addedAt, lastActivityAt } },
  metadata:   { "tv-1396": { title, year, posterPath, productionStatus, seasonSummaries: [...] } },
  preferences: { theme, apiKey, filtres de bibliothèque } }
```

Une sauvegarde illisible n'est jamais écrasée sans copie (`crazy-liste-v1-illisible-…`). Un import en mode « Remplacer » conserve l'ancienne liste (`crazy-liste-backup-before-import`).

## Tests

Prérequis : Node.js 18+ et Google Chrome installé.

```
npm install
npm test                      # 99 tests : logique (Node) + scénarios dans Chrome avec TMDB et Firebase simulés
npm run test:core             # logique seule, sans navigateur
TMDB_KEY=ta-clé node tests/live-smoke.mjs   # contrôle contre la vraie API TMDB (Internet requis)
node tests/check-legacy-file.mjs chemin/vers/ancien-export.json   # aperçu d'une migration (lecture seule)
```

Les tests unitaires exécutent les blocs `<script id="crazy-core">` et `<script id="crazy-data">` extraits du HTML livré : c'est bien le code de l'application qui est testé.

## Limites connues

- Testé avec Chrome 157 (bureau, plus mobile et tablette émulés), pas sur Firefox, Safari ni un vrai téléphone.
- Sans connexion Google, les données restent dans le navigateur utilisé : passe par l'export et l'import pour changer d'appareil.
- La synchronisation a été testée avec un Firebase simulé (deux navigateurs, coupure réseau). Le vrai service Firebase sera vérifié une fois ton projet créé.
- Sur iPhone, Safari peut effacer les données d'un site non ouvert pendant 7 jours. Avec la synchronisation, la liste revient à la connexion suivante.
- « Tout marquer comme vu » charge toutes les saisons d'une série, ce qui peut prendre quelques secondes pour les très longs anime.
- « Films à venir » utilise les sorties en France (`region=FR`).
