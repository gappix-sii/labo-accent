// Emballe des paquets Opus (produits par l'encodeur WebCodecs du navigateur) dans un fichier Ogg,
// le format « .ogg » que Chrome lit directement. Sans dépendance ; utilisé par tools/fabrique.js.
// Références : RFC 3533 (Ogg) et RFC 7845 (Opus dans Ogg).

// CRC de Ogg : polynôme 0x04C11DB7, valeur de départ 0, sans inversion.
const TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let r = i << 24;
  for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
  TABLE[i] = r >>> 0;
}
export function crc32(bytes) {
  let c = 0;
  for (let i = 0; i < bytes.length; i++) c = ((c << 8) ^ TABLE[((c >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
  return c;
}

// Une page Ogg : en-tête de 27 octets, table des segments, puis les paquets bout à bout.
export function page({ type = 0, granule = 0n, serial, seq, packets }) {
  const lacing = [];
  for (const p of packets) {
    let n = p.length;
    while (n >= 255) { lacing.push(255); n -= 255; }
    lacing.push(n); // un paquet de 255 × k octets se termine par un segment de 0
  }
  if (lacing.length > 255) throw new Error("page Ogg trop grande");
  const body = packets.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(27 + lacing.length + body);
  const v = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53]); // « OggS »
  v.setUint8(4, 0); // version
  v.setUint8(5, type); // 1 = suite, 2 = début du flux, 4 = fin du flux
  v.setBigInt64(6, BigInt(granule), true);
  v.setUint32(14, serial >>> 0, true);
  v.setUint32(18, seq >>> 0, true);
  v.setUint8(26, lacing.length);
  out.set(lacing, 27);
  let o = 27 + lacing.length;
  for (const p of packets) { out.set(p, o); o += p.length; }
  v.setUint32(22, crc32(out), true); // CRC calculé avec ce champ à 0
  return out;
}

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

export function opusHead({ channels = 1, preSkip = 312, inputRate = 24000 } = {}) {
  const h = new Uint8Array(19), v = new DataView(h.buffer);
  h.set(ascii("OpusHead"));
  v.setUint8(8, 1); // version
  v.setUint8(9, channels);
  v.setUint16(10, preSkip, true);
  v.setUint32(12, inputRate, true);
  v.setInt16(16, 0, true); // gain
  v.setUint8(18, 0); // mono ou stéréo, sans table de canaux
  return h;
}

export function opusTags(vendor = "labo-accent") {
  const ven = ascii(vendor), t = new Uint8Array(8 + 4 + ven.length + 4), v = new DataView(t.buffer);
  t.set(ascii("OpusTags"));
  v.setUint32(8, ven.length, true);
  t.set(ven, 12);
  v.setUint32(12 + ven.length, 0, true); // aucun commentaire
  return t;
}

// packets : [{ data: Uint8Array, samples: durée du paquet en échantillons à 48 kHz }]
// length48 : durée réelle du son à 48 kHz (la fin du dernier paquet, du remplissage, est coupée).
export function muxOggOpus(packets, { length48, preSkip = 312, inputRate = 24000, channels = 1, serial = 0x4c61626f, perPage = 50 } = {}) {
  if (!packets.length) throw new Error("aucun paquet Opus");
  const pages = [
    page({ type: 2, granule: 0n, serial, seq: 0, packets: [opusHead({ channels, preSkip, inputRate })] }),
    page({ type: 0, granule: 0n, serial, seq: 1, packets: [opusTags()] })
  ];
  const total = packets.reduce((a, p) => a + p.samples, 0);
  const end = length48 === undefined ? total : Math.min(total, preSkip + length48);
  let pos = 0, seq = 2;
  for (let i = 0; i < packets.length; i += perPage) {
    const group = packets.slice(i, i + perPage);
    pos += group.reduce((a, p) => a + p.samples, 0);
    const last = i + perPage >= packets.length;
    // granule = échantillons décodés jusqu'à la fin de la page (pré-saut compris) ;
    // sur la dernière page, il marque la vraie fin du son.
    pages.push(page({ type: last ? 4 : 0, granule: BigInt(last ? end : pos), serial, seq: seq++, packets: group.map((p) => p.data) }));
  }
  const out = new Uint8Array(pages.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of pages) { out.set(p, o); o += p.length; }
  return out;
}

// Relit un fichier Ogg (tests, et contrôle avant envoi) : pages, paquets, CRC vérifié.
export function readOgg(bytes) {
  const pages = [];
  let o = 0;
  while (o < bytes.length) {
    if (String.fromCharCode(...bytes.subarray(o, o + 4)) !== "OggS") throw new Error("page Ogg invalide à l'octet " + o);
    const v = new DataView(bytes.buffer, bytes.byteOffset + o);
    const n = bytes[o + 26], lacing = [...bytes.subarray(o + 27, o + 27 + n)];
    const size = 27 + n + lacing.reduce((a, b) => a + b, 0);
    const raw = bytes.slice(o, o + size), crc = v.getUint32(22, true);
    raw.fill(0, 22, 26);
    if (crc32(raw) !== crc) throw new Error("CRC faux, page " + pages.length);
    const packets = [];
    let p = o + 27 + n, cur = [];
    for (const l of lacing) {
      cur.push(bytes.subarray(p, p + l)); p += l;
      if (l < 255) { packets.push(Uint8Array.from(cur.flatMap((c) => [...c]))); cur = []; }
    }
    pages.push({ type: bytes[o + 5], granule: v.getBigInt64(6, true), serial: v.getUint32(14, true), seq: v.getUint32(18, true), packets });
    o += size;
  }
  return pages;
}
