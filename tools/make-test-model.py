# Fabrique un mini-modèle ONNX qui imite l'interface du vrai modèle (input_values -> logits [1,T,44])
# pour tester le chargement et l'inférence dans le navigateur sans télécharger 355 Mo.
# Usage : python3 tools/make-test-model.py test/model/robg/speako-phoneme-recognizer
import json, os, sys
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

out = sys.argv[1]
os.makedirs(os.path.join(out, "onnx"), exist_ok=True)
rng = np.random.default_rng(0)
W = (rng.standard_normal((44, 1, 400)) * 0.05).astype(np.float32)  # Conv1d: 44 canaux, noyau 400, pas 320
B = np.zeros(44, dtype=np.float32)
B[41] = 0.5  # biais vers le blanc CTC

nodes = [
    helper.make_node("Unsqueeze", ["input_values", "axes"], ["x3"]),
    helper.make_node("Conv", ["x3", "W", "B"], ["c"], strides=[320], kernel_shape=[400]),
    helper.make_node("Transpose", ["c"], ["logits"], perm=[0, 2, 1]),
]
graph = helper.make_graph(
    nodes, "tiny_ctc",
    [helper.make_tensor_value_info("input_values", TensorProto.FLOAT, [1, "N"])],
    [helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, "T", 44])],
    [numpy_helper.from_array(W, "W"), numpy_helper.from_array(B, "B"),
     numpy_helper.from_array(np.array([1], dtype=np.int64), "axes")],
)
model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
model.ir_version = 8
onnx.checker.check_model(model)
onnx.save(model, os.path.join(out, "onnx", "model_quantized.onnx"))

json.dump({"model_type": "wav2vec2", "architectures": ["Wav2Vec2ForCTC"], "vocab_size": 44, "pad_token_id": 41},
          open(os.path.join(out, "config.json"), "w"))
json.dump({"feature_extractor_type": "Wav2Vec2FeatureExtractor", "sampling_rate": 16000, "feature_size": 1,
           "do_normalize": True, "padding_side": "right", "padding_value": 0.0, "return_attention_mask": False},
          open(os.path.join(out, "preprocessor_config.json"), "w"))
print("ok", out)
