// Petit module audio (AudioWorklet) : envoie chaque bloc du micro à la page (js/engine/live-audio.js).
class LaboMic extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor("labo-mic", LaboMic);
