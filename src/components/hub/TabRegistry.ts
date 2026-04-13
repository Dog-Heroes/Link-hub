import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export const TAB_REGISTRY: Record<string, ComponentType> = {
  LinksTab: dynamic(() => import("./tabs/LinksTab")),
  ShopTab: dynamic(() => import("./tabs/ShopTab")),
  QuizTab: dynamic(() => import("./tabs/QuizTab")),
  StoreLocatorTab: dynamic(() => import("./tabs/StoreLocatorTab")),
};
