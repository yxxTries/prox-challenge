"use client";

import { useState } from "react";
import { WidgetShell, FieldLabel, Select } from "./WidgetShell";
import { TROUBLESHOOTING, type Symptom, type TroubleshootingNode } from "@/lib/welder-specs";

const SYMPTOMS = ["porosity", "spatter", "burn-through", "no-arc", "poor-feed"] as const;

const SYMPTOM_LABELS: Record<Symptom, string> = {
  porosity: "Porosity (holes/cavities in bead)",
  spatter: "Excessive spatter",
  "burn-through": "Burn-through on thin material",
  "no-arc": "Won't strike an arc",
  "poor-feed": "Wire won't feed smoothly",
};

interface TroubleshootingProps {
  symptom?: string;
}

export function TroubleshootingFlowchart({ symptom }: TroubleshootingProps) {
  const initial = (SYMPTOMS as readonly string[]).includes(symptom ?? "")
    ? (symptom as Symptom)
    : "porosity";
  const [activeSymptom, setActiveSymptom] = useState<Symptom>(initial);
  const tree = TROUBLESHOOTING[activeSymptom];
  const [path, setPath] = useState<string[]>([tree.entry]);

  const currentId = path[path.length - 1];
  const node: TroubleshootingNode = tree.nodes[currentId];

  const reset = (s: Symptom) => {
    setActiveSymptom(s);
    setPath([TROUBLESHOOTING[s].entry]);
  };

  const back = () => {
    if (path.length > 1) setPath(path.slice(0, -1));
  };

  const advance = (next: string) => {
    setPath([...path, next]);
  };

  return (
    <WidgetShell
      title="Troubleshooting"
      subtitle="Yes/No diagnosis tree from the manual's welding tips section."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Symptom</FieldLabel>
          <Select
            value={activeSymptom}
            options={SYMPTOMS}
            onChange={(v) => reset(v)}
          />
          <div className="text-[10px] text-slate-500 mt-1">{SYMPTOM_LABELS[activeSymptom]}</div>
        </div>

        <div className="rounded-md border border-slate-700 bg-slate-800/40 p-4 space-y-3">
          {node.kind === "question" ? (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Step {path.length}
              </div>
              <div className="text-sm text-slate-100 leading-relaxed">{node.text}</div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => advance(node.ifYes)}
                  className="px-3 py-2 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-sm font-medium transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => advance(node.ifNo)}
                  className="px-3 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-medium transition-colors"
                >
                  No
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-amber-400 font-semibold">
                Recommended fix
              </div>
              <div className="text-sm font-semibold text-slate-100">{node.title}</div>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {node.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500 flex-none">›</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={back}
            disabled={path.length <= 1}
            className="px-2.5 py-1 rounded border border-slate-700 hover:border-slate-600 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          <span>Path: {path.length} step{path.length === 1 ? "" : "s"}</span>
          <button
            onClick={() => reset(activeSymptom)}
            className="px-2.5 py-1 rounded border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-colors"
          >
            Restart
          </button>
        </div>
      </div>
    </WidgetShell>
  );
}
