// Banc de test du moteur (PLAN.md, phase 1, tâche 7) : chaque phrase dite « soignée » puis « avec fautes ».
// Réussi si les fautes volontaires sont repérées sur le bon son et si la diction soignée note nettement mieux.
import { html } from "../core/dom.js";
import { SENTENCES } from "../content/sentences.js";

// Dernier essai de chaque type pour chaque phrase.
export function latest(S) {
  const rows = SENTENCES.map(() => ({ soigné: null, fautes: null }));
  for (const e of S.log) if (rows[e.s]) rows[e.s][e.kind] = e;
  return rows;
}

// Sons attendus (fautes volontaires) effectivement signalés par le moteur.
export function caught(i, entry) {
  const bad = new Set(entry ? entry.bad.map((b) => b.p) : []);
  return SENTENCES[i].expect.map((p) => ({ p, ok: bad.has(p) }));
}

export function summary(S) {
  const rows = latest(S);
  let done = 0, gap = 0, hits = 0, wanted = 0;
  rows.forEach((r, i) => {
    if (!r.soigné || !r.fautes) return;
    done++;
    if (r.soigné.score - r.fautes.score >= 15) gap++;
    const c = caught(i, r.fautes);
    hits += c.filter((x) => x.ok).length; wanted += c.length;
  });
  return { done, gap, hits, wanted };
}

export function kindBlock(S, busy) {
  const s = SENTENCES[S.sentence % SENTENCES.length];
  return html`<div class="kind" role="group" aria-label="Type d'essai">
      <button class="chip${S.kind === "soigné" ? " on" : ""}" data-act="kind-soigné" type="button" aria-pressed="${S.kind === "soigné" ? "true" : "false"}" ${busy ? "disabled" : ""}>Essai soigné</button>
      <button class="chip${S.kind === "fautes" ? " on" : ""}" data-act="kind-fautes" type="button" aria-pressed="${S.kind === "fautes" ? "true" : "false"}" ${busy ? "disabled" : ""}>Essai avec fautes</button>
    </div>
    ${S.kind === "fautes" ? html`<p class="small fault">À faire exprès : ${s.fault}</p>` : html`<p class="muted small">Dis la phrase le mieux possible.</p>`}`;
}

export function benchBlock(S) {
  const rows = latest(S), sum = summary(S);
  return html`<h2>Banc de test du moteur</h2>
    <p class="muted small">Pour chaque phrase : un essai soigné, puis un essai avec fautes. ${sum.done} / ${SENTENCES.length} phrases faites.</p>
    <div class="table-wrap"><table class="bench">
      <thead><tr><th>#</th><th>Soigné</th><th>Fautes</th><th>Fautes repérées</th></tr></thead>
      <tbody>${rows.map((r, i) => html`<tr class="${i === S.sentence % SENTENCES.length ? "cur" : ""}">
        <td>${i + 1}</td>
        <td>${r.soigné ? r.soigné.score : "–"}</td>
        <td>${r.fautes ? r.fautes.score : "–"}</td>
        <td>${r.fautes ? caught(i, r.fautes).map((c) => html`<span class="${c.ok ? "hit" : "miss"}">${c.p} ${c.ok ? "✓" : "✗"}</span> `) : "–"}</td>
      </tr>`)}</tbody>
    </table></div>
    ${sum.done ? html`<p class="small">Écart net (≥ 15 points) : ${sum.gap} / ${sum.done} · fautes repérées : ${sum.hits} / ${sum.wanted}</p>` : ""}
    <button class="btn ghost" data-act="copy-log" type="button">Copier les résultats</button>`;
}

// Texte à coller dans la conversation avec Claude.
export function benchText(S) {
  const rows = latest(S), sum = summary(S);
  const fmt = (e) => (e ? `${e.score}${e.bad.length ? ` (signalés : ${e.bad.map((b) => b.heard ? `${b.p}→${b.heard}` : `${b.p} absent`).join(", ")})` : ""}` : "pas fait");
  const lines = rows.map((r, i) => `${i + 1}. ${SENTENCES[i].en}\n   soigné : ${fmt(r.soigné)}\n   fautes : ${fmt(r.fautes)}`
    + (r.fautes ? `\n   attendus : ${caught(i, r.fautes).map((c) => `${c.p} ${c.ok ? "oui" : "NON"}`).join(", ")}` : ""));
  return `Banc de test du moteur — ${new Date().toLocaleString("fr-FR")}\n${lines.join("\n")}\n`
    + `Bilan : ${sum.done}/10 phrases, écart net ${sum.gap}/${sum.done}, fautes repérées ${sum.hits}/${sum.wanted}`;
}
