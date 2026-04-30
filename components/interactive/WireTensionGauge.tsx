"use client";

import { useState } from "react";
import { WidgetShell, FieldLabel, Select, Slider } from "./WidgetShell";
import { WIRE_TENSION } from "@/lib/welder-specs";

const WIRE_TYPES = ["Solid", "Flux-Cored"] as const;
type WireType = (typeof WIRE_TYPES)[number];

interface WireTensionProps {
  wireType?: string;
}

export function WireTensionGauge({ wireType }: WireTensionProps) {
  const initial = (WIRE_TYPES as readonly string[]).includes(wireType ?? "")
    ? (wireType as WireType)
    : "Solid";
  const [type, setType] = useState<WireType>(initial);
  const [tension, setTension] = useState<number>(initial === "Solid" ? 4 : 2.5);

  const range = type === "Solid" ? WIRE_TENSION.solid : WIRE_TENSION.fluxCored;
  const inRange = tension >= range.min && tension <= range.max;
  const status = tension < range.min ? "Too loose" : tension > range.max ? "Too tight" : "In range";
  const statusColor = inRange ? "text-emerald-400" : "text-red-400";

  // Render a horizontal gauge 0-10 with the recommended zone highlighted.
  const SCALE_MIN = 0;
  const SCALE_MAX = 10;
  const pctOf = (v: number) => ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  return (
    <WidgetShell
      title="Wire Feed Tension"
      subtitle="The OmniPro 220 tensioner is a 0–10 dial. Drag to compare your setting to the recommended zone."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Wire type</FieldLabel>
            <Select value={type} options={WIRE_TYPES} onChange={(v) => setType(v)} />
          </div>
          <div>
            <FieldLabel>
              Your setting: <span className="text-amber-400 font-semibold">{tension.toFixed(1)}</span>
            </FieldLabel>
            <Slider value={tension} min={0} max={10} step={0.1} onChange={setTension} />
          </div>
        </div>

        <div>
          <div className="relative h-10 rounded-md bg-slate-800 overflow-hidden">
            {/* Recommended zone */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/30 border-l border-r border-emerald-500/60"
              style={{
                left: `${pctOf(range.min)}%`,
                width: `${pctOf(range.max) - pctOf(range.min)}%`,
              }}
            />
            {/* Current tension marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 transition-all duration-150"
              style={{ left: `${pctOf(tension)}%` }}
            />
            <div
              className="absolute -top-1 w-3 h-3 rounded-full bg-amber-400 transition-all duration-150"
              style={{ left: `calc(${pctOf(tension)}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
            {[0, 2, 4, 6, 8, 10].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Recommended</div>
            <div className="text-emerald-400 font-semibold mt-0.5">
              {range.min} – {range.max}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{range.label}</div>
          </div>
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Status</div>
            <div className={`font-semibold mt-0.5 ${statusColor}`}>{status}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {!inRange &&
                (tension < range.min
                  ? "Wire will slip and birdnest at the spool."
                  : type === "Flux-Cored"
                  ? "Will crush the soft flux-cored wire and jam the liner."
                  : "Excessive wear on the feed roller.")}
              {inRange && "Wire feeds smoothly without slip or crushing."}
            </div>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
