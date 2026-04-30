import type { ReactNode } from "react";

export function WidgetShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">{children}</label>;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-amber-500"
    />
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:border-amber-500/50 outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
