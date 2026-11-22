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

### Relais TMDB (clé cachée, connexion Google suffisante)

Avec le relais, personne n'a de clé à fournir : il suffit de se connecter avec Google. Le relais est un petit serveur Cloudflare Workers (offre gratuite, dossier `relay/`) qui garde la clé TMDB en secret. Le site lui envoie le ticket de connexion Google de la personne (jeton d'identité Firebase). Le relais vérifie sa signature, le projet et l'expiration, puis interroge TMDB avec sa clé. Sans ticket valide, il refuse (401), et il ne laisse passer que les parties de TMDB utilisées par l'appli, en lecture seule.

- Mise en place (une fois, depuis `relay/`) : `npx wrangler login`, `npx wrangler deploy`, puis `npx wrangler secret put TMDB_KEY` (la clé se colle dans le terminal, elle n'est jamais dans le code).
- Ensuite, l'adresse du relais va dans `relais.json` (`{ "url": "https://…workers.dev" }`) : la publication l'insère dans le site. Sans ce fichier, le site fonctionne comme avant (chacun colle sa clé).
- Pour réserver le relais à certains comptes : `ALLOWED_EMAILS` dans `relay/wrangler.toml` (adresses séparées par des virgules), puis `npx wrangler deploy`.
- Une clé personnelle collée dans Réglages reste prioritaire : elle est utilisée directement, sans le relais.

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
- **Recherche et découverte** : par titre (saisie temporisée, Entrée, réponses obsolètes ignorées), ou sans titre pour explorer tout TMDB. Filtres : Tout / Films / Séries / Anime ; statut pour les séries et anime (terminés, en cours de diffusion = un épisode dans les 14 jours, saison annoncée dans moins de 6 mois, saison annoncée dans plus de 6 mois ou sans date, pas terminés) ; années ; genre (aussi en « Tout » : chaque genre est traduit vers son équivalent série, certains n'existent que pour les films) ; note TMDB minimale ; tri par popularité, note, plus récents ou plus anciens. Les filtres restent dans l'adresse (rechargement, partage). Avec un titre, TMDB n'accepte pas ces filtres : ils sont appliqués aux résultats reçus, page par page. Le tri « Mieux notés » écarte les titres avec trop peu de votes. Les saisons annoncées ne sont pas filtrables par TMDB : l'application vérifie la fiche de chaque série reçue et indique combien ont été écartées.
- **Fiche** : en haut, le titre, une ligne d'infos (titre original, type, saisons et épisodes, durée, date) et les boutons Bande-annonce, Favori et Watchlist ; puis la note, les genres en tags et ton suivi. Une carte sur toute la largeur résume la **diffusion** d'une série (prochain épisode et date, épisodes diffusés sur le total de la saison, dernier épisode diffusé, dernier épisode prévu et sa date, statut TMDB : « En cours de diffusion » si un épisode sort dans les 14 jours, « Suite annoncée · reprise le … » si le prochain est plus lointain, « Pas terminée selon TMDB · aucun épisode annoncé » sinon) ou la **sortie et la saga** d'un film (date, disponibilité, film précédent et suivant de la collection). Sous l'affiche : ton suivi, la note et les genres. Sous la carte, une ligne **où regarder en France** (abonnement, gratuit, location, achat, d'après JustWatch via TMDB), où les variantes d'un même service (« … with Ads », « … Amazon Channel ») sont regroupées avec le service principal. Pour une série, la carte indique aussi la **suite** et la **licence** : « Suite » quand Wikidata la confirme (« suivi par », avec le numéro TMDB exact, par exemple Naruto → Naruto Shippūden), sinon « Suite probable » d'après les fiches TMDB dont le titre commence pareil (« Boruto : … »), rangées par date ; sous l'affiche, un bouton « Licence » (nombre de séries et de films) ouvre un panneau sous la fiche : une ligne par série, dans l'ordre, avec ta progression et ses films (ceux qui reprennent son nom, sinon ceux sortis pendant sa diffusion), puis la suite annoncée. Les OVA et spéciaux reliés par AniList sont indiqués (« OVA », « Spécial ») dans le panneau et dans les films liés ; ceux sans fiche TMDB renvoient vers AniList. Le bouton Licence existe aussi sur la fiche d'un film. Hors anime, aucun rapprochement par titre (les traductions créent de faux amis, comme « Le Labyrinthe ») : la licence vient seulement de Wikidata (série P179, franchise P8345, suite / précédent) et des collections TMDB ; sans lien fiable, pas de bouton Licence ; les films d'une collection TMDB sont toujours inclus et donnent son nom à la licence. La licence est calculée une fois depuis la série racine (chaîne AniList ; depuis un film ou un OVA, sa série parente), puis gardée 3 jours dans le navigateur : chaque fiche de la licence affiche le même contenu, immédiatement. Pendant le premier calcul, le bouton indique « Recherche des séries, films et OVA… » ; un refus d'AniList (trop de requêtes) est retenté. Si Wikidata ne connaît pas le numéro AniList d'un anime, il est cherché sur AniList et retenu seulement si le titre original et l'année correspondent exactement. Au-dessus des saisons, une section « Films liés » liste les films rattachés à la série, sans avis « histoire / hors histoire » (les sources ne sont pas fiables sur ce point), avec pour chacun un bouton « Quand le regarder ? » qui lance une recherche Google. Pour les anime, la chaîne d'AniList (préquelles et suites en série) relie aussi les titres aux noms différents (Naruto → Naruto Shippūden → Boruto) ; chaque maillon est retrouvé sur TMDB par Wikidata (numéro AniList ↔ numéro TMDB, sans deviner par le titre). Une suite connue d'AniList mais absente de TMDB s'affiche « Suite annoncée », sans lien. Wikidata ne reçoit que des numéros TMDB et AniList ; AniList ne reçoit que des numéros AniList. Ensuite le résumé et ta progression côte à côte, les images, les saisons et épisodes, et « Dans le même esprit » (recommandations TMDB).
- **Disponibilité** : sur les miniatures, une étiquette indique si un film est « À venir » (avec sa date), « Au cinéma » (pas encore sorti en vidéo) ou « Disponible » (sorti en vidéo à la demande, streaming, DVD/Blu-ray ou TV en France ou aux États-Unis, d'après TMDB ; ou sorti depuis plus de 9 mois). Une case « Seulement les titres disponibles » (accueil, recherche, sagas) masque le reste. Les séries et anime ont aussi leur étiquette : « À venir » avant le premier épisode, sinon « Disponible ». Pendant la vérification d'un film récent : « Vérification… » ; si TMDB ne répond pas : « Sorti ».
- **Sagas** : MCU (phases 1 à 6, Saga de l'Infini et du Multivers, Marvel Television en option), DC (DCEU puis DCU), Star Wars et MonsterVerse, en frise « serpent » (en colonne sur téléphone). Ordre de sortie ou ordre de l'histoire, filtre Films / Séries, progression, prochain titre à voir, titres à venir. Phases et ordre de l'histoire sont définis dans le code (TMDB ne les fournit pas) ; titres, dates et affiches viennent de TMDB.
- **Images** : sur la fiche, jusqu'à 10 visuels officiels du titre (pas d'images d'épisodes, pour éviter les spoilers ; sans texte en priorité), en vignettes défilantes. Un clic ouvre la visionneuse plein écran (flèches, clavier ← →, balayage sur téléphone, Échap). Un clic sur l'affiche l'affiche en grand.
- **Bande-annonce** : bouton sur la fiche quand TMDB en propose une (VF en priorité, sinon VO signalée), lue dans un lecteur YouTube intégré qui s'arrête à la fermeture. Depuis le fichier local, YouTube refuse la lecture intégrée : utilise le lien « Ouvrir sur YouTube » ou la version en ligne.
- **Suivi** : boutons À voir / En cours / Vu par épisode et par saison, « Vu jusqu'ici », « Commencer le suivi », « Tout marquer comme vu », « Tout remettre à À voir ». La plupart des actions en masse s'annulent depuis la notification.
- **Reprendre** : les 5 contenus « En cours » modifiés le plus récemment, sur la page Reprendre et dans le panneau de droite (même liste).
- **Bibliothèque / Favoris / Watchlist** : filtres Tous / Vu / En cours / À voir, type, tri.
- **À venir** : prochains épisodes des séries et anime de ta liste (suivis, favoris, watchlist), saisons annoncées et sorties des films pas encore vus, regroupés (aujourd'hui, cette semaine, dans le mois, plus tard, date non annoncée) avec « dans 3 jours », « dans 2 mois »… Les fiches sont relues sur TMDB à chaque visite de la page (bouton Actualiser).
- **Statistiques** : dans le panneau de droite, Vu, En cours, Favoris, Total personnel. Page détaillée (onglet de Ma liste) : temps passé devant l'écran (films vus + épisodes vus × durée d'un épisode ; durées manquantes récupérées sur TMDB), films vus, épisodes vus, séries terminées, genres préférés, titres terminés par mois sur 12 mois. La date de fin est enregistrée au passage à « Vu » ; pour les titres vus avant cette fonctionnalité, c'est la date de dernière activité.
- **Réglages** (sur téléphone : icône en haut à droite) : thème sombre (par défaut) ou clair, clé TMDB, export complet, export favoris + watchlist, import (fusion ou remplacement), effacement avec copie de secours.
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
npm test                      # 156 tests : logique (Node) + scénarios dans Chrome avec TMDB et Firebase simulés
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
