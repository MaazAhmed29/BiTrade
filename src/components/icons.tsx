type IconProps = {
  className?: string;
};

function base(props: IconProps) {
  return {
    className: props.className ?? "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H10v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function MarketsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 20v-7" />
      <path d="M12 20V4" />
      <path d="M19 20v-11" />
    </svg>
  );
}

export function PortfolioIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 15h2" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function gearPath(): string {
  const teeth = 8;
  const outer = 8.8;
  const inner = 6.6;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const angle = (Math.PI * 2 * i) / (teeth * 2) - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    const x = (12 + radius * Math.cos(angle)).toFixed(2);
    const y = (12 + radius * Math.sin(angle)).toFixed(2);
    points.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }
  return `${points.join(" ")} Z M15.4 12 a3.4 3.4 0 1 1-6.8 0 a3.4 3.4 0 1 1 6.8 0`;
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d={gearPath()} />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14.5 21l-4-7.5L3 9.5z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-7 w-7"} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="var(--color-accent)" />
      <path d="M12 6.6 16.8 9.3v5.4L12 17.4l-4.8-2.7V9.3z" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}
