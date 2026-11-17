/* Relais de requêtes : utilisé seulement si la page empêche le script de contenu d'appeler les API. */
chrome.runtime.onMessage.addListener(function (msg, expediteur, repondre) {
  if (!msg || msg.type !== 'po-json') return;
  fetch(msg.url, msg.options || {})
    .then(function (r) { return r.text(); })
    .then(function (t) { repondre({ texte: t }); })
    .catch(function (e) { repondre({ erreur: String(e) }); });
  return true; // réponse asynchrone
});
