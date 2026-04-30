"use client";

import { useState, useMemo } from "react";
import { WidgetShell, FieldLabel, Slider } from "./WidgetShell";
import { PROCESS_SPECS, type ProcessName } from "@/lib/welder-specs";
import { formatMinutesSeconds } from "@/lib/formatting";
import { sanitizeNumber, sanitizeString } from "@/lib/sanitize";

interface DutyCycleProps {
  ratedAmps?: number;
  ratedDutyPercent?: number;
  processLabel?: string;
  inputVoltage?: number;
}

export function DutyCycleWidget(props: DutyCycleProps) {
  // Sanitize props to prevent crashes from invalid Claude-generated data
  const processLabel = sanitizeString(
    props.processLabel ?? "MIG",
    ["MIG", "Flux-Cored", "TIG", "Stick"] as const,
    "MIG"
  ) as ProcessName;

  const inputVoltage = sanitizeNumber(props.inputVoltage ?? 240, 120, 240, 240);
  const ratedAmps = sanitizeNumber(props.ratedAmps ?? 220, 30, 350, 220);
  const ratedDutyPercent = sanitizeNumber(props.ratedDutyPercent ?? 35, 10, 100, 35);

  // Derive fallback values from welder-specs for reference
  const fallback = useMemo(() => {
    const spec = PROCESS_SPECS[processLabel] ?? PROCESS_SPECS.MIG;
    const v = inputVoltage === 120 ? spec.v120 : spec.v240;
    return { ratedAmps: v.ratedAmpsTop, ratedDuty: v.ratedDutyTop };
  }, [processLabel, inputVoltage]);

  // Slider configuration
  const sliderMin = 30;
  const sliderMax = Math.round(ratedAmps * 1.3);
  const [amps, setAmps] = useState(ratedAmps);

  // Duty cycle calculation
  const dutyPercent = useMemo(() => {
    if (amps <= ratedAmps) return 100;
    return Math.min(100, ratedDutyPercent * (ratedAmps / amps) ** 2);
  }, [amps, ratedAmps, ratedDutyPercent]);

  const onSeconds = 600 * (dutyPercent / 100);
  const offSeconds = 600 - onSeconds;
  const onWidthPct = (onSeconds / 600) * 100;

  return (
    <WidgetShell
      title={`${processLabel} Duty Cycle`}
      subtitle={`Rated: ${ratedDutyPercent}% @ ${ratedAmps} A — drag to see duty cycle at any welding current.`}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>
            Welding current: <span className="text-amber-400 font-semibold">{amps} A</span>
          </FieldLabel>
          <Slider value={amps} min={sliderMin} max={sliderMax} onChange={setAmps} />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{sliderMin} A</span>
            <span>Rated: {ratedAmps} A</span>
            <span>{sliderMax} A</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs uppercase tracking-wide text-slate-400">10-minute cycle</span>
            <span className="text-sm font-semibold text-amber-400">{dutyPercent.toFixed(0)}% duty</span>
          </div>
          <div className="relative h-8 rounded-md overflow-hidden bg-slate-800 flex">
            <div
              className="h-full bg-amber-500 transition-all duration-150 flex items-center justify-center text-[10px] font-semibold text-slate-900"
              style={{ width: `${onWidthPct}%` }}
            >
              {onWidthPct > 12 ? "WELDING" : ""}
            </div>
            <div
              className="h-full bg-slate-700 transition-all duration-150 flex items-center justify-center text-[10px] font-semibold text-slate-300"
              style={{ width: `${100 - onWidthPct}%` }}
            >
              {100 - onWidthPct > 12 ? "RESTING" : ""}
            </div>
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-slate-300">
              <span className="text-amber-400 font-semibold">Weld:</span> {formatMinutesSeconds(onSeconds)}
            </span>
            <span className="text-slate-300">
              <span className="text-slate-400 font-semibold">Rest:</span> {formatMinutesSeconds(offSeconds)}
            </span>
          </div>
        </div>

        {amps > ratedAmps && (
          <div className="text-xs text-slate-400 pl-3 border-l-2 border-amber-500">
            Above the rated current — the welder needs longer rest periods to avoid overheating.
            Formula: D × (A_rated / A_weld)².
          </div>
        )}
        {amps <= ratedAmps && (
          <div className="text-xs text-slate-400 pl-3 border-l-2 border-emerald-500">
            At or below rated current — you can weld continuously without thermal cutout.
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
