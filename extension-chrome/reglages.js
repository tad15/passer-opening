const boite = document.getElementById('auto');
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

function afficher(v) {
  peindreAuto(!!v.auto);
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
  if (j) {
    j.textContent = lignes.length ? lignes.join('\n')
      : "Journal vide. Lance la lecture d'un épisode jusqu'au générique, puis rouvre cette fenêtre.";
  }

  texteRapport = v.rapport || '';
  const r = document.getElementById('rapport');
  if (r) r.textContent = texteRapport || 'Le signalement se remplit dès que la page est analysée.';
}

const quoi = { auto: false, diag: null, journal: [], rapport: '' };
chrome.storage.local.get(quoi, afficher);

// Le contenu arrive souvent après l'ouverture de la fenêtre : on se tient au courant.
chrome.storage.onChanged.addListener(function (changements, zone) {
  if (zone === 'local') chrome.storage.local.get(quoi, afficher);
});

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
    const d = (JSON.parse(sessionStorage.getItem('po-hote') || 'null')) || '';
    const objet = "Signalement Passer l'opening" + (d ? ' — ' + d : '');
    const corps = "Le signalement complet est dans le fichier joint (il vient d'être téléchargé).\n\n" +
      "Début du rapport :\n\n" + texteRapport.slice(0, 1200) + "\n\n[...]";
    chrome.tabs.create({ url: 'https://mail.google.com/mail/?view=cm&fs=1&to=' +
      encodeURIComponent(DESTINATAIRE) + '&su=' + encodeURIComponent(objet) +
      '&body=' + encodeURIComponent(corps) });
  });
}

boite.addEventListener('click', function () {
  const actif = boite.getAttribute('aria-pressed') !== 'true';
  peindreAuto(actif);
  chrome.storage.local.set({ auto: actif });
});
