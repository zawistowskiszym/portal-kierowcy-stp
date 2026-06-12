// Line presets for STP — stop names ordered along the route.
// Each stop is assumed to take 1 minute from the previous stop.

export type LinePreset = {
  line: string;
  stops: string[];
};

export const LINE_PRESETS: LinePreset[] = [
  {
    line: "107",
    stops: [
      "Dw Centralny (Bobra)",
      "Dw Centralny (Muzyczna)",
      "Dw Centralny (Kijowska)",
      "Wynalazek",
      "Dw Główny",
      "CH Wynalazek",
      "Dw Wschodni",
      "Inżynierska",
      "Rondo Wielopolskiego",
      "Królewska-ZOO",
      "Jasna",
      "Rondo Waryńskiego",
      "Murarska",
      "Estrady",
      "Dw Królewska",
      "Krzywe Koło",
    ],
  },
  {
    line: "110",
    stops: [
      "Pl Operowy",
      "Opera",
      "Dw Główny",
      "CH Wynalazek",
      "Roczna Różany",
      "Cm Żydowski",
      "Rondo Wielopolskiego",
      "Królewska-ZOO",
      "Jasna",
      "Rondo Waryńskiego",
      "Rynek Skuszowicki",
    ],
  },
  {
    line: "112",
    stops: [
      "Rondo Bobra",
      "Foksal",
      "Most Wiktorii",
      "Wybrzeże Piechaczyka",
      "Rondo Wielopolskiego",
      "Inżynierska",
      "Dw Wschodni",
      "Rondo Unii Europejskiej",
      "Rondo Unii Europejskiej",
      "Pawlinki",
      "Nauczycielska",
      "Nauczycielska-Szpital",
      "Plac Nawalnego",
      "Dw Stare Jegóry",
    ],
  },
  {
    line: "151",
    stops: [
      "Rondo Bobra",
      "Foksal",
      "Most Wiktorii",
      "Wybrzeże Piechaczyka",
      "Rondo Wielopolskiego",
      "Królewska-ZOO",
      "Jasna",
      "Rondo Waryńskiego",
      "Murarska",
      "Pl Sześciu Rogów",
    ],
  },
  {
    line: "159",
    stops: [
      "Rondo Bobra",
      "Foksal",
      "Most Wiktorii",
      "Wybrzeże Piechaczyka",
      "Rondo Wielopolskiego",
      "Cm Żydowski",
      "Różany",
      "Roczna",
      "CH Wynalazek",
      "Dw Główny",
      "Wynalazek",
      "Dw Centralny (Kijowska)",
      "Dw Centralny (Muzyczna)",
      "Dw Centralny (Bobra)",
    ],
  },
  {
    line: "182",
    stops: [
      "Dw Centralny (Bobra)",
      "Dw Centralny (Muzyczna)",
      "Dw Centralny (Kijowska)",
      "Wynalazek",
      "Dw Główny",
      "Barlickiego",
      "Szpital Naczelny",
      "Rondo Unii Europejskiej",
      "Pawlinki",
      "Nauczycielska",
      "Nauczycielska-Szpital",
      "Plac Nawalnego",
      "Dw Stare Jegóry",
    ],
  },
];

export const LINE_PRESET_MAP: Record<string, LinePreset> = Object.fromEntries(
  LINE_PRESETS.map((p) => [p.line, p]),
);

export function getLinePreset(line: string): LinePreset | undefined {
  return LINE_PRESET_MAP[line.trim()];
}

/** Parses a duty route like "151+190" / "151, 190" → ["151", "190"]. */
export function parseRouteLines(route: string): string[] {
  return route
    .split(/[+,/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build a schedule (stop + minute offset) for a route starting at startTime "HH:MM". */
export function buildSchedule(line: string, startTime: string): { stop: string; time: string }[] | null {
  const preset = getLinePreset(line);
  if (!preset) return null;
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const base = h * 60 + m;
  return preset.stops.map((stop, i) => {
    const total = (base + i) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return { stop, time: `${hh}:${mm}` };
  });
}
