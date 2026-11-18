// Nettoyage de l'ancienne appli (phase 7, tâche 4 ; précaution (a) de la tâche 6 de la phase 1).
// L'ancienne version du Labo d'accent installait un « service worker » à cette adresse (sw.js) : un petit programme
// que le navigateur garde et qui servait l'appli depuis son cache, même après une mise à jour du site.
// Les navigateurs qui l'ont encore vont, en revenant sur le site, télécharger ce fichier-ci à la place : il efface
// les caches de l'ancienne appli, se désinstalle, puis recharge la page, qui affiche alors la nouvelle version.
// Il ne sert aucune page lui-même (pas d'écouteur « fetch »). Le vrai mode hors ligne arrive en phase 9.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Seulement les caches de l'ancienne appli (« labo-… ») : le moteur déjà téléchargé (« transformers-cache », 355 Mo,
    // même modèle et même révision que la nouvelle appli) et les autres sites de gappix-sii.github.io sont gardés.
    for (const key of await caches.keys()) if (key.startsWith("labo-")) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
