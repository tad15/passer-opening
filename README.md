# Passer l'opening

Extension de navigateur qui affiche un bouton « Passer l'opening » — et « Passer l'ending » —
sur le lecteur vidéo des sites d'animes, au moment où le générique commence.

Les minutages viennent d'[AniSkip](https://api.aniskip.com), base publique alimentée par les
spectateurs. Comme ils se rapportent à une copie de l'épisode qui n'est pas forcément la vôtre,
l'extension les recale **en écoutant la bande-son** et n'affiche le bouton qu'une fois la musique
vraiment partie.

- Le bouton suit le plein écran.
- Mode « saut automatique », sans clic.
- Fenêtre de réglages : titre, saison, épisode, fiche trouvée, état du son.
- Journal détaillé copiable, pour signaler un générique mal détecté.

Aucune donnée personnelle collectée, rien transmis à l'auteur, aucune publicité —
voir la [politique de confidentialité](https://tad15.github.io/passer-opening/confidentialite.html).

## Ce que contient ce dépôt

| Dossier | Contenu |
|---|---|
| `source/` | `noyau.js`, le code commun, et `passer-opening.user.js`, l'enveloppe Tampermonkey |
| `extension-chrome/` | l'extension prête à charger dans Chrome (dossier non empaqueté) |
| `extension-firefox/` | la même pour Firefox : page d'événements au lieu du *service worker*, identifiant Gecko, déclaration des données collectées |
| `paquets/` | les deux `.zip` déposés dans les boutiques |
| `icones/` | l'icône, en SVG et aux quatre tailles |
| `index.html`, `confidentialite.html` | le site, publié par GitHub Pages |

`extension-chrome/contenu.js` et `extension-firefox/contenu.js` sont engendrés en insérant
`source/noyau.js` dans l'enveloppe de chaque navigateur. Le fichier livré reste lisible et
commenté : rien n'est minifié ni compacté.

## Installer sans passer par une boutique

**Chrome** — `chrome://extensions`, activer le mode développeur, « Charger l'extension non
empaquetée », choisir `extension-chrome/`.

**Tampermonkey**, sur n'importe quel navigateur — ouvrir `source/passer-opening.user.js`,
Tampermonkey propose l'installation.

Firefox refuse définitivement une extension non signée : il faut passer par la boutique.

## Comment le bouton trouve son heure

1. La page du site donne le titre de l'anime, la saison et le numéro d'épisode.
2. [AniList](https://anilist.co) convertit ce titre en identifiant MyAnimeList, en remontant la
   chaîne des préquelles pour retrouver la bonne saison.
3. AniSkip rend les minutages du générique pour cet épisode.
4. L'extension relève le niveau sonore quatre fois par seconde. À l'entrée de l'intervalle
   annoncé, elle fige le niveau « normal » des secondes précédentes, puis date le début réel de
   la musique et décale l'intervalle en conséquence.

Les seuils sont **relatifs** à ce niveau figé, jamais absolus : d'un lecteur à l'autre le dialogue
peut tourner autour de 4 ou de 40, et un seuil en dur rendait la détection impossible sur les
mixages discrets.

Contact : animelover.app@gmail.com
