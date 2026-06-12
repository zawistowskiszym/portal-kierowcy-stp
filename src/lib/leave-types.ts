export const LEAVE_TYPES = [
  { value: "wypoczynkowy", label: "Wypoczynkowy" },
  { value: "na_zadanie", label: "Na żądanie" },
  { value: "okolicznosciowy", label: "Okolicznościowy" },
  { value: "bezplatny", label: "Bezpłatny" },
  { value: "chorobowy", label: "Chorobowy (L4)" },
  { value: "opieka", label: "Opieka nad dzieckiem" },
  { value: "macierzynski", label: "Macierzyński" },
  { value: "ojcowski", label: "Ojcowski" },
  { value: "szkoleniowy", label: "Szkoleniowy" },
  { value: "inny", label: "Inny" },
] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number]["value"];

export const LEAVE_TYPE_VALUES = LEAVE_TYPES.map((l) => l.value) as [LeaveTypeValue, ...LeaveTypeValue[]];

export const LEAVE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  LEAVE_TYPES.map((l) => [l.value, l.label]),
);
