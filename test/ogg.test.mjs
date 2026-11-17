// Tests de l'emballage Ogg Opus des sons fabriqués à l'avance (phase 2, tâche 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32, muxOggOpus, readOgg, page } from "../tools/ogg-opus.mjs";

const bytes = (n, fill) => new Uint8Array(n).fill(fill);

test("CRC de Ogg : valeur de contrôle de référence", () => {
  // CRC-32 « POSIX » sans inversion finale : 0x765E7680 ^ 0xFFFFFFFF
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0x89a1897f);
});

test("fichier Ogg Opus bien formé : en-têtes, pages, CRC, durée", () => {
  const packets = Array.from({ length: 120 }, (_, i) => ({ data: bytes(60 + (i % 7), i), samples: 960 }));
  const file = muxOggOpus(packets, { length48: 120 * 960 - 500, preSkip: 312 });
  const pages = readOgg(file); // lève une erreur si un CRC est faux
  assert.equal(pages.length, 2 + 3); // OpusHead, OpusTags, puis 50 + 50 + 20 paquets
  assert.equal(pages[0].type, 2, "début du flux");
  assert.equal(pages.at(-1).type, 4, "fin du flux");
  assert.deepEqual(pages.map((p) => p.seq), [0, 1, 2, 3, 4]);
  assert.equal(new TextDecoder().decode(pages[0].packets[0].subarray(0, 8)), "OpusHead");
  assert.equal(new DataView(pages[0].packets[0].buffer).getUint16(10, true), 312, "pré-saut");
  assert.equal(new TextDecoder().decode(pages[1].packets[0].subarray(0, 8)), "OpusTags");
  assert.equal(pages[2].granule, 50n * 960n);
  assert.equal(pages.at(-1).granule, BigInt(312 + 120 * 960 - 500), "la fin réelle du son");
  const back = pages.slice(2).flatMap((p) => p.packets);
  assert.equal(back.length, 120);
  assert.deepEqual(back[7], packets[7].data);
});

test("paquets de 255 octets et plus : découpage en segments", () => {
  const p = page({ serial: 1, seq: 0, packets: [bytes(255, 1), bytes(510, 2), bytes(3, 3)] });
  assert.deepEqual([...p.subarray(27, 27 + p[26])], [255, 0, 255, 255, 0, 3]);
  const [back] = readOgg(p);
  assert.deepEqual(back.packets.map((x) => x.length), [255, 510, 3]);
});

test("un octet modifié est détecté", () => {
  const file = muxOggOpus([{ data: bytes(40, 9), samples: 960 }]);
  file[file.length - 1] ^= 1;
  assert.throws(() => readOgg(file), /CRC/);
});
