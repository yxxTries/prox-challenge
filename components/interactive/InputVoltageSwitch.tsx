"use client";

import { useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { INPUT_VOLTAGE, PROCESS_SPECS, type ProcessName } from "@/lib/welder-specs";

const VOLTAGES = [120, 240] as const;
type Voltage = (typeof VOLTAGES)[number];

const PROCESSES: ProcessName[] = ["MIG", "TIG", "Stick"];

export function InputVoltageSwitch() {
  const [voltage, setVoltage] = useState<Voltage>(240);
  const info = voltage === 120 ? INPUT_VOLTAGE.v120 : INPUT_VOLTAGE.v240;

  return (
    <WidgetShell
      title="Input Voltage"
      subtitle="The OmniPro 220 auto-detects 120V or 240V — but max output depends on which one."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {VOLTAGES.map((v) => {
            const active = v === voltage;
            return (
              <button
                key={v}
                onClick={() => setVoltage(v)}
                className={`px-4 py-3 rounded-md border text-sm font-semibold transition-colors ${
                  active
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                    : "border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {v}V Input
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                  {v === 120 ? "Standard garage outlet" : "Dryer/range outlet"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Receptacle</div>
            <div className="text-slate-200 mt-0.5">{info.receptacle}</div>
          </div>
          <div className="px-3 py-2 rounded-md border border-slate-700 bg-slate-800/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Breaker</div>
            <div className="text-slate-200 mt-0.5">{info.breaker}</div>
          </div>
        </div>

        <div className="rounded-md border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  Process
                </th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  Output range
                </th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  Rated duty
                </th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  100% @
                </th>
              </tr>
            </thead>
            <tbody>
              {PROCESSES.map((p) => {
                const v = voltage === 120 ? PROCESS_SPECS[p].v120 : PROCESS_SPECS[p].v240;
                return (
                  <tr key={p} className="border-t border-slate-700/60">
                    <td className="px-3 py-2 text-slate-200 font-medium">{p}</td>
                    <td className="px-3 py-2 text-right text-amber-300 font-mono">
                      {v.outputAmpsMin}–{v.outputAmpsMax} A
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {v.ratedDutyTop}% @ {v.ratedAmpsTop} A
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">{v.rated100Pct} A</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-400 pl-3 border-l-2 border-amber-500">{info.notes}</div>
      </div>
    </WidgetShell>
  );
}
