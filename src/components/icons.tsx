import type { SVGProps } from "react";

export type IconName =
  | "cube"
  | "code"
  | "pen"
  | "person"
  | "layers"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up-right"
  | "close"
  | "menu"
  | "pointer-drag"
  | "chevron-down";

const paths: Record<IconName, React.ReactNode> = {
  cube: (
    <>
      <path d="M12 2.8 20 7.3v9.4L12 21.2 4 16.7V7.3z" />
      <path d="M4 7.3 12 12l8-4.7M12 12v9.2" />
    </>
  ),
  code: <path d="m8.5 7.5-4.5 4.5 4.5 4.5M15.5 7.5l4.5 4.5-4.5 4.5M13.5 5l-3 14" />,
  pen: (
    <>
      <path d="M15.6 4.4a2.1 2.1 0 0 1 3 3L8.2 17.8 4 19l1.2-4.2z" />
      <path d="m14 6 4 4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.3L12 12 3.5 7.8z" />
      <path d="m3.5 12 8.5 4.2 8.5-4.2M3.5 16.2l8.5 4.3 8.5-4.3" />
    </>
  ),
  "arrow-right": <path d="M4.5 12h15m-5.5-5.5L19.5 12 14 17.5" />,
  "arrow-left": <path d="M19.5 12h-15m5.5-5.5L4.5 12l5.5 5.5" />,
  "arrow-up-right": <path d="M7 17 17 7M8.5 7H17v8.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 8h16M4 16h16" />,
  "pointer-drag": (
    <>
      <rect x="7" y="3" width="10" height="17" rx="5" />
      <path d="M12 7v3" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.5,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
