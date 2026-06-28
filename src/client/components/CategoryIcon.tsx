// src/client/components/CategoryIcon.tsx
//
// Categories store their icon as a Tabler icon name string (per spec,
// e.g. "home", "shopping-bag"). This maps that string to the actual
// @tabler/icons-react component. Add new mappings here as new
// categories are introduced — the fallback covers anything unmapped
// so a typo'd icon name never crashes the UI.

import {
  IconHome,
  IconToolsKitchen2,
  IconCar,
  IconShoppingBag,
  IconDeviceTv,
  IconHeartRateMonitor,
  IconBook,
  IconChartLine,
  IconBolt,
  IconConfetti,
  IconBuildingBank,
  IconDotsCircleHorizontal,
  type IconProps,
} from "@tabler/icons-react";
import type { FC } from "react";

const ICON_MAP: Record<string, FC<IconProps>> = {
  home: IconHome,
  "tools-kitchen-2": IconToolsKitchen2,
  car: IconCar,
  "shopping-bag": IconShoppingBag,
  "device-tv": IconDeviceTv,
  "heart-rate-monitor": IconHeartRateMonitor,
  book: IconBook,
  "chart-line": IconChartLine,
  bolt: IconBolt,
  confetti: IconConfetti,
  "building-bank": IconBuildingBank,
  "dots-circle-horizontal": IconDotsCircleHorizontal,
};

interface CategoryIconProps extends IconProps {
  name: string;
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? IconDotsCircleHorizontal;
  return <Icon {...props} />;
}
