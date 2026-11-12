// SHA-256 incrémental (en flux) en JavaScript pur : WebCrypto ne sait pas hacher un fichier morceau par morceau.
// Utilisé par les workers pour vérifier les gros modèles pendant leur téléchargement, sans copie supplémentaire en mémoire.
const K = new Int32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

export class Sha256 {
    constructor() {
      this.h = new Int32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
      this.w = new Int32Array(64);
      this.buf = new Uint8Array(64);
      this.bufLen = 0;
      this.total = 0;
    }
    _blocks(d, off, end) {
      const w = this.w, h = this.h;
      let h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3], h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];
      for (; off + 64 <= end; off += 64) {
        for (let i = 0; i < 16; i++) {
          const j = off + i * 4;
          w[i] = (d[j] << 24) | (d[j + 1] << 16) | (d[j + 2] << 8) | d[j + 3];
        }
        for (let i = 16; i < 64; i++) {
          const a = w[i - 15], b = w[i - 2];
          const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
          const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let a = h0, b = h1, c = h2, dd = h3, e = h4, f = h5, gg = h6, hh = h7;
        for (let i = 0; i < 64; i++) {
          const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
          const ch = (e & f) ^ (~e & gg);
          const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
          const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
          const mj = (a & b) ^ (a & c) ^ (b & c);
          const t2 = (S0 + mj) | 0;
          hh = gg; gg = f; f = e; e = (dd + t1) | 0; dd = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + dd) | 0;
        h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + gg) | 0; h7 = (h7 + hh) | 0;
      }
      h[0] = h0; h[1] = h1; h[2] = h2; h[3] = h3; h[4] = h4; h[5] = h5; h[6] = h6; h[7] = h7;
      return off;
    }
    update(data) {
      const d = data instanceof Uint8Array ? data : new Uint8Array(data);
      this.total += d.length;
      let off = 0;
      if (this.bufLen) {
        const need = 64 - this.bufLen;
        if (d.length < need) { this.buf.set(d, this.bufLen); this.bufLen += d.length; return this; }
        this.buf.set(d.subarray(0, need), this.bufLen);
        this._blocks(this.buf, 0, 64);
        this.bufLen = 0; off = need;
      }
      off = this._blocks(d, off, d.length);
      if (off < d.length) { this.buf.set(d.subarray(off), 0); this.bufLen = d.length - off; }
      return this;
    }
    hex() {
      const bits = this.total * 8;
      const pad = new Uint8Array(((this.bufLen + 9 + 63) >> 6) << 6);
      pad.set(this.buf.subarray(0, this.bufLen));
      pad[this.bufLen] = 0x80;
      const hi = Math.floor(bits / 0x100000000), lo = bits >>> 0, n = pad.length;
      pad[n - 8] = hi >>> 24; pad[n - 7] = hi >>> 16; pad[n - 6] = hi >>> 8; pad[n - 5] = hi;
      pad[n - 4] = lo >>> 24; pad[n - 3] = lo >>> 16; pad[n - 2] = lo >>> 8; pad[n - 1] = lo;
      this._blocks(pad, 0, n);
      let out = "";
      for (let i = 0; i < 8; i++) out += (this.h[i] >>> 0).toString(16).padStart(8, "0");
      return out;
    }
  }
