const boite = document.getElementById('auto');
chrome.storage.local.get({ auto: false, diag: null, journal: [] }, function (v) {
  boite.checked = !!v.auto;
  const d = v.diag || {};
  const mettre = function (id, val) { document.getElementById(id).textContent = (val === undefined || val === null || val === '') ? '—' : String(val); };
  mettre('site', d.site || d.hote);
  mettre('titre', d.titre);
  mettre('saison', d.saison);
  mettre('episode', d.episode);
  mettre('mal', d.mal);
  mettre('son', d.son);
  const lignes = (v.journal || []);
  document.getElementById('journal').textContent = lignes.length ? lignes.join('\n')
    : "Journal vide. Lance la lecture d'un épisode jusqu'au générique, puis rouvre cette fenêtre.";
  document.getElementById('copier').addEventListener('click', function () {
    const b = document.getElementById('copier');
    navigator.clipboard.writeText(lignes.join('\n')).then(function () {
      b.textContent = 'Copié'; setTimeout(function () { b.textContent = 'Copier le journal'; }, 1500);
    }, function () { b.textContent = 'Copie refusée'; });
  });
  mettre('etat', d.etat);
});
boite.addEventListener('change', function () { chrome.storage.local.set({ auto: boite.checked }); });
