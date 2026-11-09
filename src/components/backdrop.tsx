/** Decorative environment: warm paper, soft light, faint architectural arcs. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Soft pool of light behind the stage; the room falls off to warm stone. */}
      <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_64%_52%,rgb(247_244_250/0.95),transparent_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40%_50%_at_6%_15%,rgb(244_232_224/0.7),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_120%,rgb(214_208_200/0.55),transparent_70%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="arc" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <path
          d="M520 -40 C 760 260, 1250 180, 1660 60"
          stroke="url(#arc)"
          strokeWidth="70"
          filter="url(#soft)"
        />
        <path
          d="M1700 760 C 1300 620, 900 900, 560 1080"
          stroke="url(#arc)"
          strokeWidth="90"
          filter="url(#soft)"
        />
      </svg>
      <div className="grain absolute inset-0" />
    </div>
  );
}
