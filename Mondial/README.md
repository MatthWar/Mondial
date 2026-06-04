# Mondial Classe

Mini-site Netlify pour creer un salon de jeu, repartir les equipes entre joueurs et suivre les points du Mondial.

## Ce que fait l'application

- Creation d'un salon pour plusieurs joueurs.
- Ponderation de chaque equipe entre 1 et 100.
- Attribution du maximum d'equipes possible avec le meme nombre d'equipes par joueur.
- Repartition equilibree selon la somme des ponderations.
- Page de classement partageable par lien.
- Mise a jour quotidienne des scores a 17h heure du Mexique via une fonction planifiee Netlify.

## Deploiement Netlify

1. Publier ce dossier sur Netlify.
2. Dans Netlify, ajouter la variable d'environnement `FOOTBALL_DATA_TOKEN`.
3. Creer une cle gratuite sur `football-data.org`, puis coller la cle dans cette variable.
4. Deployer le site.

La fonction planifiee est reglee sur `0 23 * * *`, ce qui correspond a 17h a Mexico en heure standard du centre. Les scores suivent la regle : victoire 3 points, nul 1 point, defaite 0 point.

## Test local

Le site fonctionne localement en interface simple. Sans Netlify, les salons sont gardes dans le navigateur local. Une fois deployee, l'application utilise Netlify Blobs pour que tous les joueurs voient le meme salon.
