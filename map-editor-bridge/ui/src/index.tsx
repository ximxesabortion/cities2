import type { ModRegistrar } from "cs2/modding";
import {
  ConstructionMenuUnavailable,
  installEditorAssetUnlock,
  NormalConstructionMenus,
  resolveConstructionRuntime
} from "./normal-construction-menus";
import { ModListMenu, MoveItMiniPanel } from "./mod-list-menu";
import "./mod-list-menu.module.scss";

const register: ModRegistrar = (moduleRegistry) => {
  installEditorAssetUnlock(moduleRegistry);
  const constructionRuntime = resolveConstructionRuntime();

  const ConstructionMenu = () =>
    constructionRuntime ? (
      <NormalConstructionMenus runtime={constructionRuntime} />
    ) : (
      <ConstructionMenuUnavailable message="Base construction UI modules were not found." />
    );

  moduleRegistry.append("Editor", ConstructionMenu, 0);
  moduleRegistry.append("Editor", ModListMenu);
  moduleRegistry.append("Editor", MoveItMiniPanel);
};

// The CS2 UI loader uses this named export to decide whether to load the
// matching stylesheet. The official template normally injects it at build time.
export const hasCSS = true;
export default register;
