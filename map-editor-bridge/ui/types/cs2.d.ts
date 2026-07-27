declare module "cs2/modding" {
  import type { ComponentType } from "react";

  export type AppendHookTargets =
    | "Menu"
    | "Editor"
    | "Game"
    | "GameTopLeft"
    | "GameTopRight"
    | "GameBottomRight"
    | "UniversalModMenu";

  export type ModuleRegistry = {
    get(modulePath: string, exportName: string): unknown;
    override(
      modulePath: string,
      exportName: string,
      newValue: unknown
    ): void;
    append(
      target: AppendHookTargets,
      component: ComponentType<Record<string, never>> | (() => JSX.Element),
      index?: number
    ): void;
  };

  export type ModRegistrar = (moduleRegistry: ModuleRegistry) => void;

  export function getModule(
    modulePath: string,
    exportName: string
  ): unknown;
}

declare module "cs2/api" {
  export interface ValueBinding<T> {
    readonly value: T;
  }

  export function bindValue<T>(
    group: string,
    name: string,
    fallbackValue?: T
  ): ValueBinding<T>;

  export function trigger(
    group: string,
    name: string,
    ...args: unknown[]
  ): void;

  export function useValue<T>(binding: ValueBinding<T>): T;
}

declare module "*.scss" {
  const classes: Record<string, string>;
  export default classes;
}
