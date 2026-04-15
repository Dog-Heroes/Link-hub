import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TAB_REGISTRY: Record<string, ComponentType<any>> = {
  LinksTab: dynamic(() => import("./tabs/LinksTab")),
  ShopTab: dynamic(() => import("./tabs/ShopTab")),
  QuizTab: dynamic(() => import("./tabs/QuizTab")),
  StoreLocatorTab: dynamic(() => import("./tabs/StoreLocatorTab")),
};
