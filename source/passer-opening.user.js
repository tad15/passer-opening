// ==UserScript==
// @name         Passer l'opening — Anime-Sama, FRAnime, VoirAnime
// @namespace    https://github.com/tad15
// @version      3.17
// @description  Bouton « Passer l'opening » et « Passer l'ending » sur les lecteurs des sites d'animes, avec les minutages d'AniSkip.
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      graphql.anilist.co
// @connect      api.aniskip.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const MEM = 'passer-opening:';
  /**
   * Le saut automatique se range dans le stockage de Tampermonkey, pas dans celui de la page.
   *
   * localStorage est cloisonné par domaine : activer le réglage sur anime-sama ne l'activait pas
   * sur voiranime ni ailleurs, alors que le menu laisse croire à un réglage unique. GM_getValue
   * est partagé par tous les sites. L'ancien stockage sert encore de repli, et de reprise pour
   * ceux qui avaient déjà activé le réglage.
   */
  function auto() {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue('auto', false) === true;
    } catch (e) { /* repli ci-dessous */ }
    try { return localStorage.getItem(MEM + 'auto') === 'true'; } catch (e) { return false; }
  }

  function poserAuto(valeur) {
    try { if (typeof GM_setValue === 'function') GM_setValue('auto', !!valeur); } catch (e) { /* repli */ }
    try { localStorage.setItem(MEM + 'auto', String(!!valeur)); } catch (e) { /* page sans stockage */ }
  }

  if (typeof GM_registerMenuCommand === 'function' && window.top === window.self) {
    GM_registerMenuCommand('Saut automatique : ' + (auto() ? 'oui' : 'non') + ' — cliquer pour changer', function () {
      const neuf = !auto();
      poserAuto(neuf);
      alert('Saut automatique : ' + (neuf ? 'activé' : 'désactivé') + '.\n\n' +
            'Ce réglage vaut maintenant pour tous les sites. Recharge la page en cours pour qu\'il s\'applique tout de suite.');
    });
  }

  let DIAG = { etat: 'pas encore analysé' };
  function diag(d) { DIAG = d; }

  // Journal : l'utilisateur ne peut pas me lire la console, il doit pouvoir copier le détail.
  let LIGNES = [];
  function journal(l) { LIGNES = l; }

  let RAPPORT = null;
  function exposerRapport(fn) { RAPPORT = fn; }

  const DESTINATAIRE = 'animelover.app@gmail.com';

  function nomFichier() { return 'signalement.txt'; }

  /** Enregistre le signalement comme fichier texte, pour pouvoir le joindre au message. */
  function telecharger(texte) {
    try {
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(new Blob([texte], { type: 'text/plain;charset=utf-8' }));
      lien.download = nomFichier();
      document.body.appendChild(lien);
      lien.click();
      setTimeout(function () { URL.revokeObjectURL(lien.href); lien.remove(); }, 2000);
    } catch (e) { alert("Le téléchargement a échoué : copie le texte à la main."); }
  }

  /**
   * Ouvre un message pré-rempli.
   *
   * Aucun navigateur ne laisse une extension envoyer un mail toute seule, et c'est heureux :
   * l'envoi reste un geste de l'utilisateur. On prépare donc tout — destinataire, objet, début du
   * rapport — et il ne reste qu'à joindre le fichier et cliquer sur Envoyer.
   */
  function envoyerMail(texte) {
    const objet = "Signalement Passer l'opening — " + location.hostname;
    const corps = "Le signalement complet est dans le fichier joint (il vient d'être téléchargé).\n\n" +
      "Début du rapport :\n\n" + texte.slice(0, 1200) + "\n\n[...]";
    const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(DESTINATAIRE) +
      '&su=' + encodeURIComponent(objet) + '&body=' + encodeURIComponent(corps);
    const f = window.open(gmail, '_blank');
    if (!f) location.href = 'mailto:' + DESTINATAIRE + '?subject=' + encodeURIComponent(objet) +
      '&body=' + encodeURIComponent(corps);
  }

  function montrerJournal() { montrerTexte("Journal (" + LIGNES.length + ' lignes)', LIGNES.join('\n') ||
    "Journal vide. Lance la lecture d'un épisode, laisse tourner jusqu'au générique, puis rouvre ce menu."); }

  function montrerSignalement() {
    if (!RAPPORT) { alert("Le signalement n'est pas encore prêt : attends que la page soit analysée."); return; }
    const texte = RAPPORT();
    montrerTexte('Signalement — télécharge le fichier, puis joins-le au message', texte, texte);
  }

  function montrerTexte(titreTexte, contenu, pourTicket) {
    const ancien = document.getElementById('po-journal');
    if (ancien) ancien.remove();
    const texte = contenu;

    const fond = document.createElement('div');
    fond.id = 'po-journal';
    fond.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'background:rgba(0,0,0,.72)',
      'display:flex', 'align-items:center', 'justify-content:center', 'padding:24px',
      'font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ].join(';'));

    const boite = document.createElement('div');
    boite.setAttribute('style', [
      'background:#17171c', 'color:#eceaf3', 'border-radius:16px', 'padding:18px',
      'width:min(760px,100%)', 'max-height:84vh', 'display:flex', 'flex-direction:column', 'gap:12px',
      'box-shadow:0 12px 48px rgba(0,0,0,.6)'
    ].join(';'));

    const titre = document.createElement('div');
    titre.textContent = "Passer l'opening — " + titreTexte;
    titre.setAttribute('style', 'font-weight:700;font-size:16px');

    const zone = document.createElement('textarea');
    zone.readOnly = true;
    zone.value = texte;
    zone.setAttribute('style', [
      'flex:1', 'min-height:320px', 'resize:none', 'background:#0e0e12', 'color:#d7d7e0',
      'border:1px solid #2c2c36', 'border-radius:10px', 'padding:10px',
      'font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', 'white-space:pre'
    ].join(';'));

    const barre = document.createElement('div');
    barre.setAttribute('style', 'display:flex;gap:10px;justify-content:flex-end');

    const style = [
      'height:38px', 'padding:0 16px', 'border:0', 'border-radius:999px', 'cursor:pointer',
      'font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ];
    const copier = document.createElement('button');
    copier.textContent = 'Copier';
    copier.setAttribute('style', style.concat(['background:linear-gradient(135deg,#FF5F8A,#993953)', 'color:#fff']).join(';'));
    copier.addEventListener('click', function () {
      const fini = function () { copier.textContent = 'Copié'; setTimeout(function () { copier.textContent = 'Copier'; }, 1500); };
      try {
        navigator.clipboard.writeText(zone.value).then(fini, function () { zone.select(); document.execCommand('copy'); fini(); });
      } catch (e) { zone.select(); document.execCommand('copy'); fini(); }
    });

    const fermer = document.createElement('button');
    fermer.textContent = 'Fermer';
    fermer.setAttribute('style', style.concat(['background:#2c2c36', 'color:#eceaf3']).join(';'));
    fermer.addEventListener('click', function () { fond.remove(); });

    if (pourTicket) {
      const fichier = document.createElement('button');
      fichier.textContent = 'Télécharger le fichier';
      fichier.setAttribute('style', style.concat(['background:#2c2c36', 'color:#eceaf3']).join(';'));
      fichier.addEventListener('click', function () { telecharger(pourTicket); });
      barre.appendChild(fichier);

      const mail = document.createElement('button');
      mail.textContent = 'Préparer le mail';
      mail.setAttribute('style', style.concat(['background:#2c2c36', 'color:#eceaf3']).join(';'));
      mail.addEventListener('click', function () { telecharger(pourTicket); envoyerMail(pourTicket); });
      barre.appendChild(mail);
    }
    barre.appendChild(copier); barre.appendChild(fermer);
    boite.appendChild(titre); boite.appendChild(zone); boite.appendChild(barre);
    fond.appendChild(boite);
    fond.addEventListener('click', function (e) { if (e.target === fond) fond.remove(); });
    document.body.appendChild(fond);
  }

  if (typeof GM_registerMenuCommand === 'function' && window.top === window.self) {
    GM_registerMenuCommand('Signaler un problème (tout est rassemblé)', montrerSignalement);
    GM_registerMenuCommand('Journal : copier le détail', montrerJournal);
    GM_registerMenuCommand('Diagnostic : pourquoi pas de bouton ?', function () {
      const d = DIAG || {};
      alert(
        'Passer l\'opening — diagnostic\n\n' +
        'Site reconnu : ' + (d.site || '?') + '\n' +
        'Titre lu : ' + (d.titre || '—') + '\n' +
        'Saison : ' + (d.saison === undefined ? '—' : d.saison) + '\n' +
        'Épisode : ' + (d.episode === undefined ? '—' : d.episode) + '\n' +
        'Fiche MyAnimeList : ' + (d.mal || '—') + '\n' +
        'Son du lecteur : ' + (d.son || '—') + '\n' +
        'Saut automatique : ' + (auto() ? 'activé' : 'désactivé') + '\n\n' +
        'Résultat : ' + (d.etat || '—')
      );
    });
  }

  function json(url, options) {
    return new Promise(function (resolve) {
      const fini = function (t) { try { resolve(JSON.parse(t)); } catch (e) { resolve(null); } };
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: (options && options.method) || 'GET', url: url,
          headers: Object.assign({ Accept: 'application/json' }, (options && options.headers) || {}),
          data: options && options.body, timeout: 15000,
          onload: function (r) { fini(r.responseText); },
          onerror: function () { resolve(null); }, ontimeout: function () { resolve(null); },
        });
      } else {
        fetch(url, options).then(function (r) { return r.text(); }).then(fini).catch(function () { resolve(null); });
      }
    });
  }

  const NOYAU = /*
 * Passer l'opening — noyau commun au script Tampermonkey et à l'extension Chrome.
 *
 * Les sites d'animes n'affichent pas la vidéo eux-mêmes : ils l'encadrent dans une page d'un autre
 * domaine (ansembed.net, voembed.net, uqload…). La balise <video> est donc dans cette page-là, pas
 * dans celle du site. Le code tourne des deux côtés et se partage le travail :
 *
 *   - Dans la page du site : il lit le titre de l'anime, la saison et l'épisode choisi, demande
 *     l'identifiant MyAnimeList à AniList, puis les minutages à AniSkip, et les envoie au lecteur.
 *   - Dans la page du lecteur : il reçoit ces minutages, surveille la lecture et affiche le bouton
 *     au bon moment.
 *
 * Les minutages viennent d'AniSkip (api.aniskip.com), la base communautaire qu'utilise aussi
 * l'application AnimeLover. L'enveloppe (Tampermonkey ou extension) fournit deux fonctions :
 *   PO_REGLAGES.json(url, options)  → requête vers une API externe, rend un objet
 *   PO_REGLAGES.auto()             → true si le saut doit se faire sans bouton
 */

(function (reglages) {
  'use strict';

  const CLE = 'passer-opening-v1';

  /**
   * Traces d'exécution.
   *
   * Le journal dit ce qui s'est passé ; les traces disent ce que ça a coûté et ce que les
   * services ont exactement répondu. Les deux ensemble suffisent à comprendre une panne sans
   * avoir à redemander quoi que ce soit à l'utilisateur.
   */
  const TRACES = { debut: Date.now(), appels: [], erreurs: [] };
  function tracer(nom, debut, resume) {
    TRACES.appels.push({ nom: nom, ms: Date.now() - debut, resume: String(resume).slice(0, 120) });
    if (TRACES.appels.length > 40) TRACES.appels.shift();
  }
  function tracerErreur(ou, e) {
    TRACES.erreurs.push(ou + ' : ' + ((e && e.message) || String(e)).slice(0, 140));
    if (TRACES.erreurs.length > 12) TRACES.erreurs.shift();
  }

  /**
   * Journal de bord.
   *
   * Le bouton dépend de trop de choses invisibles — analyseur branché ou non, minutages reçus,
   * niveau sonore relevé — pour qu'un décalage se diagnostique à l'œil. Chaque étape y laisse une
   * ligne, que l'utilisateur peut copier d'un bouton et envoyer telle quelle.
   *
   * La page du lecteur fait l'essentiel du travail mais n'a pas d'interface ; elle envoie donc ses
   * lignes à la page du site, qui les garde toutes.
   */
  /** « 23:41:07 » : une horloge commune aux deux pages, pour remettre les lignes en ordre. */
  function horodate() {
    const d = new Date();
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  const JOURNAL = {
    lignes: [],
    ligne: function (texte) {
      const ou = (window.top === window.self) ? 'site' : 'lecteur';
      // L'heure est posée à l'écriture, pas à la réception : les lignes du lecteur arrivent par
      // message et pourraient se présenter dans un autre ordre. Sans elle, « reconnu puis plus
      // reconnu » reste illisible — on ne sait pas ce qui s'est passé entre les deux.
      const l = '[' + horodate() + '] [' + ou + '] ' + texte;
      if (ou === 'lecteur') {
        try { window.top.postMessage({ cle: CLE, type: 'journal', ligne: l }, '*'); } catch (e) { /* ignore */ }
      } else {
        this.recevoir(l);
      }
    },
    recevoir: function (l) {
      this.lignes.push(l);
      if (this.lignes.length > 400) this.lignes.shift();
      if (typeof reglages.journal === 'function') reglages.journal(this.lignes);
    }
  };
  const MEM = 'passer-opening:';

  const json = reglages.json;
  function anilist(query, variables) {
    return json('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, variables: variables }),
    });
  }

  function lire(cle) { try { return JSON.parse(localStorage.getItem(MEM + cle)); } catch (e) { return null; } }
  function ecrire(cle, v) { try { localStorage.setItem(MEM + cle, JSON.stringify(v)); } catch (e) { /* plein */ } }

  // -------------------------------------------------- reconnaissance du site

  /**
   * Détache du titre ce qui désigne la saison ou la langue, dans les écritures qu'emploient les
   * trois sites : « Ao ashi Saison 2 », « Sousou no Frieren 2 », « Blue Box S2 », « … (VF) »,
   * « Kusuriya no Hitorigoto 2nd Season », « Vinland Saga Part 2 ».
   * Rend { titre, saison } — saison vaut 0 quand le titre n'en dit rien.
   */
  function separerSaison(brut) {
    let t = String(brut || '').replace(/\((?:vf|vostfr|vo|va|fr)\)/ig, ' ')
      .replace(/\s+/g, ' ').trim();
    let saison = 0;

    // « Saison 2 », « Season 2 », « Partie 2 », « Cour 2 », « S2 » en fin de titre
    const mots = t.match(/\s(?:saisons?|seasons?|parties?|parts?|cours?)\s*(\d{1,2})\s*$/i);
    if (mots) { saison = parseInt(mots[1], 10); t = t.slice(0, mots.index).trim(); }
    if (!saison) {
      const court = t.match(/\s[sS](\d{1,2})\s*$/);
      if (court) { saison = parseInt(court[1], 10); t = t.slice(0, court.index).trim(); }
    }
    // « 2nd Season », « 3rd Season », « 2ème saison »
    if (!saison) {
      const rang = t.match(/\s(\d{1,2})\s*(?:nd|rd|th|st|e|ème|eme)\s+(?:season|saison)\s*$/i);
      if (rang) { saison = parseInt(rang[1], 10); t = t.slice(0, rang.index).trim(); }
    }
    // enfin un simple nombre collé au titre : « Sousou no Frieren 2 ».
    // Jamais sur trois chiffres (Mob Psycho 100) ni sur un titre qui n'est qu'un nombre (86).
    if (!saison) {
      const nu = t.match(/^(.*\S{2,})\s+(\d{1,2})$/);
      if (nu) {
        const n = parseInt(nu[2], 10);
        if (n >= 1 && n <= 9) { saison = n; t = nu[1].trim(); }
      }
    }
    t = t.replace(/[\s\-–:,]+$/, '').trim();
    return { titre: t, saison: saison };
  }

  /** Un adaptateur par site : il rend { titre, saison, episode } lu dans la page. */
  const SITES = [
    {
      nom: 'Anime-Sama',
      reconnait: function (h) { return /(^|\.)anime-sama\./i.test(h); },
      infos: function () {
        // /catalogue/frieren/saison1/vostfr/  + le menu #selectEpisodes
        const m = location.pathname.match(/\/catalogue\/([^/]+)\/(saison(\d+)|film)/i);
        if (!m) return null;
        const t = (document.querySelector('#titreOeuvre') || {}).textContent;
        const sel = document.querySelector('#selectEpisodes');
        let ep = 1;
        if (sel && sel.selectedOptions && sel.selectedOptions[0]) {
          const n = (sel.selectedOptions[0].textContent || '').match(/(\d+)/);
          ep = n ? parseInt(n[1], 10) : sel.selectedIndex + 1;
        }
        // Anime-Sama affiche sous le titre principal ses équivalents anglais et romaji :
        // « The Apothecary Diaries, Kusuriya no Hitorigoto, … ». Quand le titre principal est en
        // français, ce sont eux qu'AniList reconnaîtra.
        const alt = ((document.querySelector('#titreAlter') || {}).textContent || '')
          .split(',').map(function (x) { return x.trim(); })
          .filter(function (x) { return x.length >= 3; }).slice(0, 5);
        const net = separerSaison(t || m[1].replace(/-/g, ' '));
        return {
          titre: net.titre, slug: m[1], alternatifs: alt,
          // La page de la saison ne porte pas les titres équivalents : ils sont sur la fiche du
          // catalogue. On n'ira les y chercher que si tout le reste a échoué.
          fiche: '/catalogue/' + m[1] + '/',
          saison: m[3] ? parseInt(m[3], 10) : 1, episode: ep,
        };
      },
    },
    {
      nom: 'FRAnime',
      reconnait: function (h) { return /(^|\.)franime\./i.test(h); },
      infos: function () {
        // /anime/blue-box?s=1&ep=1&lang=vo  — saison et épisode sont dans l'adresse
        const m = location.pathname.match(/\/anime\/([^/?#]+)/i);
        if (!m) return null;
        const p = new URLSearchParams(location.search);
        const ep = parseInt(p.get('ep') || '0', 10);
        if (!ep) return null;
        const og = (document.querySelector('meta[property="og:title"]') || {}).content || document.title;
        // « Blue Box S1 EP1 VOSTFR - FRAnime… »
        let titre = String(og).split(/\s+S\d+\s*EP\s*\d+/i)[0].trim();
        if (!titre) titre = m[1].replace(/-/g, ' ');
        const net = separerSaison(titre);
        return {
          titre: net.titre, slug: m[1],
          saison: parseInt(p.get('s') || '1', 10) || net.saison || 1, episode: ep,
        };
      },
    },
    {
      nom: 'VoirAnime',
      reconnait: function (h) { return /(^|\.)voiranime\./i.test(h); },
      infos: function () {
        // /anime/sousou-no-frieren-2-vf/sousou-no-frieren-2-01-vf/
        if (!/\/anime\//.test(location.pathname)) return null;
        const fil = Array.prototype.map.call(
          document.querySelectorAll('[class*=breadcrumb] a'), function (a) { return a.textContent.trim(); }
        ).filter(Boolean);
        let brut = fil.length ? fil[fil.length - 1] : String(document.title).split(' - ')[0];
        const net = separerSaison(brut);
        brut = net.titre;
        const saison = net.saison || 1;

        const ch = document.querySelector('select.single-chapter-select');
        let ep = 0;
        if (ch && ch.selectedOptions && ch.selectedOptions[0]) {
          ep = parseInt((ch.selectedOptions[0].textContent || '').replace(/\D+/g, ''), 10) || 0;
        }
        if (!ep) {
          const u = location.pathname.match(/-(\d{1,4})-(?:vf|vostfr)\/?$/i);
          if (u) ep = parseInt(u[1], 10);
        }
        if (!ep) return null;
        const seg = location.pathname.split('/').filter(Boolean);
        const i = seg.indexOf('anime');
        return { titre: brut, slug: i >= 0 && seg[i + 1] ? seg[i + 1] : '', saison: saison, episode: ep };
      },
    },
    {
      nom: 'AniZone',
      reconnait: function (h) { return /(^|\.)anizone\./i.test(h); },
      infos: function () {
        // AniZone écrit deux titres différents : le titre de niveau 1 est en anglais
        // (« The Ramparts of Ice »), celui de l'onglet en romaji (« Koori no Jouheki »). On lit
        // les deux : si AniList ne connaît pas le premier, le second le rattrape.
        //
        // L'année entre parenthèses n'apparaît que sur les séries à plusieurs saisons
        // (« Oshi no Ko (2024) »). Elle est donc facultative — l'exiger faisait échouer la
        // reconnaissance sur tous les animes d'une seule saison.
        const u = location.pathname.match(/\/anime\/[^/]+\/(\d{1,4})\b/);
        let ep = u ? parseInt(u[1], 10) : 0;

        const lire = function (brut) {
          let t = String(brut || '').replace(/\s+/g, ' ').trim();
          t = t.replace(/\s*[—–-]\s*AniZone\s*$/i, '');
          const e = t.match(/Episode\s*(\d{1,4})/i);
          if (e && !ep) ep = parseInt(e[1], 10);
          t = t.replace(/^\s*Episode\s*\d{1,4}\s*[-–—]\s*/i, '')
               .replace(/\s*[-–—]\s*Episode\s*\d{1,4}\s*$/i, '').trim();
          // l'année se retire avant les guillemets : « "Oshi no Ko" (2024) » laisserait sinon
          // un guillemet collé au titre, qu'AniList ne reconnaîtrait pas.
          const an = t.match(/\((\d{4})\)\s*$/);
          t = t.replace(/\s*\(\d{4}\)\s*$/, '').replace(/^["«“]+|["»”]+$/g, '').trim();
          return { titre: t, annee: an ? parseInt(an[1], 10) : 0 };
        };

        const a = lire((document.querySelector('h1') || {}).textContent);
        const b = lire(document.title);
        const principal = a.titre || b.titre;
        if (!ep || !principal) return null;
        const net = separerSaison(principal);
        if (!net.titre) return null;

        const autres = [];
        [b.titre, a.titre].forEach(function (x) {
          if (x && x !== principal) { const n = separerSaison(x).titre; if (n) autres.push(n); }
        });
        const out = { titre: net.titre, alternatifs: autres, saison: net.saison || 0, episode: ep };
        const annee = a.annee || b.annee;
        if (annee) out.annee = annee;
        return out;
      },
    },
    {
      nom: 'générique',
      reconnait: function () { return true; },
      infos: function () {
        let ep = 0;
        const menus = document.querySelectorAll('select');
        for (let i = 0; i < menus.length; i++) {
          const s = menus[i];
          const premier = s.options[0] ? s.options[0].textContent : '';
          if (/[ée]pisode/i.test(premier)) {
            const n = ((s.selectedOptions[0] || {}).textContent || '').match(/(\d+)/);
            ep = n ? parseInt(n[1], 10) : s.selectedIndex + 1;
            break;
          }
        }
        if (!ep) {
          const u = location.href.match(/[-/_](?:episode|ep)[-_]?(\d{1,4})\b/i);
          if (u) ep = parseInt(u[1], 10);
        }
        if (!ep) {
          // /watch/saga-of-tanya-the-evil/4 — le dernier segment EST le numéro d'épisode.
          // On ne l'accepte que derrière un mot connu, pour ne pas prendre une année ou un
          // identifiant pour un épisode.
          const seg = location.pathname.match(/^\/(?:watch|anime|episode|voir|serie|series)\/[^/]+\/(\d{1,4})\/?$/i);
          if (seg) ep = parseInt(seg[1], 10);
        }
        if (!ep) {
          // Beaucoup de sites rangent l'épisode dans la partie « ? » de l'adresse : ?ep=1
          try {
            const q = new URLSearchParams(location.search);
            const n = q.get('ep') || q.get('episode') || q.get('numero');
            if (n && /^\d{1,4}$/.test(n)) ep = parseInt(n, 10);
          } catch (e) { /* adresse exotique */ }
        }
        if (!ep) {
          // Beaucoup de sites ne mettent rien dans l'adresse mais écrivent « Episode 12 » en
          // toutes lettres dans le titre de la page ou le titre de l'onglet.
          const texte = (((document.querySelector('h1') || {}).textContent || '') + ' ' + document.title)
            .replace(/\s+/g, ' ');
          // Pas de \b devant la classe : en JavaScript, une limite de mot ne se forme pas
          // entre une espace et un « É ». « Épisode 4 » échappait au motif pour cette seule
          // raison, alors que « Episode 4 » passait.
          const e = texte.match(/(?:^|[^A-Za-z0-9])(?:[ÉéEe]pisodes?|ep)\.?\s*(\d{1,4})(?![0-9])/);
          if (e) ep = parseInt(e[1], 10);
        }
        if (!ep) return null;
        const s = location.href.match(/\bsaison[-_]?(\d{1,2})|\bseason[-_]?(\d{1,2})|\bs(\d{1,2})e\d/i);
        const saison = s ? parseInt(s[1] || s[2] || s[3], 10) : 1;
        const og = document.querySelector('meta[property="og:title"]');
        let titre = (og && og.content) || (document.querySelector('h1') || {}).textContent || document.title;
        titre = String(titre).split(/[|–—·]|\s-\s/)[0]
          .replace(/(?:^|[^A-Za-z0-9])[ÉéEe]pisodes?\.?\s*\d{1,4}/g, ' ')
          .replace(/\b(vostfr|vf|vo|va|streaming|en\s+ligne|s\d+\s*e\d+)\b/gi, ' ')
          .replace(/\s+/g, ' ').trim();
        const net = separerSaison(titre);
        if (!net.titre) return null;
        const an = String(titre).match(/\((\d{4})\)/);
        if (an) return { titre: net.titre.replace(/\s*\(\d{4}\)\s*/, ' ').trim(),
                         saison: saison || net.saison || 0, annee: parseInt(an[1], 10), episode: ep };
        return { titre: net.titre, saison: saison || net.saison || 1, episode: ep };
      },
    },
  ];

  // ------------------------------------------------ identifiant MyAnimeList

  /**
   * Plusieurs façons de demander le même anime. La recherche d'AniList est exigeante : elle ne
   * relie pas « Sukina » (Anime-Sama) à « Suki na » (AniList), et rend alors « Not Found » sur un
   * titre pourtant complet et juste. Une requête plus courte, bâtie sur les mots distinctifs,
   * retombe sur la bonne fiche. Les titres qui marchent du premier coup ne coûtent rien de plus :
   * la liste s'arrête dès qu'une variante répond.
   */
  function variantes(titre) {
    const net = titre.replace(/[.,;:!?'"()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const mots = net.split(' ');
    const out = [titre, net];
    const longs = mots.slice().sort(function (a, b) { return b.length - a.length; }).slice(0, 3);
    out.push(mots.filter(function (m) { return longs.indexOf(m) >= 0; }).join(' '));
    for (let i = 1; i <= 3 && mots.length - i >= 2; i++) out.push(mots.slice(i).join(' '));
    for (let i = 1; i <= 2 && mots.length - i >= 2; i++) out.push(mots.slice(0, mots.length - i).join(' '));
    const vus = {}, propre = [];
    for (let i = 0; i < out.length; i++) {
      const v = out[i].trim();
      if (v.length >= 3 && !vus[v.toLowerCase()]) { vus[v.toLowerCase()] = 1; propre.push(v); }
    }
    return propre;
  }

  /** Titres équivalents listés sur la fiche d'un site (« The Apothecary Diaries, Kusuriya no… »). */
  async function titresDeLaFiche(adresse) {
    const cle = 'fiche:' + adresse;
    const cache = lire(cle);
    if (cache) return cache;
    let out = [];
    try {
      const html = await fetch(adresse, { credentials: 'same-origin' }).then(function (r) { return r.text(); });
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const brut = ((doc.querySelector('#titreAlter') || {}).textContent || '');
      out = brut.split(',').map(function (x) { return x.trim(); })
        .filter(function (x) { return x.length >= 3; }).slice(0, 5);
    } catch (e) { out = []; }
    ecrire(cle, out);
    return out;
  }

  async function baseAniList(titre, slug, alternatifs, fiche) {
    const cle = 'al:' + titre.toLowerCase() + '|' + (slug || '');
    const cache = lire(cle);
    if (cache) return cache;
    const q = 'query($s:String){ Media(search:$s, type:ANIME, sort:SEARCH_MATCH){ id idMal } }';
    // Le titre affiché peut être en français — « Les Carnets de l'Apothicaire » — et AniList ne le
    // connaît que si quelqu'un l'a ajouté en synonyme. Le raccourci de l'adresse, lui, est presque
    // toujours en romaji ou en anglais : c'est notre deuxième chance.
    // Dans l'ordre : le titre tel quel, les titres équivalents donnés par le site, les
    // raccourcis du titre, puis le raccourci de l'adresse — presque toujours en romaji ou en anglais.
    let essais = [titre].concat(alternatifs || []).concat(variantes(titre));
    if (slug) essais = essais.concat(variantes(String(slug).replace(/-/g, ' ')));
    const vus = {}, propres = [];
    for (let i = 0; i < essais.length && propres.length < 8; i++) {
      const v = essais[i];
      if (!vus[v.toLowerCase()]) { vus[v.toLowerCase()] = 1; propres.push(v); }
    }
    essais = propres;
    // On garde la liste exacte des titres essayés : quand aucun ne marche, c'est elle qu'il faut
    // lire pour comprendre sous quelle forme le site écrit son titre.
    TRACES.titresEssayes = essais.slice();
    for (let i = 0; i < essais.length; i++) {
      if (i) await new Promise(function (r) { setTimeout(r, 320); }); // AniList limite le rythme
      const t0 = Date.now();
      let r = null;
      try { r = await anilist(q, { s: essais[i] }); } catch (e) { tracerErreur('AniList « ' + essais[i] + ' »', e); }
      const m = r && r.data && r.data.Media;
      tracer('AniList « ' + essais[i] + ' »', t0, m && m.id ? 'MAL ' + (m.idMal || '?') : 'introuvable');
      if (m && m.id) {
        const out = { id: m.id, mal: m.idMal || 0 };
        ecrire(cle, out);
        return out;
      }
    }

    // Dernier recours : les titres équivalents de la fiche du site, souvent en anglais et en romaji
    // là où la page affiche un titre français qu'AniList ne connaît pas.
    if (fiche) {
      const secours = await titresDeLaFiche(fiche);
      for (let i = 0; i < secours.length; i++) {
        await new Promise(function (r) { setTimeout(r, 320); });
        const r2 = await anilist(q, { s: secours[i] });
        const m2 = r2 && r2.data && r2.data.Media;
        if (m2 && m2.id) {
          const out = { id: m2.id, mal: m2.idMal || 0 };
          ecrire(cle, out);
          return out;
        }
      }
    }
    return null;
  }

  /**
   * AniSkip range les openings saison par saison, et AniList relie les saisons par des liens
   * « SEQUEL ». On les suit depuis la saison 1, comme le fait AnimeLover.
   */
  const Q_REL = 'query($id:Int){ Media(id:$id){ id idMal relations{ edges{ relationType node{ id idMal type format } } } } }';

  /** Le voisin d'une fiche dans le sens demandé (PREQUEL ou SEQUEL), séries seulement. */
  async function voisin(id, sens) {
    const r = await anilist(Q_REL, { id: id });
    const rel = (((r || {}).data || {}).Media || {}).relations;
    const liste = (rel && rel.edges) || [];
    for (let i = 0; i < liste.length; i++) {
      const n = liste[i].node;
      if (liste[i].relationType === sens && n && n.type === 'ANIME' &&
          (n.format === 'TV' || n.format === 'TV_SHORT' || n.format === 'ONA')) return n;
    }
    return null;
  }

  /**
   * Identifiant MAL de la saison demandée.
   *
   * La recherche par titre ne tombe pas forcément sur la saison 1 : « L'Attaque des Titans »
   * renvoie « The Final Season ». On remonte donc d'abord les liens PREQUEL jusqu'à la première
   * saison, puis on redescend les SEQUEL autant de fois qu'il faut. Le résultat ne dépend plus de
   * l'endroit où la recherche est tombée.
   */
  const Q_ANNEE = 'query($s:String){ Page(perPage:8){ media(search:$s, type:ANIME, sort:SEARCH_MATCH)' +
    '{ id idMal format startDate{ year } } } }';

  /**
   * Résolution par l'année de diffusion.
   *
   * Certains sites ne numérotent pas les saisons : ils écrivent « Oshi no Ko (2024) ». L'année est
   * alors plus sûre qu'un numéro, à condition de la confronter aux candidats d'AniList au lieu de
   * remonter la chaîne des préquelles — qui ramènerait à la première saison.
   */
  async function parAnnee(titre, annee) {
    const t0 = Date.now();
    const cle = 'an:' + titre.toLowerCase() + '#' + annee;
    const cache = lire(cle);
    if (cache !== null && cache !== undefined) return cache;
    let mal = 0;
    try {
      const r = await anilist(Q_ANNEE, { s: titre });
      const liste = (r && r.data && r.data.Page && r.data.Page.media) || [];
      for (let i = 0; i < liste.length; i++) {
        const m = liste[i], f = m.format, a = m.startDate && m.startDate.year;
        if (a === annee && (f === 'TV' || f === 'TV_SHORT' || f === 'ONA')) { mal = m.idMal || 0; break; }
      }
    } catch (e) { mal = 0; tracerErreur('AniList par année « ' + titre + ' »', e); }
    tracer('AniList « ' + titre + ' » année ' + annee, t0, mal ? 'MAL ' + mal : 'aucune correspondance');
    ecrire(cle, mal);
    return mal;
  }

  async function malDeLaSaison(infos) {
    const saison = infos.saison;
    if (infos.annee) {
      const parAn = await parAnnee(infos.titre, infos.annee);
      if (parAn) return parAn;
    }
    const base = await baseAniList(infos.titre, infos.slug, infos.alternatifs, infos.fiche);
    if (!base) return 0;
    // Saison inconnue (le site n'en donne pas), ou année annoncée mais introuvable parmi les
    // candidats : la meilleure correspondance de recherche vaut mieux que la racine de la série,
    // qu'on atteindrait en remontant les préquelles et qui serait la mauvaise saison.
    if (infos.annee || !saison) return base.mal;
    const cle = 'sais:' + base.id + '#' + saison;
    const cache = lire(cle);
    if (cache !== null && cache !== undefined) return cache;

    let id = base.id, mal = base.mal;
    for (let i = 0; i < 6; i++) {
      const p = await voisin(id, 'PREQUEL');
      if (!p) break;
      id = p.id; mal = p.idMal || 0;
    }
    for (let s = 1; s < saison; s++) {
      const n = await voisin(id, 'SEQUEL');
      if (!n) { mal = 0; break; }
      id = n.id; mal = n.idMal || 0;
    }
    ecrire(cle, mal);
    return mal;
  }

  /** Minutages AniSkip : [{ type, debut, fin }] en secondes. */
  async function minutages(mal, episode) {
    if (!mal || !episode) return [];
    const cle = 'skip:' + mal + '/' + episode;
    const cache = lire(cle);
    if (cache) return cache;
    const adresse = 'https://api.aniskip.com/v2/skip-times/' + mal + '/' + episode +
      '?types[]=op&types[]=ed&types[]=mixed-op&types[]=mixed-ed&episodeLength=0';
    const t0 = Date.now();
    let r = null;
    try { r = await json(adresse); } catch (e) { tracerErreur('AniSkip ' + mal + '/' + episode, e); }
    const res = (r && r.results) || [];
    tracer('AniSkip ' + mal + ' ép.' + episode, t0,
      res.length ? res.map(function (x) { return x.skipType; }).join(',') : ((r && r.message) || 'aucun résultat'));
    const out = [];
    for (let i = 0; i < res.length; i++) {
      const iv = res[i].interval || {};
      const d = Number(iv.startTime), f = Number(iv.endTime);
      if (isFinite(d) && isFinite(f) && f > d) {
        out.push({ type: /ed$/i.test(res[i].skipType) ? 'ending' : 'opening', debut: d, fin: f });
      }
    }
    out.sort(function (a, b) { return a.debut - b.debut; });
    if (out.length) ecrire(cle, out);
    return out;
  }

  // =========================================================== PAGE DU SITE

  function cotéSite() {
    let site = null;
    for (let i = 0; i < SITES.length; i++) { if (SITES[i].reconnait(location.hostname)) { site = SITES[i]; break; } }
    let dernier = '';
    let ranges = [];
    let identite = '';   // « titre|saison », pour que le lecteur sache de quel anime il s'agit
    let numero = 0;
    // Vie de la page. Un site moderne change d'épisode sans recharger : si la page est reconnue
    // puis cesse de l'être, ces compteurs le disent d'un coup d'œil, là où le journal seul
    // obligerait à relire quatre cents lignes.
    let adresseVue = location.href;
    let navigations = 0, reconnaissances = 0, pertes = 0, reconnuUneFois = false;
    let motLecteur = 0;   // dernière fois que la page du lecteur a donné des nouvelles

    /** Ce que la page a compris, pour le diagnostic affiché à l'utilisateur. */
    let dernierDiag = { site: site.nom, etat: 'lecture de la page…' };
    let etatSon = '';   // rapporté par la page du lecteur, qui seule entend la vidéo
    let detailLecteur = null;
    let dernierEtatNote = '';
    function noter(diag) {
      dernierDiag = diag || dernierDiag;
      if (typeof reglages.diag === 'function') {
        reglages.diag(Object.assign({}, dernierDiag, { son: etatSon || '—' }));
      }
      if (diag && diag.etat && diag.etat !== dernierEtatNote) {
        dernierEtatNote = diag.etat;
        // La saison est un numéro sur la plupart des sites, mais une année sur certains :
        // « S2 » d'un côté, « année 2026 » de l'autre — d'où le test plutôt qu'un « S » collé.
        const sai = (typeof diag.saison === 'number' && diag.saison) ? 'S' + diag.saison : String(diag.saison || '—');
        JOURNAL.ligne((diag.titre ? '« ' + diag.titre + ' » ' + sai + ' ép. ' + diag.episode +
          ' — MAL ' + (diag.mal || '?') + ' — ' : '') + diag.etat);
      }
    }
    noter(dernierDiag);

    function diffuser() {
      const message = { cle: CLE, type: 'minutages', ranges: ranges, auto: !!reglages.auto(), anime: identite, episode: numero };
      const cadres = document.querySelectorAll('iframe');
      for (let i = 0; i < cadres.length; i++) {
        try { cadres[i].contentWindow.postMessage(message, '*'); } catch (e) { /* autre origine : normal */ }
      }
      // Et à cette page elle-même : sur les sites dont la vidéo n'est pas dans une iframe, la
      // partie lecteur tourne ici. Sans cet envoi elle ne recevait les réglages qu'une fois, au
      // démarrage — activer le saut automatique en cours d'épisode restait sans effet.
      try { window.postMessage(message, '*'); } catch (e) { /* page verrouillée */ }
    }

    // un lecteur qui vient de se charger réclame les minutages
    window.addEventListener('message', function (e) {
      const d = e.data;
      if (!d || d.cle !== CLE) return;
      if (reveil) reveil();   // une iframe parle : il y a donc un lecteur dans cette page
      if (d.type === 'journal') { JOURNAL.recevoir(d.ligne); return; }
      if (d.type === 'son') { etatSon = d.etat; detailLecteur = d.detail || null; motLecteur = Date.now(); noter(null); return; }
      if (d.type !== 'bonjour') return;
      try { e.source.postMessage({ cle: CLE, type: 'minutages', ranges: ranges, auto: !!reglages.auto(), anime: identite, episode: numero }, '*'); } catch (err) { /* ignore */ }
    });

    let reveil = null;
    let occupe = false;
    async function tic() {
      if (location.href !== adresseVue) {
        adresseVue = location.href;
        navigations++;
        JOURNAL.ligne("la page a changé d'adresse sans recharger (" + navigations + ') : ' + adressePage());
      }
      let infos = null;
      try { infos = site.infos(); } catch (e) { infos = null; }
      if (!infos || !infos.titre || !infos.episode) {
        if (reconnuUneFois) { pertes++; reconnuUneFois = false; }
        noter({ site: site.nom, etat: "cette page n'a pas été reconnue comme une page d'épisode" });
      } else {
        if (!reconnuUneFois) { reconnuUneFois = true; reconnaissances++; }
        identite = (infos.titre + '|' + infos.saison).toLowerCase();
        numero = infos.episode;
        const signature = infos.titre + '|' + infos.saison + '|' + infos.episode;
        if (signature !== dernier && !occupe) {
          occupe = true;
          dernier = signature;
          ranges = [];
          let mal = 0;
          try {
            mal = await malDeLaSaison(infos);
            ranges = await minutages(mal, infos.episode);
          } catch (e) { ranges = []; }
          occupe = false;
          noter({
            site: site.nom,
            titre: infos.titre + (infos.annee ? ' (' + infos.annee + ')' : ''),
            saison: infos.saison || (infos.annee ? 'année ' + infos.annee : '—'),
            episode: infos.episode, mal: mal,
            etat: !mal ? "aucune fiche trouvée pour ce titre et cette saison"
                : !ranges.length ? "fiche MyAnimeList " + mal + " trouvée, mais AniSkip n'a pas d'opening pour cet épisode"
                : ranges.map(function (r) { return r.type + ' ' + Math.round(r.debut) + 's → ' + Math.round(r.fin) + 's'; }).join(', '),
          });
        }
      }
      // on rediffuse à chaque tour : le lecteur peut n'apparaître que bien plus tard,
      // par exemple après un clic sur « Regarder l'épisode ».
      diffuser();
    }

    /**
     * Rapport de signalement.
     *
     * Rassemble, en un seul texte copiable, tout ce qu'il faut pour comprendre un problème sans
     * avoir à redemander quoi que ce soit : ce que la page donne à lire, ce que le script en a
     * tiré, ce que les deux services ont répondu, l'état du lecteur et de son, et le journal.
     * Les sources brutes comptent autant que le résultat : la plupart des pannes vues jusqu'ici
     * venaient d'un titre écrit autrement que prévu.
     */
    /** « mercredi 18 novembre 2026 à 23:20:41 », plus l'écart avec l'heure universelle. */
    function dateLisible() {
      const d = new Date();
      let texte;
      try {
        texte = d.toLocaleString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
      } catch (e) { texte = d.toString(); }
      const ecart = -d.getTimezoneOffset() / 60;
      return texte + ' (UTC' + (ecart >= 0 ? '+' : '') + ecart + ')';
    }

    /**
     * L'adresse de l'épisode, telle qu'elle sert à reproduire le problème.
     *
     * Elle garde ses paramètres : sur certains sites le numéro d'épisode ne vit que dans
     * « ?ep=1 », et une adresse tronquée ne mène nulle part. Mais un paramètre peut aussi porter
     * un jeton de lecture, qui n'a rien à faire dans un signalement : ceux-là sont masqués, de
     * même que toute valeur anormalement longue.
     */
    function adressePage() {
      const SECRET = /token|auth|key|sig|session|password|passe|jwt|secret|mail|user|login|id$/i;
      try {
        const u = new URL(location.href);
        const bouts = [];
        u.searchParams.forEach(function (v, k) {
          bouts.push(k + '=' + (SECRET.test(k) || v.length > 40 ? '(masqué)' : v));
        });
        const ancre = (u.hash && u.hash.length < 60 && !SECRET.test(u.hash)) ? u.hash : '';
        return u.origin + u.pathname + (bouts.length ? '?' + bouts.join('&') : '') + ancre;
      } catch (e) { return location.href.split('?')[0]; }
    }

    function rapport() {
      const brut = function (sel, attr) {
        try {
          const e = document.querySelector(sel);
          if (!e) return '(absent)';
          const v = attr ? e.getAttribute(attr) : e.textContent;
          return (v || '').replace(/\s+/g, ' ').trim().slice(0, 160) || '(vide)';
        } catch (e) { return '(illisible)'; }
      };
      // Les domaines des cadres, sans la partie « ? » : un jeton de lecture n'a rien à faire
      // dans un signalement, et le domaine suffit à savoir qui sert la vidéo.
      const cadres = function () {
        try {
          const f = document.querySelectorAll('iframe');
          const vus = [];
          for (let i = 0; i < f.length; i++) {
            try {
              const u = new URL(f[i].src, location.href);
              const court = u.hostname + u.pathname.slice(0, 40);
              if (u.hostname && vus.indexOf(court) < 0) vus.push(court);
            } catch (e) { /* src vide ou relatif */ }
          }
          return vus.length ? vus.join(', ') : 'aucun';
        } catch (e) { return '(illisible)'; }
      };
      const listes = [];
      try {
        const sels = document.querySelectorAll('select');
        for (let i = 0; i < sels.length && i < 4; i++) {
          const x = sels[i];
          listes.push('  ' + (x.id || x.name || 'liste ' + (i + 1)) + ' : ' + x.options.length +
            ' entrées, choisi « ' + ((x.selectedOptions[0] || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' »');
        }
      } catch (e) { /* page exotique */ }

      const d = dernierDiag || {};
      const L = detailLecteur || {};
      const lignes = [
        '--- Passer l\'opening : signalement ---',
        'version : ' + (reglages.version || '?') + '   (' + (reglages.canal || 'inconnu') + ')',
        'date : ' + dateLisible() + '   (' + new Date().toISOString() + ')',
        'navigateur : ' + navigator.userAgent.slice(0, 120),
        '',
        'PAGE',
        '  adresse : ' + adressePage(),
        '  adaptateur : ' + (d.site || site.nom),
        '  titre de l\'onglet : ' + document.title.replace(/\s+/g, ' ').trim().slice(0, 160),
        '  og:title : ' + brut('meta[property="og:title"]', 'content'),
        '  premier titre (h1) : ' + brut('h1'),
        '  #titreOeuvre : ' + brut('#titreOeuvre'),
        '  #titreAlter : ' + brut('#titreAlter'),
        listes.length ? '  listes déroulantes :\n' + listes.join('\n') : '  listes déroulantes : aucune',
        '  vie de la page : reconnue ' + reconnaissances + ' fois, perdue ' + pertes + ' fois, ' +
          navigations + " changement(s) d'adresse sans rechargement",
        '',
        'CE QUE LE SCRIPT EN A TIRÉ',
        '  titre : ' + (d.titre || '—'),
        '  saison : ' + (d.saison || '—') + '   épisode : ' + (d.episode || '—'),
        '  fiche MyAnimeList : ' + (d.mal || '—'),
        '  résultat : ' + (d.etat || '—'),
        '',
        'LECTEUR',
        '  domaine : ' + (L.hote || '—') + (L.hote && L.hote !== location.hostname ? ' (dans une iframe)' : ''),
        '  durée : ' + (L.duree != null ? L.duree + ' s' : '—') + '   position : ' + (L.position != null ? L.position + ' s' : '—') +
          (L.enPause ? '   (en pause)' : ''),
        '  son : ' + (etatSon || '—') + '   volume : ' + (L.volume != null ? L.volume + ' %' : '—'),
        '  repères du lecteur : ' + (L.repères || 'aucun'),
        '  intervalles utilisés : ' + (L.intervalles || 'aucun'),
        '  saut automatique : ' + (L.sautAuto ? 'activé' : 'désactivé'),
        '  nouvelles du lecteur : ' + (motLecteur
          ? 'il y a ' + Math.round((Date.now() - motLecteur) / 1000) + ' s'
          : 'AUCUNE — la partie lecteur ne répond pas'),
        '  balises vidéo sur la page du lecteur : ' + (L.videos != null ? L.videos : '—') +
          '   source : ' + (L.source || '—'),
        '  provenance des repères : ' + (L.provenance || 'aucun repère du lecteur') +
          (L.exact ? "   (ils l'emportent sur AniSkip)" : ''),
        '  calage sonore : ' + (L.calage || '—'),
        '  dernier saut : ' + (L.dernierSaut || 'aucun'),
        '  bouton : ' + (L.bouton || '—'),
        '',
        'RECHERCHES',
        TRACES.titresEssayes && TRACES.titresEssayes.length
          ? '  titres essayés sur AniList :\n' + TRACES.titresEssayes.map(function (t) { return '    « ' + t + ' »'; }).join('\n')
          : '  titres essayés sur AniList : (aucun — le titre n\'a pas été lu)',
        TRACES.appels.length
          ? '  appels :\n' + TRACES.appels.map(function (a) { return '    ' + a.nom + ' → ' + a.resume + '  (' + a.ms + ' ms)'; }).join('\n')
          : '  appels : aucun',
        TRACES.erreurs.length ? '  erreurs :\n' + TRACES.erreurs.map(function (e) { return '    ' + e; }).join('\n') : '  erreurs : aucune',
        '',
        'CONTEXTE',
        '  cadres de la page : ' + cadres(),
        '  fenêtre : ' + window.innerWidth + '×' + window.innerHeight +
          '   écran : ' + (screen.width || '?') + '×' + (screen.height || '?') +
          '   zoom : ' + Math.round((window.devicePixelRatio || 1) * 100) + ' %',
        '  langue : ' + (navigator.language || '?') + '   plein écran : ' + (document.fullscreenElement ? 'oui' : 'non'),
        '  page ouverte depuis : ' + Math.round((Date.now() - TRACES.debut) / 1000) + ' s',
        '',
        'JOURNAL (' + JOURNAL.lignes.length + ' lignes)',
        JOURNAL.lignes.length ? JOURNAL.lignes.join('\n') : '  (vide)',
      ];
      return lignes.join('\n');
    }

    if (typeof reglages.exposerRapport === 'function') reglages.exposerRapport(rapport);

    /**
     * Quand se mettre au travail.
     *
     * Le script est présent sur toutes les pages, parce que la vidéo d'anime-sama ou de
     * voiranime vit dans une iframe hébergée ailleurs, sur un domaine qui change seul — VOE et
     * Earnvids en changent tout seuls, sans prévenir personne. Présent ne veut pas dire actif :
     * sur un site connu on démarre tout de suite, et partout ailleurs on attend qu'une vidéo se
     * montre, ici ou dans une iframe qui se signale. Une page sans vidéo ne coûte donc rien.
     */
    const connu = site.nom !== 'générique';
    let enMarche = false;
    function demarrer() {
      if (enMarche) return;
      enMarche = true;
      clearInterval(filet);
      tic();
      setInterval(tic, 1500);
    }
    const filet = setInterval(function () {
      if (document.querySelector('video')) demarrer();
    }, 5000);
    reveil = demarrer;   // un « bonjour » d'un lecteur réveille aussi la page du site
    if (connu || document.querySelector('video')) demarrer();
    else noter({ site: site.nom, etat: 'aucune vidéo sur cette page' });
  }

  // ======================================= RECONNAISSANCE DU GÉNÉRIQUE AU SON

  /**
   * Pour les animes qu'AniSkip ne connaît pas (7 Seeds et beaucoup d'autres), on retrouve le
   * générique par son SON, comme le fait AnimeLover.
   *
   * Principe : pendant la lecture, une empreinte du son est relevée quatre fois par seconde. Deux
   * épisodes d'une même saison partagent une longue portion identique — le générique, rigoureusement
   * le même d'un épisode à l'autre. On la repère en comparant les deux relevés, puis on en garde
   * les cinq premières secondes comme modèle. Aux épisodes suivants, dès que ces cinq secondes sont
   * reconnues, le bouton apparaît.
   *
   * Conséquence à connaître : il faut avoir regardé DEUX épisodes de la saison avant que ça serve.
   * Et le son doit être audible — coupé ou à zéro, il n'y a rien à relever.
   */
  const Son = {
    PAS: 0.25,          // une empreinte toutes les 250 ms
    MAX: 2400,          // on ne relève que les 10 premières minutes
    MIN_GEN: 160,       // un générique dure au moins 40 s
    MAX_GEN: 520,       // et au plus 2 min 10
    DEBUT: 20,          // 5 s servent de signature de départ
    ctx: null, analyseur: null, branche: null,
    frames: [], dernierIndex: -1, cle: '', episode: 0, modele: null, recent: [],
    energies: [], idx0: 0, reference: 0, refPour: -1, dernierTrace: 0, duree: 0,

    /** Branche l'analyseur sur la vidéo, une seule fois, sans couper le son. */
    brancher: function (v) {
      if (this.branche === v) return true;
      // Changement de balise vidéo — publicité puis épisode, ou changement de lecteur : le
      // relevé précédent décrit un AUTRE média. Le garder fausse le « recul » et fait croire
      // qu'on a entendu ce qui précède le générique alors qu'on a entendu une publicité.
      this.energies = []; this.recent = []; this.idx0 = 0;
      this.reference = 0; this.refPour = -1; this.dernierIndex = -1; this.dernierTrace = 0;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.ctx.createMediaElementSource(v);
        this.analyseur = this.ctx.createAnalyser();
        this.analyseur.fftSize = 2048;
        source.connect(this.analyseur);
        this.analyseur.connect(this.ctx.destination); // le son continue de sortir normalement
        this.branche = v;
        JOURNAL.ligne('analyseur sonore branché');
        return true;
      } catch (e) {
        // déjà branché par la page, ou son d'un autre domaine : on renonce sans rien casser
        this.branche = v; this.analyseur = null;
        JOURNAL.ligne('analyseur sonore IMPOSSIBLE (' + (e && e.name ? e.name : 'refus') + ') : le son ne pourra pas servir');
        return false;
      }
    },

    /**
     * Empreinte d'un instant : seize bandes de fréquences comparées deux à deux. On ne retient que
     * « telle bande est-elle plus forte que la suivante », ce qui ne dépend ni du volume ni du
     * réglage de l'appareil — seulement de la musique.
     */
    empreinte: function () {
      const n = this.analyseur.frequencyBinCount;
      const bins = new Uint8Array(n);
      this.analyseur.getByteFrequencyData(bins);
      const bandes = [];
      const largeur = Math.floor((n / 2) / 17);
      for (let b = 0; b < 17; b++) {
        let somme = 0;
        for (let i = b * largeur; i < (b + 1) * largeur; i++) somme += bins[i];
        bandes.push(somme / largeur);
      }
      let mot = 0;
      for (let b = 0; b < 16; b++) if (bandes[b] > bandes[b + 1]) mot |= (1 << b);
      return mot;
    },

    distance: function (a, b) {
      let x = (a ^ b) & 0xffff, d = 0;
      while (x) { d += x & 1; x >>= 1; }
      return d;
    },

    /** Relevé courant, appelé à chaque tour de surveillance. */
    echantillonner: function (v) {
      if (!this.analyseur || v.paused || v.muted || v.volume < 0.02) return;
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(function () {});
      // La durée change quand le lecteur passe de la publicité à l'épisode dans la même
      // balise : le relevé d'avant ne décrit plus le même film.
      if (isFinite(v.duration) && v.duration > 0) {
        if (this.duree && Math.abs(this.duree - v.duration) > 1) {
          this.energies = []; this.recent = []; this.idx0 = 0;
          this.reference = 0; this.refPour = -1; this.dernierIndex = -1;
        }
        this.duree = v.duration;
      }
      const idx = Math.floor(v.currentTime / this.PAS);
      if (idx < 0 || idx >= this.MAX || idx === this.dernierIndex) return;
      // Un saut dans la vidéo — barre de progression, reprise de lecture — rend le relevé
      // precedent caduc : il decrit un autre moment de l'episode. Le garder reviendrait a dater
      // le generique d'apres des images prises ailleurs, ce qui donnait un bouton en retard.
      if (this.dernierIndex >= 0 && (idx < this.dernierIndex || idx - this.dernierIndex > 8)) {
        this.energies = []; this.recent = []; this.reference = 0; this.refPour = -1;
      }
      this.dernierIndex = idx;
      this.frames[idx] = this.empreinte();
      this.recent.push(this.frames[idx]);
      if (this.recent.length > this.DEBUT) this.recent.shift();

      if (!this.energies.length) this.idx0 = idx;              // à quelle image commence le relevé
      this.energies.push(this.energie());
      if (this.energies.length > 200) { this.energies.shift(); this.idx0++; }   // 50 s de mémoire
    },

    /** Niveau sonore moyen de l'instant. */
    energie: function () {
      const n = this.analyseur.frequencyBinCount;
      const bins = new Uint8Array(n);
      this.analyseur.getByteFrequencyData(bins);
      let somme = 0;
      const jusque = Math.floor(n / 2);
      for (let i = 0; i < jusque; i++) somme += bins[i];
      return somme / jusque;
    },

    disponible: function () { return !!this.analyseur && this.energies.length >= 24; },

    /**
     * Les deux seuils, déduits du niveau « normal » relevé juste avant le générique.
     *
     * Ils sont RELATIFS, et c'est tout l'enjeu : le niveau dépend du mixage de l'épisode, du
     * lecteur et du volume. Sur ansembed, le dialogue tourne autour de 4 et le générique monte à
     * 11 ; un plancher absolu de 26 — hérité d'un épisode bien plus fort — rendait toute
     * détection impossible, et le bouton n'arrivait qu'au bout des 25 s d'abandon.
     *
     *   strict : pour affirmer « c'est de la musique », sur une seconde pleine.
     *   souple : pour remonter jusqu'à la première note sans qu'une respiration coupe la remontée.
     */
    seuils: function (median) {
      return {
        strict: Math.max(median * 1.35 + 1.5, 3),
        souple: Math.max(median * 1.10 + 0.7, 2)
      };
    },

    /** Une ligne de journal par seconde pendant qu'on cherche le début de la musique. */
    tracer: function (t, dm) {
      if (this.dernierTrace && Math.abs(t - this.dernierTrace) < 1) return;
      this.dernierTrace = t;
      const niv = this.energies.length ? this.energies[this.energies.length - 1].toFixed(1) : 0;
      const s = this.seuils(this.reference);
      JOURNAL.ligne('t=' + t.toFixed(1) + ' niveau=' + niv + ' référence=' + this.reference.toFixed(1) +
        ' seuil=' + s.strict.toFixed(1) + ' relevé=' + Math.round(this.energies.length * this.PAS) + 's' +
        ' → ' + (dm ? 'musique depuis ' + dm.toFixed(1) + ' s' : 'pas encore de musique'));
    },

    /**
     * La musique vient-elle de commencer ? Le générique est nettement plus fort et plus continu
     * que les dialogues qui le précèdent : on compare le niveau des deux dernières secondes à
     * celui des quarante précédentes.
     */
    musique: function () { return this.musiqueDepuis() > 0; },

    /**
     * Fige le niveau sonore « normal » AVANT le générique.
     *
     * Sans ça, la référence est la médiane des cinquante dernières secondes — qui, une fois dans
     * le générique, sont le générique lui-même. La référence montait donc avec la musique et plus
     * rien ne la dépassait : le bouton n'arrivait qu'au refrain, une minute trop tard.
     * On écarte les deux dernières secondes, qui peuvent déjà être de la musique.
     */
    fixerReference: function (tDebut) {
      let e = this.energies;
      if (tDebut) {
        // on s'arrete deux secondes avant l'heure annoncee : si la musique a demarre un peu en
        // avance, ses premieres notes ne doivent pas relever la reference.
        const fin = Math.floor(tDebut / this.PAS) - this.idx0 - 8;
        e = e.slice(0, Math.max(0, fin));
      } else {
        e = e.slice(0, -8);
      }
      if (e.length < 12) return;
      const tries = e.slice().sort(function (a, b) { return a - b; });
      // 40e centile plutot que mediane : quelques images de musique en fin de fenetre ne
      // suffisent plus a fausser la reference.
      this.reference = tries[Math.floor(tries.length * 0.4)];
      this.refPour = tDebut || 0;
    },

    /**
     * Rend l'instant où la musique a VRAIMENT commencé, en secondes, ou 0.
     *
     * On confirme sur la dernière seconde — c'est ce qui évite de prendre un éclat de voix pour un
     * générique — puis on REMONTE tant que le niveau reste élevé. Sans ce retour en arrière, le
     * bouton arrivait au premier couplet chanté et non à la première note (Ao Ashi : 0:35 au lieu
     * de 0:25, l'introduction instrumentale étant plus discrète que le chant).
     */
    musiqueDepuis: function () {
      const e = this.energies;
      if (e.length < 24) return 0;
      let median = this.reference;
      if (!median) {
        const avant = e.slice(0, -4);
        const tries = avant.slice().sort(function (a, b) { return a - b; });
        median = tries[Math.floor(tries.length / 2)];
      }
      const s = this.seuils(median);
      let franc = true;
      for (let i = e.length - 4; i < e.length; i++) if (e[i] < s.strict) { franc = false; break; }

      // Filet de sécurité : si le niveau ne franchit jamais le seuil strict mais reste au-dessus
      // du seuil souple pendant trois secondes pleines, c'est de la musique quand même. Sans ça,
      // un générique à peine plus fort que la scène précédente faisait attendre les 25 s
      // d'abandon — et le bouton arrivait au milieu du générique.
      if (!franc) {
        if (e.length < 12) return 0;
        for (let i = e.length - 12; i < e.length; i++) if (e[i] < s.souple) return 0;
      }

      // retour en arrière jusqu'au début de la montée, avec une marge plus souple :
      // une note tenue ou une respiration ne doit pas couper la remontée
      let i = e.length - 4;
      while (i > 0 && e[i - 1] >= s.souple) i--;
      return (this.idx0 + i) * this.PAS;
    },

    /** Sauvegarde du relevé de l'épisode en cours. */
    ranger: function () {
      if (!this.cle || !this.episode) return;
      let remplis = 0;
      for (let i = 0; i < this.MAX; i++) if (this.frames[i] !== undefined) remplis++;
      if (remplis < this.MIN_GEN + 40) return; // trop peu vu pour servir
      const mots = [];
      for (let i = 0; i < this.MAX; i++) mots.push((this.frames[i] === undefined ? 0x10000 : this.frames[i]));
      ecrire('emp:' + this.cle + ':' + this.episode, mots);
    },

    /** Cherche la longue portion commune à deux relevés : c'est le générique. */
    apprendre: function () {
      if (this.modele || !this.cle) return;
      const dejaVu = lire('modele:' + this.cle);
      if (dejaVu) { this.modele = dejaVu; return; }

      const relevés = [];
      for (let ep = 1; ep <= 60 && relevés.length < 2; ep++) {
        if (ep === this.episode) continue;
        const m = lire('emp:' + this.cle + ':' + ep);
        if (m) relevés.push(m);
      }
      if (!relevés.length) return;
      const a = [];
      for (let i = 0; i < this.MAX; i++) a.push(this.frames[i] === undefined ? 0x10000 : this.frames[i]);
      const b = relevés[0];

      let meilleur = { debut: -1, longueur: 0 };
      // les génériques tombent à peu près au même endroit : on ne décale que de ±60 s
      for (let d = -240; d <= 240; d++) {
        let courant = 0, depart = 0;
        for (let i = 0; i < 1600; i++) {
          const j = i + d;
          const x = a[i], y = b[j];
          const bon = (j >= 0 && j < this.MAX && x !== undefined && x < 0x10000 && y !== undefined && y < 0x10000 &&
                       this.distance(x, y) <= 3);
          if (bon) { if (!courant) depart = i; courant++; if (courant > meilleur.longueur) meilleur = { debut: depart, longueur: courant }; }
          else courant = 0;
        }
      }
      if (meilleur.longueur < this.MIN_GEN || meilleur.longueur > this.MAX_GEN) return;
      const signature = a.slice(meilleur.debut, meilleur.debut + this.DEBUT);
      if (signature.length < this.DEBUT) return;
      this.modele = { signature: signature, duree: meilleur.longueur * this.PAS };
      ecrire('modele:' + this.cle, this.modele);
    },

    /** Le générique commence-t-il maintenant ? Rend sa fin en secondes, ou 0. */
    reconnait: function (v) {
      if (!this.modele || this.recent.length < this.DEBUT) return 0;
      let total = 0;
      for (let i = 0; i < this.DEBUT; i++) total += this.distance(this.recent[i], this.modele.signature[i]);
      if (total / this.DEBUT > 3) return 0;
      return v.currentTime - this.DEBUT * this.PAS + this.modele.duree;
    },
  };

  // ======================================================== PAGE DU LECTEUR

  /**
   * Le lecteur dort tant qu'il n'y a rien à lire.
   *
   * Ce script tourne dans chaque cadre de chaque page ouverte. Sans ce garde-fou, il y plaçait
   * deux horloges — une recherche de vidéo toutes les 0,7 s, un appel au site toutes les 1,5 s —
   * qui tournaient indéfiniment sur des pages qui n'auront jamais de vidéo.
   *
   * Le navigateur sait dire lui-même quand une vidéo apparaît : il suffit de l'écouter, ce qui
   * ne coûte rien. Un contrôle toutes les cinq secondes sert de filet pour les lecteurs qui
   * n'émettent aucun de ces événements.
   */
  const EVEILS = ['loadedmetadata', 'loadeddata', 'canplay', 'play', 'playing', 'durationchange'];

  function cotéLecteur() {
    if (document.querySelector('video')) return lecteurActif();
    let parti = false;
    const surEvenement = function (e) {
      if (e && e.target && e.target.tagName === 'VIDEO') demarrer();
    };
    const filet = setInterval(function () {
      if (document.querySelector('video')) demarrer();
    }, 5000);
    function demarrer() {
      if (parti) return;
      parti = true;
      clearInterval(filet);
      EVEILS.forEach(function (n) { document.removeEventListener(n, surEvenement, true); });
      lecteurActif();
    }
    // en capture : ces événements ne remontent pas d'eux-mêmes jusqu'au document.
    EVEILS.forEach(function (n) { document.addEventListener(n, surEvenement, true); });
  }

  function lecteurActif() {
    let ranges = [], auto = false, sautes = {}, bouton = null, video = null;
    let provenanceReperes = '', dernierSaut = '';
    let autoAnnonce = false;
    let genericSon = null;   // générique reconnu au son, quand AniSkip ne sait rien
    let jsonRanges = '';
    let prioriteChapitres = false;   // des repères exacts l'emportent sur AniSkip

    /**
     * Repères du lecteur.
     *
     * Certains sites publient un fichier de chapitres qui nomme lui-même l'intro et le générique
     * de fin — AniZone en sert un par épisode. Ces minutages décrivent LEUR copie de l'épisode :
     * ils sont exacts, là où ceux d'AniSkip viennent d'une autre copie et demandent un recalage
     * à l'oreille. Quand ils existent, ils l'emportent ; sinon rien ne change.
     */
    let chapitresVus = '', chapitresRanges = null, chapitresEnCours = false;

    /** « Intro », « Credits »… → le type de générique, ou rien si le chapitre est une scène. */
    function classerChapitre(nom) {
      if (/^(intro|opening|op)\b/i.test(nom)) return 'opening';
      if (/^(credits|outro|ending|ed)\b/i.test(nom)) return 'ending';
      return '';
    }

    function poserChapitres(out, provenance) {
      if (!out.length) return false;
      out.sort(function (a, b) { return a.debut - b.debut; });
      chapitresRanges = out;
      prioriteChapitres = true;
      provenanceReperes = provenance;
      jsonRanges = JSON.stringify(out);
      ranges = out;
      sautes = {};
      JOURNAL.ligne('repères du lecteur (exacts, ' + provenance + ') : ' + out.map(function (r) {
        return r.type + ' ' + Math.round(r.debut) + '→' + Math.round(r.fin);
      }).join(', '));
      return true;
    }

    function chapitresDuLecteur() {
      if (chapitresRanges) return;

      // 1) Une piste de chapitres créée par le lecteur lui-même, sans balise dans la page.
      //    C'est le cas des lecteurs qui construisent leurs repères en JavaScript : rien à
      //    télécharger, les repères sont déjà là, il suffit de réveiller la piste.
      if (video && video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const t = video.textTracks[i];
          if (t.kind !== 'chapters') continue;
          try { if (t.mode === 'disabled') t.mode = 'hidden'; } catch (e) { continue; }
          const cues = t.cues;
          if (!cues || !cues.length) continue;   // pas encore chargée : on repassera
          const out = [];
          for (let c = 0; c < cues.length; c++) {
            const type = classerChapitre(String(cues[c].text || '').trim());
            if (type && cues[c].endTime > cues[c].startTime) {
              out.push({ type: type, debut: cues[c].startTime, fin: cues[c].endTime, sur: true });
            }
          }
          if (poserChapitres(out, 'piste du lecteur')) return;
        }
      }

      // 2) Un fichier de chapitres déclaré dans la page, qu'on va chercher nous-mêmes.
      const el = document.querySelector('track[kind="chapters"][src]');
      if (!el || !el.src) return;
      if (el.src === chapitresVus || chapitresEnCours) return;
      chapitresVus = el.src;
      chapitresEnCours = true;
      fetch(el.src, { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (texte) {
          chapitresEnCours = false;
          if (!texte) return;
          const lignes = texte.split(/\r?\n/), out = [];
          for (let i = 0; i < lignes.length; i++) {
            const m = lignes[i].match(/(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/);
            if (!m) continue;
            const type = classerChapitre((lignes[i + 1] || '').trim());
            if (!type) continue;
            const d = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
            const f = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / 1000;
            if (f > d) out.push({ type: type, debut: d, fin: f, sur: true });
          }
          poserChapitres(out, 'fichier de chapitres');
        })
        .catch(function () { chapitresEnCours = false; });
    }

    window.addEventListener('message', function (e) {
      const d = e.data;
      if (!d || d.cle !== CLE || d.type !== 'minutages') return;
      // on ne remplace les intervalles que s'ils ont vraiment changé : sinon le calage
      // mesuré sur la musique serait perdu à chaque message reçu
      const neuf = JSON.stringify(d.ranges || []);
      // Le réglage se relit toujours, même quand les repères du lecteur l'emportent sur les
      // minutages reçus : il ne concerne pas la provenance des heures mais le comportement.
      if (!!d.auto !== auto) {
        auto = !!d.auto;
        JOURNAL.ligne('saut automatique : ' + (auto ? 'activé' : 'désactivé'));
      }
      if (prioriteChapitres) return;   // le lecteur publie ses propres repères : on s'y tient
      if (neuf !== jsonRanges) {
        jsonRanges = neuf; ranges = d.ranges || []; sautes = {};
        JOURNAL.ligne('minutages reçus : ' + (ranges.length
          ? ranges.map(function (r) { return r.type + ' ' + Math.round(r.debut) + '→' + Math.round(r.fin); }).join(', ')
          : 'aucun (AniSkip ne connaît pas cet épisode)'));
      }
      // Le réglage est relu à chaque diffusion ; on n'en parle au journal que s'il change,
      // sinon la ligne reviendrait toutes les secondes et demie.
      if (!!d.auto !== auto) {
        auto = !!d.auto;
        JOURNAL.ligne('saut automatique : ' + (auto ? 'activé' : 'désactivé'));
      }

      // changement d'épisode : on range le relevé du précédent et on repart à zéro
      const cle = d.anime || '', ep = d.episode || 0;
      if (cle && ep && (cle !== Son.cle || ep !== Son.episode)) {
        Son.ranger();
        Son.cle = cle; Son.episode = ep;
        Son.frames = []; Son.recent = []; Son.dernierIndex = -1; Son.modele = null;
        Son.energies = []; Son.idx0 = 0; Son.reference = 0; Son.refPour = -1; Son.dernierTrace = 0;
        genericSon = null;
        Son.apprendre();
      }
    });

    // si l'onglet se ferme en cours d'épisode, le relevé ne doit pas être perdu
    window.addEventListener('pagehide', function () { Son.ranger(); });

    // on se signale au site, et on continue tant qu'on n'a rien reçu
    setInterval(function () {
      if (ranges.length) return;
      try { window.top.postMessage({ cle: CLE, type: 'bonjour' }, '*'); } catch (e) { /* ignore */ }
    }, 1500);

    /**
     * Le plein écran ne dessine QUE l'élément concerné et ses descendants : un bouton accroché au
     * corps de la page existe encore mais n'est plus affiché. On le déplace donc dans l'élément
     * passé en plein écran, et on le ramène au corps en sortant.
     */
    function hote() {
      const fs = document.fullscreenElement || document.webkitFullscreenElement ||
                 document.mozFullScreenElement || document.msFullscreenElement;
      // une balise <video> ne peut pas contenir d'enfant : rien à superposer dans ce cas
      if (fs && fs.tagName !== 'VIDEO') return fs;
      if (fs) return null;
      return document.body;
    }

    /**
     * Où poser le bouton.
     *
     * Il reste en « position fixe » — c'est ce qui l'empêche d'être rogné par un parent du
     * lecteur — mais ses distances sont calculées depuis le cadre de la VIDÉO et non depuis le
     * coin de la fenêtre. Sur un site où le lecteur occupe toute la largeur, le résultat est
     * identique à avant ; sur un site qui lui colle une liste d'épisodes à droite, le bouton
     * reste sur la vidéo au lieu d'aller se poser sur la liste.
     */
    const MARGE_DROITE = 22, MARGE_BAS = 112;
    function ancrer() {
      if (!bouton) return;
      const fs = document.fullscreenElement || document.webkitFullscreenElement ||
                 document.mozFullScreenElement || document.msFullscreenElement;
      if (fs || !video) {
        // en plein écran, le lecteur EST la fenêtre : les distances d'origine conviennent
        bouton.style.right = MARGE_DROITE + 'px';
        bouton.style.bottom = MARGE_BAS + 'px';
        return;
      }
      const r = video.getBoundingClientRect();
      if (!r.width || !r.height) return;   // vidéo masquée : on ne touche à rien
      const droite = window.innerWidth - r.right + MARGE_DROITE;
      const bas = window.innerHeight - r.bottom + MARGE_BAS;
      // le bouton doit rester visible même si la vidéo sort partiellement de l'écran
      bouton.style.right = Math.min(Math.max(droite, 10), Math.max(10, window.innerWidth - 220)) + 'px';
      bouton.style.bottom = Math.min(Math.max(bas, 10), Math.max(10, window.innerHeight - 60)) + 'px';
    }

    function placer() {
      if (!bouton) return;
      const cible = hote();
      if (!cible) { bouton.style.display = 'none'; return; }
      if (bouton.parentNode !== cible) cible.appendChild(bouton);
    }

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (e) {
      document.addEventListener(e, function () { placer(); ancrer(); });
    });

    // Le cadre de la vidéo bouge quand la page défile ou change de taille : le bouton suit,
    // sans attendre le prochain tour de surveillance.
    window.addEventListener('scroll', ancrer, { passive: true });
    window.addEventListener('resize', ancrer, { passive: true });

    function creerBouton() {
      // Même dessin que dans AnimeLover : pastille arrondie, dégradé rose vers rose sombre,
      // texte blanc gras et icône d'avance rapide.
      const b = document.createElement('button');
      b.style.cssText = [
        'position:fixed', 'right:22px', 'bottom:112px', 'z-index:2147483647',
        'display:none', 'align-items:center', 'gap:7px',
        'height:42px', 'padding:0 18px', 'border:0', 'border-radius:999px',
        'background:linear-gradient(135deg,#FF5F8A,#993953)', 'color:#fff', 'cursor:pointer',
        'font:700 16px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
        'letter-spacing:.01em', 'box-shadow:0 3px 14px rgba(0,0,0,.45)',
      ].join(';');
      b.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true" style="flex:0 0 auto">' +
        '<path d="M4 18l8.5-6L4 6v12zm9.5 0L22 12l-8.5-6v12z"></path></svg>' +
        '<span style="white-space:nowrap"></span>';
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (!b.dataset.fin) return;
        if (b.dataset.id) sautes[b.dataset.id] = true;
        b.style.display = 'none';
        JOURNAL.ligne('bouton cliqué → arrivée à ' + b.dataset.fin + ' s');
        sauter(parseFloat(b.dataset.fin));
      });
      b.addEventListener('mouseenter', function () { b.style.filter = 'brightness(1.12)'; });
      b.addEventListener('mouseleave', function () { b.style.filter = ''; });
      document.body.appendChild(b);
      return b;
    }

    function texteBouton(t) {
      const sp = bouton.querySelector('span');
      if (sp) sp.textContent = t; else bouton.textContent = t;
    }

    /**
     * Où atterrir à la fin d'un générique.
     *
     * AniSkip arrondit volontiers sa fin vers le haut, et le fondu de la dernière note y est
     * souvent compris : en sautant pile à l'heure annoncée on mangeait une à deux secondes de
     * dialogue. On se pose donc un peu avant. Une note de musique de trop se supporte ; une
     * réplique perdue oblige à revenir en arrière.
     */
    const MARGE = 1.5;
    function arrivee(r) { return Math.max(r.debut + 1, r.fin - MARGE); }

    function sauter(fin) {
      // Gardé pour le signalement : un saut qui n'atterrit pas où il faut est invisible dans
      // l'état final du lecteur, mais évident dès qu'on voit d'où il partait.
      dernierSaut = 'de ' + (video && isFinite(video.currentTime) ? Math.round(video.currentTime) : '?') +
        ' s à ' + Math.round(fin) + ' s, à ' + horodate();
      try {
        if (typeof window.jwplayer === 'function' && window.jwplayer().seek) { window.jwplayer().seek(fin); return; }
      } catch (e) { /* le lecteur n'est pas JW Player */ }
      try { video.currentTime = fin; } catch (e) { /* lecteur verrouillé */ }
    }

    function surveiller() {
      if (!video) { if (bouton) bouton.style.display = 'none'; return; }
      Son.echantillonner(video);
      const t = video.currentTime;

      let courant = null;
      for (let i = 0; i < ranges.length; i++) {
        if (t >= ranges[i].debut && t < ranges[i].fin - 1 &&
            !sautes[ranges[i].type + ':' + Math.round(ranges[i].debut)]) { courant = ranges[i]; break; }
      }

      // AniSkip ne connaît pas cet anime : on s'en remet à la reconnaissance au son
      if (!courant && !ranges.length) {
        if (!genericSon) {
          const fin = Son.reconnait(video);
          if (fin > t + 5) genericSon = { type: 'opening', debut: t - 2, fin: fin };
        }
        if (genericSon && t >= genericSon.debut && t < genericSon.fin - 1) courant = genericSon;
        else if (genericSon && t > genericSon.fin) genericSon = null;
      }

      // AniSkip donne l'intervalle d'une autre copie de l'épisode : le générique peut y
      // commencer quelques secondes plus tôt ou plus tard. Quand le son est analysable, on
      // attend que la musique parte vraiment, puis on décale tout l'intervalle d'autant.
      // Un repère publié par le lecteur se rapporte à la copie qu'on est en train de regarder :
      // le corriger à l'oreille ne pourrait que le dégrader.
      if (courant && courant.sur) courant.cale = true;
      if (courant && courant !== genericSon && !courant.cale) {
        const sonPossible = !!Son.analyseur;
        const tropTard = t >= courant.debut + 25;
        // Pour juger « la musique a commencé », il faut avoir entendu ce qui précède. Après un
        // saut dans la vidéo le relevé ne remonte pas assez loin : on s'en tient alors au
        // minutage d'AniSkip au lieu de faire patienter le bouton pour rien.
        const recul = courant.debut - Son.idx0 * Son.PAS;
        const assezDeRecul = Son.energies.length > 0 && recul >= 5;
        if (sonPossible && !tropTard && assezDeRecul) {
          // Le niveau d'avant le générique est figé dès qu'on entre dans l'intervalle annoncé.
          if (Son.refPour !== courant.debut) {
            Son.fixerReference(courant.debut);
            JOURNAL.ligne('t=' + t.toFixed(1) + " entrée dans l'intervalle annoncé (" +
              Math.round(courant.debut) + '→' + Math.round(courant.fin) + ') ; référence ' +
              (Son.reference ? Son.reference.toFixed(1) : 'IMPOSSIBLE') + ' sur ' +
              Math.round(Son.energies.length * Son.PAS) + ' s relevées, recul ' + Math.round(recul) + ' s');
          }
          if (!Son.reference) { courant.cale = true; JOURNAL.ligne("calé sur AniSkip : pas assez de son avant le générique"); }
          else {
          // Tant que le son n'a pas tranché, on PATIENTE au lieu d'afficher : au début d'un
          // épisode il n'y a encore rien d'analysé, et c'est précisément là que l'intervalle
          // d'AniSkip risque d'être en avance (Ao Ashi épisode 2 : annoncé à 6 s, réel vers 25 s).
          const debutMusique = Son.disponible() ? Son.musiqueDepuis() : 0;
          Son.tracer(t, debutMusique);
          if (!debutMusique) { if (bouton) bouton.style.display = 'none'; return; }
          // Le décalage peut être négatif : la musique a pu commencer AVANT l'heure annoncée.
          const decalage = debutMusique - courant.debut;
          const applique = Math.abs(decalage) > 2 && Math.abs(decalage) < 45;
          if (applique) { courant.debut += decalage; courant.fin += decalage; }
          JOURNAL.ligne("CALÉ À L'OREILLE : musique à " + debutMusique.toFixed(1) + ' s, décalage ' +
            (decalage >= 0 ? '+' : '') + decalage.toFixed(1) + ' s ' +
            (applique ? 'appliqué → ' + Math.round(courant.debut) + '→' + Math.round(courant.fin)
                      : (Math.abs(decalage) <= 2 ? 'négligeable, ignoré' : 'hors limites, ignoré')));
          courant.cale = true;
          }
        } else {
          courant.cale = true;   // son inutilisable, ou délai dépassé : on s'en tient à AniSkip
          JOURNAL.ligne('t=' + t.toFixed(1) + ' CALÉ SUR ANISKIP SEUL : ' +
            (!sonPossible ? 'son non analysable'
              : (tropTard ? 'délai de 25 s dépassé sans musique franche'
                : 'recul insuffisant (' + Math.round(recul) + ' s avant le générique, il en faut 5) — saut dans la vidéo ?')));
        }
      }

      if (!ranges.length && !courant && !bouton) return;
      if (!bouton) { if (!document.body) return; bouton = creerBouton(); }
      placer();
      if (!courant) { bouton.style.display = 'none'; return; }
      // plein écran sur la balise vidéo elle-même : impossible d'y superposer quoi que ce soit.
      // Le saut automatique, lui, fonctionne toujours.
      if (!hote()) { if (auto && !sautes[courant.type + ':' + Math.round(courant.debut)]) { sautes[courant.type + ':' + Math.round(courant.debut)] = true; sauter(arrivee(courant)); } return; }
      const id = courant.type + ':' + Math.round(courant.debut);
      if (auto && !sautes[id]) { sautes[id] = true; sauter(arrivee(courant)); bouton.style.display = 'none'; return; }
      texteBouton(courant.type === 'ending' ? "Passer l'ending" : "Passer l'opening");
      bouton.dataset.fin = String(arrivee(courant));
      bouton.dataset.id = id;
      if (bouton.style.display !== 'flex') {
        JOURNAL.ligne('t=' + t.toFixed(1) + ' BOUTON AFFICHÉ (' + courant.type + ", jusqu'à " + Math.round(courant.fin) + ' s)');
      }
      bouton.style.display = 'flex';
      ancrer();
    }

    // la vidéo apparaît souvent longtemps après la page
    let dernierEtatSon = '';
    setInterval(function () {
      const v = document.querySelector('video');
      if (v && v !== video) {
        video = v; sautes = {};
        JOURNAL.ligne('vidéo trouvée sur ' + location.hostname + ' (durée ' + (isFinite(v.duration) ? Math.round(v.duration) + ' s' : 'inconnue') + ')');
        Son.brancher(v);
        v.addEventListener('timeupdate', surveiller);
        v.addEventListener('seeked', surveiller);
        v.addEventListener('ended', function () { Son.ranger(); });
      }
      chapitresDuLecteur();
      surveiller();

      // Un mot sur l'état du son, pour le diagnostic affiché côté site : c'est la seule façon de
      // savoir, après coup, si le bouton s'est fié à l'oreille ou seulement à AniSkip.
      try {
        const e = !video ? 'pas de vidéo sur cette page'
          : (!Son.analyseur ? "non analysable (son déjà capté par le lecteur, ou d'un autre domaine)"
            : (Son.energies.length ? 'analysable, ' + Math.round(Son.energies.length * Son.PAS) + ' s relevées'
              : 'analysable, rien de relevé (son coupé, volume à zéro ou lecture en pause)'));
        // Avec l'état du son part tout ce que seule la page du lecteur connaît : c'est ce qui
        // permet au signalement d'être complet sans que l'utilisateur ait à fouiller.
        const detail = {
          hote: location.hostname,
          duree: video && isFinite(video.duration) ? Math.round(video.duration) : null,
          position: video ? Math.round(video.currentTime) : null,
          enPause: video ? !!video.paused : null,
          volume: video ? Math.round(video.volume * 100) : null,
          repères: chapitresRanges ? chapitresRanges.map(function (r) {
            return r.type + ' ' + Math.round(r.debut) + '→' + Math.round(r.fin);
          }).join(', ') : null,
          intervalles: ranges.length ? ranges.map(function (r) {
            return r.type + ' ' + Math.round(r.debut) + '→' + Math.round(r.fin) + (r.sur ? ' (exact)' : '');
          }).join(', ') : null,
          sautAuto: auto,
          videos: document.querySelectorAll('video').length,
          source: (function () {
            try {
              if (!video) return null;
              const src = video.currentSrc || video.src || '';
              if (/^blob:/.test(src)) return 'blob: (flux assemblé en JavaScript)';
              if (!src) return 'aucune (posée sur un <source> ou par MSE)';
              return new URL(src, location.href).hostname;
            } catch (e) { return '(illisible)'; }
          })(),
          provenance: provenanceReperes || null,
          exact: prioriteChapitres,
          calage: (function () {
            try {
              if (!Son.reference) return 'pas de référence sonore figée';
              const s = Son.seuils(Son.reference);
              return 'référence ' + Son.reference.toFixed(1) + ', seuils ' + s.strict.toFixed(1) +
                ' / ' + s.souple.toFixed(1) + ', ' + Son.energies.length + ' relevés';
            } catch (e) { return '(illisible)'; }
          })(),
          dernierSaut: dernierSaut || null,
          bouton: !bouton ? 'jamais créé' : (bouton.style.display === 'flex' ? 'affiché' : 'caché'),
        };
        const signature = e + '|' + JSON.stringify(detail);
        if (signature !== dernierEtatSon) {
          dernierEtatSon = signature;
          window.top.postMessage({ cle: CLE, type: 'son', etat: e, detail: detail }, '*');
        }
      } catch (err) { /* page du haut inaccessible : tant pis pour le diagnostic */ }
    }, 700);
  }

  /**
   * Crunchyroll : il ne manque que le geste.
   *
   * Partout ailleurs, l'extension doit deviner les minutages : interroger AniList puis AniSkip,
   * puis recaler le résultat à l'oreille, parce que les minutages publiés valent pour une copie
   * de l'épisode et pas forcément pour celle qu'on regarde. Ici, rien de tout cela n'a lieu
   * d'être : Crunchyroll a encodé l'épisode lui-même, connaît ses repères à la seconde près, et
   * affiche déjà son bouton « Skip Intro ».
   *
   * Et le calage à l'oreille serait de toute façon impossible : leur flux est chiffré, et un
   * navigateur refuse l'analyse sonore d'un flux protégé. Se fier à AniSkip seul rendrait ici un
   * résultat moins bon que ce que le site donne gratuitement.
   *
   * Ce qui manque à leur bouton, c'est qu'il faut le presser. C'est la seule chose qu'on ajoute.
   *
   * Le générique de fin est laissé tranquille, volontairement : sur Crunchyroll, le passer
   * enchaîne sur l'épisode suivant. Personne n'a demandé qu'une extension décide de ça.
   */
  function crunchyroll() {
    const LIBELLES = /^(?:skip intro|passer l'intro|passer l'introduction|intro überspringen|saltar intro|salta introduzione)$/i;
    let presse = 0, derniere = 0;

    function bouton() {
      // Le repère propre d'abord ; les libellés ensuite, pour survivre à un changement de nom.
      const direct = document.querySelector('[data-testid="skipIntroText"]');
      if (direct) return direct.closest('button, [role="button"], a') || direct;
      const candidats = document.querySelectorAll('button, [role="button"], a');
      for (let i = 0; i < candidats.length; i++) {
        const t = (candidats[i].textContent || '').trim();
        if (t && t.length < 40 && LIBELLES.test(t)) return candidats[i];
      }
      return null;
    }

    setInterval(function () {
      let b = null;
      try { b = bouton(); } catch (e) { b = null; }
      if (!b) { derniere = 0; return; }
      const maintenant = Date.now();
      if (derniere) return;            // déjà vu ce bouton : on ne le presse qu'une fois
      derniere = maintenant;
      if (!reglages.auto()) {
        JOURNAL.ligne('Crunchyroll affiche son bouton « passer l\'intro » ; saut automatique désactivé, on n\'y touche pas');
        return;
      }
      try {
        b.click();
        presse++;
        JOURNAL.ligne('Crunchyroll : bouton « passer l\'intro » pressé (' + presse + ')');
      } catch (e) {
        JOURNAL.ligne('Crunchyroll : le bouton a refusé le clic — ' + e);
      }
    }, 700);

    // « noter » appartient à la page du site ; ici on passe par le journal, qui, lui, traverse.
    JOURNAL.ligne('Crunchyroll reconnu : ses repères sont les siens, on ne demande rien à AniSkip');
  }

  // La page du site et celle du lecteur sont deux pages différentes : chacune fait sa part.
  // Crunchyroll est à part : ni catalogue à interroger, ni son à analyser, juste un bouton à
  // presser — et il peut vivre dans la page du site comme dans celle du lecteur.
  if (/(^|\.)crunchyroll\.com$/.test(location.hostname)) {
    if (window.top === window.self) cotéSite();
    crunchyroll();
  } else {
    if (window.top === window.self) cotéSite();
    cotéLecteur();
  }
});

  NOYAU({ json: json, auto: auto, diag: diag, journal: journal, exposerRapport: exposerRapport, version: '3.17', canal: 'script Tampermonkey' });
})();
