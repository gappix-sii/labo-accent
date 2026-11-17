// Identité du modèle de voix Kokoro, partagée par le worker et l'outil de fabrication des sons
// (tools/fabrique.js) : un son fabriqué porte la révision du modèle qui l'a produit.
export const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
export const VOICE_IDS = ["af_heart", "am_michael"];
export const RATE = 24000; // fréquence de l'audio produit (Hz)
export const GAP = 0.09; // silence entre deux morceaux d'une même phrase (s)
