"use client";

import { useState } from "react";
import { WidgetShell, FieldLabel, Select, Slider } from "./WidgetShell";
import { lookupSettings, PROCESS_SPECS, type ProcessName } from "@/lib/welder-specs";

const PROCESSES = ["MIG", "Flux-Cored", "TIG", "Stick"] as const satisfies readonly ProcessName[];

interface SettingsProps {
  defaultProcess?: string;
  defaultThickness?: number;
}

export function SettingsConfiguratorWidget({ defaultProcess, defaultThickness }: SettingsProps) {
  const initialProcess = (PROCESSES as readonly string[]).includes(defaultProcess ?? "")
    ? (defaultProcess as ProcessName)
    : "MIG";

  const [process, setProcess] = useState<ProcessName>(initialProcess);
  const [thickness, setThickness] = useState<number>(defaultThickness ?? 0.125);

  const row = lookupSettings(process, thickness);
  const spec = PROCESS_SPECS[process];

  const isCurrentDriven = process === "TIG" || process === "Stick";

  return (
    <WidgetShell
      title="Settings Configurator"
      subtitle="Pick process and material thickness — recommended settings update live."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Process</FieldLabel>
            <Select value={process} options={PROCESSES} onChange={(v) => setProcess(v)} />
          </div>
          <div>
            <FieldLabel>
              Thickness: <span className="text-amber-400 font-semibold">{thickness.toFixed(3)}″</span>
            </FieldLabel>
            <Slider value={thickness} min={0.030} max={0.500} step={0.001} onChange={setThickness} />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>22 ga</span>
              <span>1/8″</span>
              <span>1/4″</span>
              <span>1/2″</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <ResultCell label="Wire / Electrode" value={row.wireSize} />
          <ResultCell label="Polarity" value={`${spec.polarity} (electrode ${spec.electrodeSocket})`} />
          {isCurrentDriven ? (
            <ResultCell
              label="Amperage"
              value={row.amps ? `${row.amps[0]}–${row.amps[1]} A` : "—"}
              highlight
            />
          ) : (
            <ResultCell
              label="Wire Feed Speed"
              value={`${row.wfsIpm[0]}–${row.wfsIpm[1]} IPM`}
              highlight
            />
          )}
          {!isCurrentDriven && (
            <ResultCell
              label="Voltage"
              value={`${row.voltageV[0]}–${row.voltageV[1]} V`}
              highlight
            />
          )}
          <ResultCell label="Shielding Gas" value={row.gas} span={isCurrentDriven ? 1 : 2} />
        </div>

        {row.notes && (
          <div className="text-xs text-slate-400 pl-3 border-l-2 border-amber-500">{row.notes}</div>
        )}

        {thickness > 0.220 && (
          <div className="text-xs text-amber-400/80 pl-3 border-l-2 border-amber-500">
            Above 1/4″ requires 240V input for full machine output.
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

function ResultCell({
  label,
  value,
  highlight,
  span,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  span?: number;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md border ${
        highlight ? "border-amber-500/40 bg-amber-500/5" : "border-slate-700 bg-slate-800/40"
      } ${span === 2 ? "col-span-2" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm mt-0.5 ${highlight ? "text-amber-300 font-semibold" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}
