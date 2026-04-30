"use client";

import { useState } from "react";
import { WidgetShell, FieldLabel, Select } from "./WidgetShell";
import { PROCESS_SPECS, type ProcessName } from "@/lib/welder-specs";

const PROCESSES = ["MIG", "Flux-Cored", "TIG", "Stick"] as const satisfies readonly ProcessName[];

interface PolarityProps {
  defaultProcess?: string;
}

export function PolarityWidget({ defaultProcess }: PolarityProps) {
  const initial = (PROCESSES as readonly string[]).includes(defaultProcess ?? "")
    ? (defaultProcess as ProcessName)
    : "MIG";
  const [process, setProcess] = useState<ProcessName>(initial);
  const spec = PROCESS_SPECS[process];

  const electrodeName = process === "TIG" ? "TIG Torch" : process === "Stick" ? "Stick Holder" : "MIG Gun / Wire Feed";
  // Cable colors: red = positive line, gray = negative line.
  const electrodeColor = spec.electrodeSocket === "+" ? "#ef4444" : "#94a3b8";
  const groundColor = spec.groundSocket === "+" ? "#ef4444" : "#94a3b8";

  return (
    <WidgetShell
      title="Polarity Setup"
      subtitle="Pick the process to see which cable goes in which socket."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Process</FieldLabel>
          <Select value={process} options={PROCESSES} onChange={(v) => setProcess(v)} />
        </div>

        <svg
          width="100%"
          viewBox="0 0 560 320"
          xmlns="http://www.w3.org/2000/svg"
          style={{ borderRadius: 8 }}
        >
          <rect width="560" height="320" fill="#1e293b" />

          {/* Component boxes */}
          <rect x="30" y="60" width="140" height="140" fill="none" stroke="#475569" strokeWidth="2" rx="6" />
          <rect x="220" y="80" width="120" height="100" fill="none" stroke="#475569" strokeWidth="2" rx="6" />
          <rect x="390" y="80" width="140" height="100" fill="none" stroke="#475569" strokeWidth="2" rx="6" />

          {/* Connection lines — electrode cable (top) and ground cable (bottom) */}
          <line
            x1="170" y1="120" x2="220" y2="120"
            stroke={electrodeColor} strokeWidth="3" strokeLinecap="round"
          >
            {electrodeColor === "#ef4444" && (
              <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="1.5s" repeatCount="indefinite" />
            )}
          </line>
          <line
            x1="170" y1="150" x2="390" y2="150"
            stroke={groundColor} strokeWidth="3" strokeLinecap="round"
          >
            {groundColor === "#ef4444" && (
              <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="1.5s" repeatCount="indefinite" />
            )}
          </line>

          {/* Title */}
          <rect x="180" y="13" width="200" height="24" fill="#1e293b" rx="3" />
          <text x="280" y="25" fill="#cbd5e1" fontFamily="sans-serif" fontSize="14" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
            {process} Polarity ({spec.polarity})
          </text>

          {/* Component labels */}
          <rect x="68" y="68" width="64" height="24" fill="#1e293b" rx="3" />
          <text x="100" y="80" fill="#cbd5e1" fontSize="13" textAnchor="middle" dominantBaseline="middle">WELDER</text>
          <rect x="232" y="88" width="96" height="24" fill="#1e293b" rx="3" />
          <text x="280" y="100" fill="#cbd5e1" fontSize="13" textAnchor="middle" dominantBaseline="middle">{electrodeName}</text>
          <rect x="416" y="88" width="88" height="24" fill="#1e293b" rx="3" />
          <text x="460" y="100" fill="#cbd5e1" fontSize="13" textAnchor="middle" dominantBaseline="middle">WORKPIECE</text>

          {/* Socket labels — electrode line at y=120 */}
          <rect x="80" y="108" width="120" height="24" fill="#1e293b" rx="3" />
          <text x="140" y="120" fill={electrodeColor} fontSize="12" textAnchor="middle" dominantBaseline="middle">
            {spec.electrodeSocket === "+" ? "+ Positive" : "– Negative"} socket
          </text>

          {/* Ground line at y=150 */}
          <rect x="80" y="138" width="120" height="24" fill="#1e293b" rx="3" />
          <text x="140" y="150" fill={groundColor} fontSize="12" textAnchor="middle" dominantBaseline="middle">
            {spec.groundSocket === "+" ? "+ Positive" : "– Negative"} socket
          </text>

          {/* Cable summary labels (line-free zone y=230-290) */}
          <rect x="40" y="230" width="320" height="24" fill="#1e293b" rx="3" />
          <text x="200" y="242" fill={electrodeColor} fontSize="13" textAnchor="middle" dominantBaseline="middle">
            {electrodeName} cable → {spec.electrodeSocket === "+" ? "Positive (+)" : "Negative (–)"} socket
          </text>
          <rect x="40" y="262" width="320" height="24" fill="#1e293b" rx="3" />
          <text x="200" y="274" fill={groundColor} fontSize="13" textAnchor="middle" dominantBaseline="middle">
            Ground clamp cable → {spec.groundSocket === "+" ? "Positive (+)" : "Negative (–)"} socket
          </text>
        </svg>

        {spec.notes && (
          <div className="text-xs text-slate-400 pl-3 border-l-2 border-amber-500">{spec.notes}</div>
        )}
      </div>
    </WidgetShell>
  );
}
