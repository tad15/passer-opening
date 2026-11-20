const boite = document.getElementById('auto');
const sectionRapport = document.querySelectorAll('details')[1];
const grand = document.getElementById('grand');
const champMarge = document.getElementById('marge');
let lignes = [], texteRapport = '';

const mettre = function (id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = (val === undefined || val === null || val === '') ? '—' : String(val);
};

/**
 * Affiche l'état courant.
 *
 * La fenêtre se contentait de lire le stockage une fois, à son ouverture. Or la page met une à
 * deux secondes à identifier l'anime — le temps d'interroger AniList puis AniSkip. Ouverte trop
 * tôt, elle montrait un écran vide, et il fallait la fermer puis la rouvrir. Elle suit maintenant
 * les changements et se remplit toute seule.
 */
function peindreAuto(actif) {
  boite.setAttribute('aria-pressed', actif ? 'true' : 'false');
  const t = document.getElementById('autoTexte');
  if (t) t.textContent = actif ? "Saut automatique activé" : "Saut automatique désactivé";
}

function peindreGrand(actif) {
  grand.setAttribute('aria-pressed', actif ? 'true' : 'false');
  const t = document.getElementById('grandTexte');
  if (t) t.textContent = actif ? "Agrandir la vidéo : oui" : "Agrandir la vidéo : non";
}

function afficher(v) {
  const d = v.diag || {};
  mettre('site', d.site || d.hote);
  mettre('titre', d.titre);
  mettre('saison', d.saison);
  mettre('episode', d.episode);
  mettre('mal', d.mal);
  mettre('son', d.son);
  mettre('etat', d.etat || 'analyse en cours…');

  lignes = v.journal || [];
  const j = document.getElementById('journal');
  // On ne réécrit que si le texte a changé : sinon chaque tour effacerait la sélection de
  // l'utilisateur et renverrait l'ascenseur en haut, une fois par seconde.
  if (j) {
    const texte = lignes.length ? lignes.join('\n')
      : "Journal vide. Lance la lecture d'un épisode jusqu'au générique, puis rouvre cette fenêtre.";
    if (j.textContent !== texte) j.textContent = texte;
  }

  texteRapport = v.rapport || '';
  const r = document.getElementById('rapport');
  // Le rapport porte l'heure : il change à chaque seconde, et le rafraîchir pendant que
  // l'utilisateur y sélectionne du texte le lui arracherait des mains. Tant que la section est
  // ouverte, l'affichage est donc figé ; les boutons, eux, copient toujours la version du moment.
  if (r && (!sectionRapport || !sectionRapport.open || r.textContent === '—')) {
    r.textContent = texteRapport || 'Le signalement se remplit dès que la page est analysée.';
  }
}

/**
 * Où la fenêtre prend ce qu'elle affiche.
 *
 * Elle le demande à l'onglet qui est devant l'utilisateur, et à lui seul. Le réglage du saut
 * automatique, lui, vaut pour tous les onglets : il reste dans le stockage.
 *
 * On interroge le cadre principal (frameId 0) : c'est la page du site, celle qui sait de quel
 * anime il s'agit. Les lecteurs, dans leurs iframes, n'ont pas cette vue d'ensemble.
 */
let hoteCourant = '';

function demander() {
  chrome.storage.local.get({ auto: false, agrandir: false, marge: 1500 }, function (v) {
    peindreAuto(!!v.auto);
    peindreGrand(!!v.agrandir);
    // On ne réécrit pas le champ pendant que l'utilisateur y tape : le tour de rafraîchissement
    // lui reprendrait son curseur une fois par seconde.
    if (champMarge && document.activeElement !== champMarge) champMarge.value = String(v.marge);
  });
  chrome.tabs.query({ active: true, currentWindow: true }, function (onglets) {
    const t = onglets && onglets[0];
    if (!t) return muette("Aucun onglet actif.");
    chrome.tabs.sendMessage(t.id, { type: 'po-etat' }, { frameId: 0 }, function (rep) {
      if (chrome.runtime.lastError || !rep) {
        return muette("L'extension n'analyse pas cette page. Ouvre un épisode, puis rouvre cette fenêtre.");
      }
      hoteCourant = (rep.diag && rep.diag.hote) || '';
      afficher(rep);
    });
  });
}

/** Page hors de portée : pages internes du navigateur, boutique d'extensions, onglet neuf. */
function muette(raison) {
  afficher({ diag: null, journal: [], rapport: '' });
  mettre('etat', raison);
}

demander();
// L'anime met une à deux secondes à être identifié, le temps d'interroger AniList puis AniSkip :
// la fenêtre se remet à jour tant qu'elle reste ouverte, au lieu de montrer un écran vide.
setInterval(demander, 1000);

function brancherCopie(id, texte, libelle) {
  const b = document.getElementById(id);
  if (!b) return;
  b.addEventListener('click', function () {
    navigator.clipboard.writeText(texte()).then(function () {
      b.textContent = 'Copié';
      setTimeout(function () { b.textContent = libelle; }, 1500);
    }, function () { b.textContent = 'Copie refusée'; });
  });
}
brancherCopie('copier', function () { return lignes.join('\n'); }, 'Copier le journal');
brancherCopie('copierRapport', function () { return texteRapport; }, 'Copier le signalement');

const DESTINATAIRE = 'animelover.app@gmail.com';

function nomFichier() { return 'signalement.txt'; }

/** Enregistre le signalement comme fichier texte, pour pouvoir le joindre au message. */
function telecharger() {
  if (!texteRapport) return;
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([texteRapport], { type: 'text/plain;charset=utf-8' }));
  lien.download = nomFichier();
  document.body.appendChild(lien);
  lien.click();
  setTimeout(function () { URL.revokeObjectURL(lien.href); lien.remove(); }, 2000);
}

const fichier = document.getElementById('fichier');
if (fichier) fichier.addEventListener('click', telecharger);

/** Une ligne du rapport, par son intitulé : « adresse », « titre », « résultat »… */
function duRapport(cle) {
  // « épisode » vit au milieu de la ligne de la saison : on accepte aussi un début de colonne.
  const m = texteRapport.match(new RegExp('(?:^|\\s\\s)' + cle + '\\s*:\\s*([^\\n]+)', 'm'));
  return m ? m[1].trim() : '';
}

/**
 * Le corps du message.
 *
 * Aucune extension ne peut joindre un fichier à un message : ni Gmail ni aucun autre service
 * n'ouvre sa fenêtre de rédaction avec une pièce jointe, c'est une limite voulue des
 * navigateurs. Le fichier est donc téléchargé, et il reste à le glisser dans le message.
 * Le corps ne recopie plus le rapport — c'était illisible et ça faisait doublon — mais garde
 * les quelques lignes qui permettent de s'y retrouver même si la pièce jointe est oubliée.
 */
function ligneCorps() {
  const ep = duRapport('épisode');
  return [
    'Le signalement complet est dans le fichier « ' + nomFichier() + ' », qui vient d\'être',
    'téléchargé : glisse-le dans ce message avant de l\'envoyer.',
    '',
    'Page : ' + (duRapport('adresse') || '—'),
    'Anime : ' + (duRapport('titre') || '—') + (ep ? '   épisode ' + ep : ''),
    'Résultat : ' + (duRapport('résultat') || '—'),
    'Version : ' + (duRapport('version') || '—'),
    '',
    'Ce qui ne va pas, en une phrase :',
    '',
  ].join('\n');
}

/**
 * Ouvre un message pré-rempli.
 *
 * Aucun navigateur ne laisse une extension envoyer un mail toute seule, et c'est heureux :
 * l'envoi reste un geste de l'utilisateur. Tout est préparé — destinataire, objet, début du
 * rapport — il ne reste qu'à joindre le fichier qui vient d'être téléchargé.
 */
const mail = document.getElementById('mail');
if (mail) {
  mail.addEventListener('click', function () {
    telecharger();
    // Ouvrir l'onglet ferme cette fenêtre, et un téléchargement commencé l'instant d'avant
    // peut mourir avec elle : on lui laisse le temps de partir.
    const objet = "Signalement Passer l'opening" + (hoteCourant ? ' — ' + hoteCourant : '');
    const corps = ligneCorps();
    const adresse = 'https://mail.google.com/mail/?view=cm&fs=1&to=' +
      encodeURIComponent(DESTINATAIRE) + '&su=' + encodeURIComponent(objet) +
      '&body=' + encodeURIComponent(corps);
    setTimeout(function () { chrome.tabs.create({ url: adresse }); }, 400);
  });
}

boite.addEventListener('click', function () {
  const actif = boite.getAttribute('aria-pressed') !== 'true';
  peindreAuto(actif);
  chrome.storage.local.set({ auto: actif });
});

grand.addEventListener('click', function () {
  const actif = grand.getAttribute('aria-pressed') !== 'true';
  peindreGrand(actif);
  chrome.storage.local.set({ agrandir: actif });
});

if (champMarge) {
  champMarge.addEventListener('change', function () {
    // Bornée ici aussi, pas seulement dans le noyau : une valeur absurde tapée par mégarde ne
    // doit pas rester inscrite dans les réglages.
    const ms = Math.max(0, Math.min(5000, Math.round(Number(champMarge.value) || 0)));
    champMarge.value = String(ms);
    chrome.storage.local.set({ marge: ms });
  });
}
