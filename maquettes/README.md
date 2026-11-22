# Maquettes de la refonte UI/UX

Propositions de design pour Crazy Liste, dans l'ordre où elles ont été présentées. Rien de ce dossier n'est publié sur le site : il vit sur la branche `refonte-ui`.

Chaque dossier contient la maquette (`maquette.html`, à ouvrir dans un navigateur ; les affiches viennent de TMDB) et ses captures (`.png`).

| Dossier | Proposition | Avis |
|---|---|---|
| `00-site-actuel/` | Le site tel qu'il est en ligne (captures avec les données de test) | Référence |
| `01-streaming-rejetee/` | Première refonte, façon plateforme de streaming | Rejetée : oubliait le suivi, les notes, etc. |
| `02-suivi/` | Refonte centrée sur le suivi (accueil « Mon suivi », liste, fiche) | Il manquait encore beaucoup d'infos du site |
| `03-refonte-suisse/` | Le vrai site restylé (Swiss Modernism sombre) ; le code est dans `crazy-liste.html` sur cette branche | « Ça fait très IA » |
| `04-trois-directions/` | A Éditorial (1-2), B Carnet (3-4), C Néo-brutal (5-6) | « Pas très moderne, ça fait ancien » |
| `05-immersive-v1/` | Immersive : couleurs tirées de l'image du titre, verre translucide, logo officiel | « J'aime mieux », mais trop d'arrondis et trop de place perdue |
| `06-immersive-v2/` | Immersive resserrée : arrondis réduits, panneaux collés aux bords | La préférée à ce jour |

## Outils

- `outils/shot2.mjs` : capture chaque `.frame` d'une maquette (`node maquettes/outils/shot2.mjs <racine> <maquette.html> <préfixe>`).
- `outils/capture-compare.mjs` : captures de toutes les pages du vrai site avec le TMDB simulé des tests (`node maquettes/outils/capture-compare.mjs <racine> <crazy-liste.html> <dossier>`).
- `outils/compose.mjs` : assemble des comparaisons avant / après côte à côte.

Le skill UI/UX Pro Max utilisé pour ces choix est dans `.claude/skills/ui-ux-pro-max/` (licence MIT).
