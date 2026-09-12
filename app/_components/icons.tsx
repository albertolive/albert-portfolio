import type { SVGProps } from "react";

type ArrowIconProps = SVGProps<SVGSVGElement>;

const sharedProps = {
  "aria-hidden": true,
  className: "arrowIcon",
  fill: "none",
  height: 16,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.75,
  viewBox: "0 0 16 16",
  width: 16,
} as const;

export function ArrowUpRightIcon(props: ArrowIconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M4 12 12 4M6 4h6v6" />
    </svg>
  );
}

export function ArrowUpIcon(props: ArrowIconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m4.5 6.5 3.5-3.5 3.5 3.5M8 3v10" />
    </svg>
  );
}

export function ArrowDownIcon(props: ArrowIconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M8 3v10m-3.5-3.5L8 13l3.5-3.5" />
    </svg>
  );
}

export function ArrowLeftIcon(props: ArrowIconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M13 8H3m3.5-3.5L3 8l3.5 3.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: ArrowIconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />
    </svg>
  );
}
