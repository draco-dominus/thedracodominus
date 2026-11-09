/** Decorative environment: warm paper, a soft pool of light behind the portrait, faint arcs. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Soft light behind the portrait; the edges fall off to warm blush. */}
      <div className="absolute inset-0 bg-[radial-gradient(50%_62%_at_62%_42%,rgb(250_247_247/0.9),transparent_75%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(38%_48%_at_4%_6%,rgb(251_244_242/0.85),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_80%_110%,rgb(236_226_226/0.6),transparent_70%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-50"
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
