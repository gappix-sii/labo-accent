// Tests texte -> phonèmes pour la voix naturelle (même notation que kokoro.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { phonemize, chunks, wordIpa } from "../js/engine/g2p.js";
import { numberWords, yearWords, ordinalWords } from "../js/engine/numbers.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));

test("phrases du jeu de tests de kokoro.js", () => {
  assert.equal(phonemize(dict, "Hello World"), "həlˈoʊ wˈɜːld");
  assert.equal(phonemize(dict, "Mr. Smith"), "mˈɪstɚ smˈɪθ");
  assert.equal(phonemize(dict, "1,000"), "wˈʌn θˈaʊzənd");
  assert.equal(phonemize(dict, "10-20"), "tˈɛn tə twˈɛnti");
  assert.equal(phonemize(dict, "Cat's tail"), "kˈæts tˈeɪl");
  assert.equal(phonemize(dict, "12.34"), "twˈɛlv pˈɔɪnt θɹˈiː fˈɔːɹ");
  assert.equal(phonemize(dict, "$100"), "wˈʌn hˈʌndɹəd dˈɑːlɚz");
});

test("débit naturel : « the » devant voyelle, petits mots atones, t battu américain", () => {
  assert.equal(phonemize(dict, "The apple is on the table."), "ði ˈæpəl ɪz ɑːn ðə tˈeɪbəl.");
  assert.match(phonemize(dict, "better water"), /bˈɛɾɚ wˈɔːɾɚ/);
  assert.equal(phonemize(dict, "It's 7:05."), "ˈɪts sˈɛvən ˈoʊ fˈaɪv.");
  assert.equal(phonemize(dict, "Meet me at 10:00 (maybe)."), "mˈiːt miː æt tˈɛn əklˈɑːk, mˈeɪbi.");
});

test("mots inconnus et sigles", () => {
  assert.match(wordIpa(dict, "Zorblaxian"), /^[a-zɑæəʌɔɛɜɚɪᵻiʊuoeaɡŋɹɾʃʒθðˈˌː ]+$/);
  assert.equal(wordIpa(dict, "BBQX"), "bˈiː bˈiː kjˈuː ˈɛks");
  assert.ok(!/g/.test(phonemize(dict, "a good big game")), "« ɡ » (U+0261) de Kokoro, jamais « g »");
});

test("un long texte est découpé en morceaux de 380 symboles au plus", () => {
  const long = "This is a long sentence, with many words, that keeps going and going, because the coach likes to talk a lot about English. ".repeat(4);
  const cs = chunks(dict, long);
  assert.ok(cs.length >= 3);
  assert.ok(cs.every((c) => c.length > 0 && c.length <= 380));
  assert.deepEqual(chunks(dict, ""), []);
});

test("nombres en toutes lettres", () => {
  assert.equal(numberWords(0), "zero");
  assert.equal(numberWords(42), "forty-two");
  assert.equal(numberWords(105), "one hundred and five");
  assert.equal(numberWords(2026), "two thousand and twenty-six");
  assert.equal(yearWords(1984), "nineteen eighty-four");
  assert.equal(yearWords(2005), "two thousand and five");
  assert.equal(ordinalWords(21), "twenty-first");
  assert.equal(ordinalWords(12), "twelfth");
  assert.throws(() => numberWords(-1), RangeError);
});
