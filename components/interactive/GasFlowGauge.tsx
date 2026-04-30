"use client";

import { useState } from "react";
import { WidgetShell, FieldLabel, Select, Slider } from "./WidgetShell";
import { GAS_FLOW } from "@/lib/welder-specs";

const GAS_PRESETS = ["MIG", "MIG-aluminum", "TIG"] as const;
type GasPreset = (typeof GAS_PRESETS)[number];

const PRESET_LABELS: Record<GasPreset, string> = {
  MIG: "MIG (steel) — 75/25 Ar/CO₂",
  "MIG-aluminum": "MIG aluminum — 100% Argon",
  TIG: "TIG — 100% Argon",
};

interface GasFlowProps {
  defaultProcess?: string;
}

export function GasFlowGauge({ defaultProcess }: GasFlowProps) {
  const initial = (GAS_PRESETS as readonly string[]).includes(defaultProcess ?? "")
    ? (defaultProcess as GasPreset)
    : "MIG";
  const [preset, setPreset] = useState<GasPreset>(initial);
  const range = GAS_FLOW[preset].range;
  const [scfh, setScfh] = useState<number>(Math.round((range[0] + range[1]) / 2));

  const SCALE_MAX = 50;
  const pctOf = (v: number) => (v / SCALE_MAX) * 100;
  const inRange = scfh >= range[0] && scfh <= range[1];
  const status =
    scfh < range[0]
      ? "Too low — gas coverage insufficient, expect porosity"
      : scfh > range[1]
      ? "Too high — turbulence pulls air into the puddle"
      : "In recommended range";
  const statusColor = inRange ? "text-emerald-400" : "text-red-400";

  return (
    <WidgetShell
      title="Shielding Gas Flow"
      subtitle="Gauge readings are SCFH (standard cubic feet per hour). Drag to find the sweet spot."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Process / gas</FieldLabel>
            <Select
              value={preset}
              options={GAS_PRESETS}
              onChange={(v) => {
                setPreset(v);
                const r = GAS_FLOW[v].range;
                setScfh(Math.round((r[0] + r[1]) / 2));
              }}
            />
            <div className="text-[10px] text-slate-500 mt-1">{PRESET_LABELS[preset]}</div>
          </div>
          <div>
            <FieldLabel>
              Your flow: <span className="text-amber-400 font-semibold">{scfh} SCFH</span>
            </FieldLabel>
            <Slider value={scfh} min={0} max={SCALE_MAX} step={1} onChange={setScfh} />
          </div>
        </div>

        <div>
          <div className="relative h-10 rounded-md bg-slate-800 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/30 border-l border-r border-emerald-500/60"
              style={{
                left: `${pctOf(range[0])}%`,
                width: `${pctOf(range[1]) - pctOf(range[0])}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 transition-all duration-150"
              style={{ left: `${pctOf(scfh)}%` }}
            />
            <div
              className="absolute -top-1 w-3 h-3 rounded-full bg-amber-400 transition-all duration-150"
              style={{ left: `calc(${pctOf(scfh)}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
            {[0, 10, 20, 30, 40, 50].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Recommended</div>
            <div className="text-emerald-400 font-semibold mt-0.5">
              {range[0]} – {range[1]} SCFH
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{GAS_FLOW[preset].gas}</div>
          </div>
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Status</div>
            <div className={`font-semibold mt-0.5 ${statusColor}`}>
              {inRange ? "✓" : "⚠"} {scfh} SCFH
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{status}</div>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
