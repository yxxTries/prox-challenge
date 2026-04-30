// Canonical specs for the Vulcan OmniPro 220, extracted from lib/manual-content.txt.
// Single source of truth for all interactive widgets — when the manual updates,
// only this file changes. Claude never emits these numbers; widgets read them locally
// to eliminate fabrication risk.

export type ProcessName = "MIG" | "Flux-Cored" | "TIG" | "Stick";

export interface InputVoltageSpec {
  inputAmps: number;        // measured at the rated output current
  outputAmpsMax: number;    // top of welding current range
  outputAmpsMin: number;    // bottom of welding current range
  ratedDutyTop: number;     // % at top rated point (pg 7 spec table)
  ratedAmpsTop: number;     // amps at top rated point
  rated100Pct: number;      // amps at 100% continuous use
}

export interface ProcessSpec {
  weldableMaterials: string[];
  v120: InputVoltageSpec;
  v240: InputVoltageSpec;
  polarity: "DCEP" | "DCEN";
  groundSocket: "+" | "-";
  electrodeSocket: "+" | "-";
  notes?: string;
}

export const PROCESS_SPECS: Record<ProcessName, ProcessSpec> = {
  MIG: {
    weldableMaterials: ["Mild Steel", "Stainless Steel", "Aluminum (Spool Gun)"],
    v120: { inputAmps: 20.8, outputAmpsMin: 30, outputAmpsMax: 140, ratedDutyTop: 40, ratedAmpsTop: 100, rated100Pct: 75 },
    v240: { inputAmps: 25.5, outputAmpsMin: 30, outputAmpsMax: 220, ratedDutyTop: 25, ratedAmpsTop: 200, rated100Pct: 115 },
    polarity: "DCEP",
    groundSocket: "-",
    electrodeSocket: "+",
    notes: "MIG with shielding gas uses DCEP — wire is positive.",
  },
  "Flux-Cored": {
    // Same machine specs as MIG (same wire-feed system); polarity flips.
    weldableMaterials: ["Mild Steel"],
    v120: { inputAmps: 20.8, outputAmpsMin: 30, outputAmpsMax: 140, ratedDutyTop: 40, ratedAmpsTop: 100, rated100Pct: 75 },
    v240: { inputAmps: 25.5, outputAmpsMin: 30, outputAmpsMax: 220, ratedDutyTop: 25, ratedAmpsTop: 200, rated100Pct: 115 },
    polarity: "DCEN",
    groundSocket: "+",
    electrodeSocket: "-",
    notes: "Flux-Cored (gasless) uses DCEN — wire is negative. Reverse from MIG.",
  },
  TIG: {
    weldableMaterials: ["Mild Steel", "Stainless Steel", "Chrome Moly"],
    v120: { inputAmps: 20.6, outputAmpsMin: 10, outputAmpsMax: 125, ratedDutyTop: 40, ratedAmpsTop: 125, rated100Pct: 90 },
    v240: { inputAmps: 15.6, outputAmpsMin: 10, outputAmpsMax: 175, ratedDutyTop: 30, ratedAmpsTop: 175, rated100Pct: 105 },
    polarity: "DCEN",
    groundSocket: "+",
    electrodeSocket: "-",
    notes: "TIG uses DCEN — torch is negative. Use 100% Argon.",
  },
  Stick: {
    weldableMaterials: ["Mild Steel", "Stainless Steel"],
    v120: { inputAmps: 19.5, outputAmpsMin: 10, outputAmpsMax: 80, ratedDutyTop: 40, ratedAmpsTop: 80, rated100Pct: 60 },
    v240: { inputAmps: 23.7, outputAmpsMin: 10, outputAmpsMax: 175, ratedDutyTop: 25, ratedAmpsTop: 175, rated100Pct: 100 },
    polarity: "DCEP",
    groundSocket: "-",
    electrodeSocket: "+",
    notes: "Most common stick electrodes (E6013, E7018) run DCEP. Some specialty rods use DCEN.",
  },
};

// Selection chart: process × thickness → recommended wire/electrode + WFS + voltage range.
// Thickness is in inches; ranges are inclusive lower bound, exclusive upper bound.
export interface SettingRow {
  thicknessIn: number;     // representative thickness for this row
  wireSize: string;        // e.g., "0.030\""
  wfsIpm: [number, number];
  voltageV: [number, number];
  amps?: [number, number]; // for TIG/Stick where current is the primary control
  gas: string;
  notes?: string;
}

export const SETTINGS_CHART: Record<ProcessName, SettingRow[]> = {
  MIG: [
    { thicknessIn: 0.036, wireSize: "0.025\"", wfsIpm: [180, 220], voltageV: [16, 17], gas: "75/25 Ar/CO₂" },
    { thicknessIn: 0.063, wireSize: "0.030\"", wfsIpm: [220, 280], voltageV: [17, 19], gas: "75/25 Ar/CO₂" },
    { thicknessIn: 0.090, wireSize: "0.030\"", wfsIpm: [260, 320], voltageV: [18, 20], gas: "75/25 Ar/CO₂" },
    { thicknessIn: 0.125, wireSize: "0.035\"", wfsIpm: [280, 340], voltageV: [19, 21], gas: "75/25 Ar/CO₂" },
    { thicknessIn: 0.187, wireSize: "0.035\"", wfsIpm: [320, 380], voltageV: [20, 23], gas: "75/25 Ar/CO₂" },
    { thicknessIn: 0.250, wireSize: "0.035\"", wfsIpm: [360, 420], voltageV: [22, 25], gas: "75/25 Ar/CO₂", notes: "Multi-pass for thicker stock." },
    { thicknessIn: 0.375, wireSize: "0.035\"", wfsIpm: [400, 460], voltageV: [24, 27], gas: "75/25 Ar/CO₂", notes: "Multi-pass required." },
  ],
  "Flux-Cored": [
    { thicknessIn: 0.063, wireSize: "0.030\"", wfsIpm: [180, 240], voltageV: [16, 18], gas: "None (self-shielded)" },
    { thicknessIn: 0.090, wireSize: "0.030\"", wfsIpm: [220, 280], voltageV: [17, 19], gas: "None (self-shielded)" },
    { thicknessIn: 0.125, wireSize: "0.035\"", wfsIpm: [260, 320], voltageV: [18, 21], gas: "None (self-shielded)" },
    { thicknessIn: 0.187, wireSize: "0.035\"", wfsIpm: [300, 360], voltageV: [20, 23], gas: "None (self-shielded)" },
    { thicknessIn: 0.250, wireSize: "0.045\"", wfsIpm: [240, 300], voltageV: [22, 25], gas: "None (self-shielded)" },
    { thicknessIn: 0.375, wireSize: "0.045\"", wfsIpm: [280, 340], voltageV: [24, 27], gas: "None (self-shielded)", notes: "Multi-pass required." },
  ],
  TIG: [
    { thicknessIn: 0.036, wireSize: "1/16\" tungsten", wfsIpm: [0, 0], voltageV: [0, 0], amps: [30, 50], gas: "100% Argon, 10–15 CFH" },
    { thicknessIn: 0.063, wireSize: "1/16\" tungsten", wfsIpm: [0, 0], voltageV: [0, 0], amps: [50, 80], gas: "100% Argon, 10–15 CFH" },
    { thicknessIn: 0.090, wireSize: "3/32\" tungsten", wfsIpm: [0, 0], voltageV: [0, 0], amps: [80, 110], gas: "100% Argon, 12–18 CFH" },
    { thicknessIn: 0.125, wireSize: "3/32\" tungsten", wfsIpm: [0, 0], voltageV: [0, 0], amps: [100, 140], gas: "100% Argon, 15–20 CFH" },
    { thicknessIn: 0.187, wireSize: "1/8\" tungsten", wfsIpm: [0, 0], voltageV: [0, 0], amps: [130, 170], gas: "100% Argon, 15–20 CFH", notes: "Approaching 240V upper limit." },
  ],
  Stick: [
    { thicknessIn: 0.063, wireSize: "1/16\" rod (E6013)", wfsIpm: [0, 0], voltageV: [0, 0], amps: [25, 50], gas: "None" },
    { thicknessIn: 0.090, wireSize: "3/32\" rod (E6013)", wfsIpm: [0, 0], voltageV: [0, 0], amps: [50, 90], gas: "None" },
    { thicknessIn: 0.125, wireSize: "3/32\" rod (E7018)", wfsIpm: [0, 0], voltageV: [0, 0], amps: [80, 120], gas: "None" },
    { thicknessIn: 0.187, wireSize: "1/8\" rod (E7018)", wfsIpm: [0, 0], voltageV: [0, 0], amps: [110, 150], gas: "None" },
    { thicknessIn: 0.250, wireSize: "1/8\" rod (E7018)", wfsIpm: [0, 0], voltageV: [0, 0], amps: [130, 170], gas: "None", notes: "Multi-pass for full penetration." },
  ],
};

// Pick the chart row whose thickness is closest to the requested value.
export function lookupSettings(process: ProcessName, thicknessIn: number): SettingRow {
  const rows = SETTINGS_CHART[process];
  return rows.reduce((best, row) =>
    Math.abs(row.thicknessIn - thicknessIn) < Math.abs(best.thicknessIn - thicknessIn) ? row : best
  );
}

// Wire feed tensioner — manual page 11. Tension scale 0-10 on the OmniPro 220.
export const WIRE_TENSION = {
  solid: { min: 3, max: 5, label: "Solid wire (0.025\"–0.035\")" },
  fluxCored: { min: 2, max: 3, label: "Flux-cored wire (crushes easily)" },
};

// Gas flow recommendations (SCFH = standard cubic feet per hour).
export const GAS_FLOW: Record<string, { range: [number, number]; gas: string }> = {
  "MIG":         { range: [20, 30], gas: "75/25 Ar/CO₂ (or 100% CO₂)" },
  "MIG-aluminum":{ range: [25, 35], gas: "100% Argon" },
  "TIG":         { range: [15, 20], gas: "100% Argon" },
  "Flux-Cored":  { range: [0, 0],   gas: "None — self-shielded" },
};

// Input voltage capability — what each receptacle gets you.
export const INPUT_VOLTAGE = {
  v120: {
    breaker: "20 A delayed-action",
    receptacle: "NEMA 5-20 (or 5-15 with 20A breaker)",
    notes: "Garage outlets. Slower welds, thinner stock.",
  },
  v240: {
    breaker: "30 A delayed-action recommended",
    receptacle: "NEMA 6-50 / 14-50 (dryer/range outlets)",
    notes: "Full output. Required for 1/4\"+ steel.",
  },
};

// Troubleshooting flowchart — diagnostic tree from manual pages 32-37.
// Each node is either a Yes/No question (with ifYes/ifNo edges) or a terminal fix.
export type TroubleshootingNode =
  | { id: string; kind: "question"; text: string; ifYes: string; ifNo: string }
  | { id: string; kind: "fix"; title: string; steps: string[] };

export type Symptom = "porosity" | "spatter" | "burn-through" | "no-arc" | "poor-feed";

export const TROUBLESHOOTING: Record<Symptom, { entry: string; nodes: Record<string, TroubleshootingNode> }> = {
  porosity: {
    entry: "p1",
    nodes: {
      p1: { id: "p1", kind: "question", text: "Are you using the correct shielding gas (or flux-cored without gas)?", ifYes: "p2", ifNo: "p1-fix" },
      "p1-fix": { id: "p1-fix", kind: "fix", title: "Wrong gas / wrong wire pairing", steps: [
        "MIG with solid wire requires 75/25 Ar/CO₂ shielding gas.",
        "Flux-cored wire runs WITHOUT gas (DCEN polarity).",
        "Mixing them produces porosity every time.",
      ]},
      p2: { id: "p2", kind: "question", text: "Is the gas flow set to 20-30 SCFH (and the cylinder valve open)?", ifYes: "p3", ifNo: "p2-fix" },
      "p2-fix": { id: "p2-fix", kind: "fix", title: "Gas flow incorrect", steps: [
        "Open cylinder valve fully.",
        "Set regulator flow gauge to 20-30 SCFH for MIG.",
        "Below 15 SCFH: insufficient coverage. Above 35 SCFH: turbulence pulls in air.",
      ]},
      p3: { id: "p3", kind: "question", text: "Is the workpiece clean down to bare metal (no rust, paint, oil)?", ifYes: "p4", ifNo: "p3-fix" },
      "p3-fix": { id: "p3-fix", kind: "fix", title: "Workpiece contamination", steps: [
        "Grind or wire-brush down to bright metal at the joint.",
        "Wipe with acetone if oil/grease may be present.",
        "Mill scale, paint, and galvanizing all cause porosity.",
      ]},
      p4: { id: "p4", kind: "question", text: "Are you welding outdoors or in a draft?", ifYes: "p4-fix", ifNo: "p5" },
      "p4-fix": { id: "p4-fix", kind: "fix", title: "Wind blowing shielding gas away", steps: [
        "Move indoors or block the wind with a screen.",
        "Even a fan or open garage door creates enough draft to ruin MIG welds.",
        "Flux-cored is more wind-tolerant if you can't avoid it.",
      ]},
      p5: { id: "p5", kind: "fix", title: "Check stickout and torch angle", steps: [
        "Stickout (wire past contact tip): keep at 1/2 inch.",
        "Torch angle: 10-15° from vertical, push or drag for the process.",
        "Excessive stickout loses gas coverage and causes porosity.",
      ]},
    },
  },
  spatter: {
    entry: "s1",
    nodes: {
      s1: { id: "s1", kind: "question", text: "Is the wire feed speed in the recommended range for your material thickness?", ifYes: "s2", ifNo: "s1-fix" },
      "s1-fix": { id: "s1-fix", kind: "fix", title: "WFS too high or too low", steps: [
        "Use the Settings Configurator widget to find the recommended WFS for your thickness.",
        "Too high: wire stubs into puddle, large grainy spatter.",
        "Too low: arc burns back, fine but excessive spatter.",
      ]},
      s2: { id: "s2", kind: "question", text: "Is the voltage matched to the WFS (not too low)?", ifYes: "s3", ifNo: "s2-fix" },
      "s2-fix": { id: "s2-fix", kind: "fix", title: "Voltage mismatched to WFS", steps: [
        "Bump voltage up 1-2V at a time until arc smooths out.",
        "Listen for 'sizzling bacon' sound — that's the target arc.",
        "Popping/cracking = voltage too low for the wire speed.",
      ]},
      s3: { id: "s3", kind: "question", text: "Is the workpiece and ground clamp area clean?", ifYes: "s4", ifNo: "p3-fix-shared" },
      "p3-fix-shared": { id: "p3-fix-shared", kind: "fix", title: "Dirty workpiece or poor ground", steps: [
        "Clean the joint AND the ground clamp contact area to bare metal.",
        "Rust under the ground clamp is a hidden cause of spatter.",
      ]},
      s4: { id: "s4", kind: "fix", title: "Check polarity and torch angle", steps: [
        "MIG with gas: DCEP (wire +). Flux-cored: DCEN (wire -). Wrong polarity = massive spatter.",
        "Use the Polarity widget to verify socket setup.",
        "Drag-angle 10-15° tail-first for flux-cored, push-angle for MIG.",
      ]},
    },
  },
  "burn-through": {
    entry: "b1",
    nodes: {
      b1: { id: "b1", kind: "question", text: "Is your material thinner than 1/16 inch?", ifYes: "b1-fix", ifNo: "b2" },
      "b1-fix": { id: "b1-fix", kind: "fix", title: "Material near the lower limit", steps: [
        "Below 1/16\": switch to TIG for fine control.",
        "If staying with MIG: drop to 0.025\" wire, lowest WFS, lowest voltage.",
        "Use stitch welds (1/2 second on, pause) instead of continuous beads.",
      ]},
      b2: { id: "b2", kind: "question", text: "Is the wire feed speed and voltage at the recommended setting for your thickness?", ifYes: "b3", ifNo: "b2-fix" },
      "b2-fix": { id: "b2-fix", kind: "fix", title: "Settings too hot for material", steps: [
        "Use the Settings Configurator widget to look up your exact thickness.",
        "Drop voltage 1-2V and WFS 20-40 IPM and retry.",
      ]},
      b3: { id: "b3", kind: "question", text: "Are you moving the torch fast enough?", ifYes: "b4", ifNo: "b3-fix" },
      "b3-fix": { id: "b3-fix", kind: "fix", title: "Travel speed too slow", steps: [
        "Increase travel speed — the puddle should stay just behind the wire, not pool ahead.",
        "Aim for the leading edge of the puddle at the joint.",
      ]},
      b4: { id: "b4", kind: "fix", title: "Use a heat sink", steps: [
        "Clamp a copper or aluminum backing bar behind the joint.",
        "Backing bar absorbs heat and prevents burn-through on thin sheet.",
        "Skip-weld pattern: 1\" weld, skip 1\", continue. Returns to fill cooled sections.",
      ]},
    },
  },
  "no-arc": {
    entry: "n1",
    nodes: {
      n1: { id: "n1", kind: "question", text: "Does the welder power on (LCD lights up)?", ifYes: "n2", ifNo: "n1-fix" },
      "n1-fix": { id: "n1-fix", kind: "fix", title: "No power", steps: [
        "Check the wall outlet with another device.",
        "Verify breaker hasn't tripped (20A on 120V, 30A+ on 240V).",
        "Inspect power cord for damage. Do not use an extension cord.",
      ]},
      n2: { id: "n2", kind: "question", text: "Is the ground clamp making solid contact with bare metal on the workpiece?", ifYes: "n3", ifNo: "n2-fix" },
      "n2-fix": { id: "n2-fix", kind: "fix", title: "No ground continuity", steps: [
        "Clamp directly to bare metal, not paint or rust.",
        "Clamp on the workpiece itself when possible, not on a table the workpiece sits on.",
        "Inspect ground cable for breaks at the clamp end.",
      ]},
      n3: { id: "n3", kind: "question", text: "Are the cables in the correct sockets for your process polarity?", ifYes: "n4", ifNo: "n3-fix" },
      "n3-fix": { id: "n3-fix", kind: "fix", title: "Polarity setup wrong", steps: [
        "Use the Polarity widget to verify which cable goes in which socket for your process.",
        "Twist cables clockwise all the way to lock — partial twist looks plugged in but doesn't conduct.",
      ]},
      n4: { id: "n4", kind: "fix", title: "Check consumables and feed", steps: [
        "Contact tip worn out or wrong size for wire — replace.",
        "Wire not actually feeding (jam in liner) — check trigger response.",
        "Stick electrode: tap the rod to break the flux coating before striking.",
      ]},
    },
  },
  "poor-feed": {
    entry: "f1",
    nodes: {
      f1: { id: "f1", kind: "question", text: "Is the feed roller groove matched to the wire size and type (V-groove for solid, knurled for flux-cored)?", ifYes: "f2", ifNo: "f1-fix" },
      "f1-fix": { id: "f1-fix", kind: "fix", title: "Wrong feed roller", steps: [
        "Solid wire 0.030\"/0.035\" → V-groove side, marked 0.030/0.035.",
        "Flux-cored 0.045\" → knurled groove side, marked 0.045.",
        "Unscrew the Feed Roller Knob, flip or swap the roller, screw back.",
      ]},
      f2: { id: "f2", kind: "question", text: "Is the feed tensioner set to the right value (3-5 for solid, 2-3 for flux-cored)?", ifYes: "f3", ifNo: "f2-fix" },
      "f2-fix": { id: "f2-fix", kind: "fix", title: "Tension wrong", steps: [
        "Use the Wire Tension widget to see the recommended range.",
        "Too loose: wire slips, feeds inconsistently. Too tight on flux-cored: crushes wire.",
      ]},
      f3: { id: "f3", kind: "question", text: "Is the contact tip the correct size for the wire?", ifYes: "f4", ifNo: "f3-fix" },
      "f3-fix": { id: "f3-fix", kind: "fix", title: "Wrong contact tip", steps: [
        "Tip diameter must match wire diameter exactly.",
        "Worn tip: replace. The hole elongates and wire arcs inside.",
      ]},
      f4: { id: "f4", kind: "fix", title: "Check liner and gun cable", steps: [
        "Lay the MIG gun cable straight — kinks bind the wire.",
        "Inspect liner for clogs or kinks; blow out with compressed air.",
        "If cable was bent sharply, the liner is likely damaged and needs replacing.",
      ]},
    },
  },
};
