// Point d'entrée de l'appli.
import { $ } from "./core/dom.js";
import { load } from "./core/store.js";
import { mountSay } from "./screens/say.js";

mountSay($("#view"), load());
