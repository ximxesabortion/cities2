import type { ModRegistrar } from "cs2/modding";
import { Stacklight } from "./stacklight";
import "./stacklight.module.scss";

const register: ModRegistrar = (moduleRegistry) => {
  moduleRegistry.append("Game", Stacklight);
  moduleRegistry.append("Editor", Stacklight);
};

export const hasCSS = true;
export default register;
