// Toutes les phrases fixes de l'appli : chacune a son son fabriqué à l'avance (tools/fabrique.html),
// et test/clips.test.mjs vérifie qu'aucune ne manque.
import { SENTENCES } from "./sentences.js";
import { LESSONS } from "./lessons.js";

export function fixedTexts() {
  return [...new Set([...SENTENCES.map((s) => s.en), ...LESSONS.flatMap((l) => l.items.map((it) => it.en))])];
}
