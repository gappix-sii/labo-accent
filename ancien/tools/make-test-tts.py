# Fabrique un faux modèle Kokoro (même interface : input_ids, style, speed -> waveform) pour tester
# toute la chaîne de la voix naturelle dans le navigateur sans télécharger 92 Mo.
# Usage : python3 tools/make-test-tts.py test/model/onnx-community/Kokoro-82M-v1.0-ONNX
import json, os, sys
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

out = sys.argv[1]
os.makedirs(os.path.join(out, "onnx"), exist_ok=True)
t = np.arange(600) / 24000
seg = (0.2 * np.sin(2 * np.pi * 330 * t)).astype(np.float32)  # 25 ms de son par symbole
nodes = [
    helper.make_node("Shape", ["input_ids"], ["shp"]),
    helper.make_node("Gather", ["shp", "one"], ["n"], axis=0),
    helper.make_node("Tile", ["seg", "n"], ["wav0"]),
    helper.make_node("ReduceSum", ["style"], ["ssum"], keepdims=0),
    helper.make_node("Mul", ["ssum", "zero"], ["s0"]),
    helper.make_node("Mul", ["speed", "zero"], ["v0"]),
    helper.make_node("Add", ["s0", "v0"], ["sv"]),
    helper.make_node("Add", ["wav0", "sv"], ["waveform"]),
]
graph = helper.make_graph(
    nodes, "fake_kokoro",
    [helper.make_tensor_value_info("input_ids", TensorProto.INT64, [1, "N"]),
     helper.make_tensor_value_info("style", TensorProto.FLOAT, [1, 256]),
     helper.make_tensor_value_info("speed", TensorProto.FLOAT, [1])],
    [helper.make_tensor_value_info("waveform", TensorProto.FLOAT, ["M"])],
    [numpy_helper.from_array(seg, "seg"), numpy_helper.from_array(np.array([1], dtype=np.int64), "one"),
     numpy_helper.from_array(np.array(0, dtype=np.float32), "zero")],
)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
model.ir_version = 8
onnx.checker.check_model(model)
onnx.save(model, os.path.join(out, "onnx", "model_quantized.onnx"))

symbols = list(";:,.!?—…\"“” ") + list("abcdefhijklmnopqrstuvwxyz") + list("ɑɐæɔəɚɛɜɡɪᵻʊʌŋɹɾʃʒθðˈˌː")
vocab = {"$": 0}
for c in symbols:
    vocab.setdefault(c, len(vocab))
tok = {
    "version": "1.0", "truncation": None, "padding": None, "added_tokens": [],
    "normalizer": None,
    "pre_tokenizer": {"type": "Split", "pattern": {"Regex": ""}, "behavior": "Isolated", "invert": False},
    "post_processor": {"type": "TemplateProcessing",
                       "single": [{"SpecialToken": {"id": "$", "type_id": 0}}, {"Sequence": {"id": "A", "type_id": 0}}, {"SpecialToken": {"id": "$", "type_id": 0}}],
                       "pair": [{"Sequence": {"id": "A", "type_id": 0}}, {"Sequence": {"id": "B", "type_id": 1}}],
                       "special_tokens": {"$": {"id": "$", "ids": [0], "tokens": ["$"]}}},
    "decoder": None,
    "model": {"vocab": vocab},
}
json.dump(tok, open(os.path.join(out, "tokenizer.json"), "w"), ensure_ascii=False)
json.dump({"model_max_length": 512, "pad_token": "$", "unk_token": "$"}, open(os.path.join(out, "tokenizer_config.json"), "w"))
json.dump({"model_type": "style_text_to_speech_2"}, open(os.path.join(out, "config.json"), "w"), indent=2)
print("ok", out)
