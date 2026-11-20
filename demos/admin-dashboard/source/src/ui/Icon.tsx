// Hand-drawn 20px stroke icons. Paths kept simple so they render crisp at small sizes.
const P = {
  shelves: "M3 4h14M3 10h14M3 16h14M4 4v13M16 4v13M7 7h3v3M11 13h3v3",
  pulse: "M2 11h4l2-5 4 9 2-4h4",
  people: "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1.5 17c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M13.5 9a2.5 2.5 0 1 0 0-5M15 12.6c1.8.4 3 1.8 3.5 4.4",
  exit: "M8 3H4v14h4M13 6l4 4-4 4M17 10H8",
  search: "M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12ZM13.5 13.5 17 17",
  plus: "M10 4v12M4 10h12",
  arrowIn: "M10 3v10M6 9l4 4 4-4M4 17h12",
  arrowOut: "M10 13V3M6 7l4-4 4 4M4 17h12",
  count: "M4 5h12M4 10h8M4 15h5M14 13l2 2 3-4",
  close: "M5 5l10 10M15 5 5 15",
  pen: "M13.5 3.5l3 3L7 16l-4 1 1-4 9.5-9.5Z",
  bin: "M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11",
  warn: "M10 3 2 17h16L10 3ZM10 8v4M10 14.5v.5",
  rewind: "M4 4v5h5M4.5 9A6.5 6.5 0 1 1 6 14.5",
  chevron: "M12 5l-5 5 5 5",
  lock: "M5 9h10v8H5zM7 9V6a3 3 0 0 1 6 0v3",
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={P[name]} />
    </svg>
  );
}
