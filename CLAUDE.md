# Crazy Liste : consignes pour Claude

- Réponds en français, en tutoyant l'utilisateur.
- L'application tient dans `crazy-liste.html` (sans clé TMDB : le dépôt est public). Voir le README pour l'architecture.
- Lance `npm test` avant tout envoi ; ajoute des tests pour chaque nouveauté.
- Un envoi sur `main` publie le site automatiquement (`.github/workflows/publier.yml`) si les tests passent sur GitHub. Vérifie que l'exécution GitHub Actions a réussi avant d'annoncer la publication.
- **À la fin de chaque republication, termine ton message par le lien du site** pour que l'utilisateur essaie tout de suite : https://shaygheera.github.io/crazy-liste/ (avec l'ancre de la page concernée si utile, par exemple `#sagas`).
