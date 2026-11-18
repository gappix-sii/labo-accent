// Appels à Gemini (Google) avec la clé de l'utilisateur (js/core/keys.js), pour la conversation libre (phase 5).
// La clé part seulement dans l'en-tête « x-goog-api-key », jamais dans l'adresse. La CSP (index.html) n'autorise
// que l'adresse HOST en plus de l'appli. Tâche 1 : vérification de la clé ; la conversation arrive en tâche 2.
export const HOST = "https://generativelanguage.googleapis.com";

// Modèles, vérifiés le 2026-11-18 dans la doc de Google (aistudio.google.com/docs/models et /docs/pricing) :
// gratuits avec une clé ; « chat » comprend l'audio et sait répondre en JSON ; « voice » lit un texte à voix haute.
// Seul endroit à changer quand Google en retire un.
export const MODELS = { chat: "gemini-3.8-flash", voice: "gemini-3.8-flash-tts" };
const MODEL_RE = /^[a-z0-9][a-z0-9.-]{1,60}$/;
export const TIMEOUT_MS = 20000;

// Messages clairs pour chaque erreur (codes renvoyés par les fonctions ci-dessous).
export function errorText(code) {
  switch (code) {
    case "no_key": return "Ajoute d'abord ta clé Gemini dans les réglages.";
    case "key": return "Google refuse la clé. Vérifie qu'elle est complète, et, si tu l'as limitée à certains sites, que cette adresse en fait partie.";
    case "model": return "Ce modèle Gemini n'existe pas ou plus chez Google : l'appli doit être mise à jour.";
    case "quota": return "Quota gratuit de Google atteint pour le moment. Réessaie dans une minute, ou demain.";
    case "server": return "Les serveurs de Google ne répondent pas correctement. Réessaie dans un instant.";
    case "timeout": return "Google met trop de temps à répondre. Réessaie.";
    case "offline": return "Pas de connexion à Internet.";
    case "network": return "Impossible de joindre Google (connexion coupée, ou appel bloqué par le navigateur).";
    default: return "Réponse inattendue de Google.";
  }
}

// Code d'erreur pour une réponse HTTP qui n'est pas « 200 OK ».
export function statusCode(status) {
  if (status === 400 || status === 401 || status === 403) return "key";
  if (status === 404) return "model";
  if (status === 429) return "quota";
  if (status >= 500) return "server";
  return "unexpected";
}

// Appel commun : clé dans l'en-tête, aucun cookie, pas de redirection, délai borné.
// « strict-origin » : Google reçoit seulement l'adresse du site (sans la page), ce qui permet de limiter la clé à ce site.
// Renvoie { ok: true, data } ou { ok: false, error: code }.
export async function request(path, key, { method = "GET", body, fetchFn = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
  if (!key) return { ok: false, error: "no_key" };
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  let r;
  try {
    r = await fetchFn(`${HOST}/v1beta/${path}`, {
      method, mode: "cors", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "strict-origin",
      signal: ctl.signal,
      headers: body === undefined ? { "x-goog-api-key": key } : { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (e) {
    const offline = globalThis.navigator && globalThis.navigator.onLine === false;
    return { ok: false, error: ctl.signal.aborted ? "timeout" : offline ? "offline" : "network" };
  } finally { clearTimeout(timer); }
  if (!r.ok) return { ok: false, error: statusCode(r.status) };
  try { return { ok: true, data: await r.json() }; } catch { return { ok: false, error: "unexpected" }; }
}

// Vérifie la clé en demandant à Google la fiche du modèle de conversation (ne génère rien).
// Renvoie { ok: true, name } (nom affichable du modèle) ou { ok: false, error: code }.
export async function checkKey(key, opts = {}) {
  const model = opts.model || MODELS.chat;
  if (!MODEL_RE.test(model)) return { ok: false, error: "model" };
  const r = await request(`models/${model}`, key, opts);
  if (!r.ok) return r;
  const d = r.data;
  if (!d || typeof d !== "object" || d.name !== `models/${model}`) return { ok: false, error: "unexpected" };
  const name = typeof d.displayName === "string" ? d.displayName.replace(/[\u0000-\u001f<>]/g, "").slice(0, 80) : "";
  return { ok: true, name: name || model };
}
