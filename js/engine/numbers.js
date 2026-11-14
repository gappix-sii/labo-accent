// Nombres en toutes lettres (anglais), pour que la voix lise « 12 » comme « twelve ».
// Repris de l'ancienne appli (ancien/js/basics.js). Code pur, sans DOM.
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under100(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""); }

// « and » après hundred/thousand (one hundred and five) : courant aussi en américain parlé.
export function numberWords(n) {
  n = Math.floor(n);
  if (n < 0 || n > 999999999) throw new RangeError("nombre hors limites");
  if (n < 100) return under100(n);
  if (n < 1000) { const r = n % 100; return ONES[Math.floor(n / 100)] + " hundred" + (r ? " and " + under100(r) : ""); }
  const big = n < 1e6 ? [1000, "thousand"] : [1e6, "million"];
  const head = Math.floor(n / big[0]), r = n % big[0];
  return numberWords(head) + " " + big[1] + (r ? (r < 100 ? " and " : " ") + numberWords(r) : "");
}

export function yearWords(y) {
  if (y >= 2000 && y <= 2009) return "two thousand" + (y % 10 ? " and " + ONES[y % 10] : "");
  const h = Math.floor(y / 100), r = y % 100;
  if (y < 1000 || y > 2099) return numberWords(y);
  if (!r) return under100(h) + " hundred";
  return under100(h) + " " + (r < 10 ? "oh " + ONES[r] : under100(r));
}

const ORD = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
export function ordinalWords(n) {
  const w = numberWords(n), parts = w.split(/([ -])/), last = parts.pop();
  const o = ORD[last] || (last.endsWith("y") ? last.slice(0, -1) + "ieth" : last + "th");
  return parts.join("") + o;
}
