import type { ComponentType } from "react";
import { DutyCycleWidget } from "./DutyCycleWidget";
import { SettingsConfiguratorWidget } from "./SettingsConfiguratorWidget";
import { PolarityWidget } from "./PolarityWidget";
import { WireTensionGauge } from "./WireTensionGauge";
import { GasFlowGauge } from "./GasFlowGauge";
import { TroubleshootingFlowchart } from "./TroubleshootingFlowchart";
import { InputVoltageSwitch } from "./InputVoltageSwitch";

export const WIDGET_REGISTRY: Record<string, ComponentType<Record<string, unknown>>> = {
  "duty-cycle": DutyCycleWidget as ComponentType<Record<string, unknown>>,
  "settings-configurator": SettingsConfiguratorWidget as ComponentType<Record<string, unknown>>,
  polarity: PolarityWidget as ComponentType<Record<string, unknown>>,
  "wire-tension": WireTensionGauge as ComponentType<Record<string, unknown>>,
  "gas-flow": GasFlowGauge as ComponentType<Record<string, unknown>>,
  troubleshooting: TroubleshootingFlowchart as ComponentType<Record<string, unknown>>,
  "input-voltage": InputVoltageSwitch as ComponentType<Record<string, unknown>>,
};

export interface ParsedWidget {
  type: string;
  props: Record<string, string | number>;
}

// Parse a self-closing widget tag like:
//   <Widget type="duty-cycle" rated-amps="200" rated-duty-percent="40" />
// into { type: "duty-cycle", props: { ratedAmps: 200, ratedDutyPercent: 40 } }.
// Numeric attribute values are coerced to numbers; kebab-case becomes camelCase.
export function parseWidgetTag(tag: string): ParsedWidget {
  const attrRe = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
  const props: Record<string, string | number> = {};
  let type = "";

  for (let m: RegExpExecArray | null; (m = attrRe.exec(tag)); ) {
    const [, rawKey, rawVal] = m;
    if (rawKey === "type") {
      type = rawVal;
      continue;
    }
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const num = Number(rawVal);
    props[key] = rawVal !== "" && !Number.isNaN(num) ? num : rawVal;
  }

  return { type, props };
}
