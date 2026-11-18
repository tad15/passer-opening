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

## Sites reconnus

Quatre adaptateurs — **Anime-Sama**, **FRAnime**, **VoirAnime**, **AniZone** — plus un adaptateur
générique qui s'applique partout ailleurs. Il retrouve le numéro d'épisode dans un menu déroulant,
dans l'adresse (`/episode-12`, dernier segment de `/watch/<titre>/12`, `?ep=12`) ou dans le titre
de la page, et le titre dans `og:title`, le premier titre de niveau 1 ou celui de l'onglet.

Deux particularités valent d'être connues :

- **AniZone** ne numérote pas ses saisons, il écrit l'année — « Oshi no Ko (2024) ». Cette année
  est confrontée aux candidats d'AniList, ce qui vaut mieux que de remonter la chaîne des
  préquelles avec un numéro de saison deviné. Le site affiche aussi deux titres, anglais et
  romaji ; les deux sont tentés.
- Les sites français écrivent « **Épisode** » avec un accent. Une limite de mot JavaScript (`\b`)
  ne se forme pas devant un caractère accentué : le motif de reconnaissance ne doit donc pas en
  commencer par une.

## D'où viennent les minutages

Dans l'ordre de confiance :

1. **Les repères du lecteur**, quand le site en publie — un fichier de chapitres déclaré dans la
   page, ou une piste créée en JavaScript. Ils décrivent la copie exactement regardée, donc ils
   sont exacts et ne sont jamais recalés.
2. **AniSkip**, sinon. Ces minutages viennent d'une autre copie de l'épisode : ils sont recalés à
   l'oreille, et le saut atterrit 1,5 s avant la fin annoncée pour ne pas manger de dialogue.

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

## Le saut automatique

Il se règle depuis la fenêtre de l'extension, ou depuis le menu Tampermonkey. Le réglage vaut pour
tous les sites : dans le script Tampermonkey il est rangé par `GM_setValue`, et non dans le
stockage local de la page, qui est cloisonné par domaine — l'activer sur un site ne l'activait
alors nulle part ailleurs.

Un épisode déjà en cours garde le minutage reçu au départ : recharger la page applique le
changement tout de suite. Le journal écrit `saut automatique : activé` ou `désactivé` dès que la
page du lecteur reçoit le réglage, ce qui permet de voir d'un coup d'œil s'il est bien arrivé.

Contact : animelover.app@gmail.com
