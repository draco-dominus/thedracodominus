/**
 * Site-wide copy and identity.
 *
 * Anything marked TODO is intentionally unfilled: we do not invent personal
 * details. Fill these in with real information before deploying.
 */
export const site = {
  /** TODO: confirm. Taken from the approved design mockup. */
  monogram: "KB",
  /** TODO: real name. When null, the name is omitted everywhere. */
  name: null as string | null,
  title: "Product-minded Software Engineer",
  description:
    "I bring engineering, design, and product thinking together to turn ambitious ideas into intuitive, useful experiences.",
  /** TODO: add a real contact address / profile links. */
  contact: {
    email: null as string | null,
    links: [] as { label: string; href: string }[],
  },
  /** TODO: path to a résumé PDF in /public once it exists. */
  resumeHref: null as string | null,
} as const;

export const hero = {
  eyebrow: "Product-minded software engineer",
  headlineLead: "The future feels futuristic until it",
  headlineAccent: "exists.",
  subheading: "We’re closer than we think.",
  description: site.description,
  philosophy: ["Imagine", "Build", "Make it useful"] as const,
  cta: "Explore My Work",
};
