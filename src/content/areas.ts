import { projects } from "./projects";
import { site } from "./site";

/**
 * The four destinations and the objects inside them.
 *
 * Text only lives here. Where things sit in 3D space is defined separately in
 * `components/spatial/world.ts`, keyed by the same ids.
 *
 * Nothing here invents experience: real copy is limited to the philosophy
 * already stated on the homepage; everything else is a labelled placeholder.
 */
export type AreaId = "projects" | "engineering" | "design" | "about";

export interface Section {
  heading: string;
  body: string;
}

export interface AreaItem {
  id: string;
  title: string;
  summary: string;
  placeholder: boolean;
  tags?: string[];
  sections: Section[];
  links?: { label: string; href: string }[];
}

export interface Area {
  id: AreaId;
  title: string;
  blurb: string;
  lede: string;
  /** What the visitor is invited to do once they arrive. */
  prompt: string;
  icon: "cube" | "code" | "pen" | "person";
  items: AreaItem[];
}

const contactLinks = [
  ...(site.contact.email ? [{ label: site.contact.email, href: `mailto:${site.contact.email}` }] : []),
  ...site.contact.links,
];

export const areas: Area[] = [
  {
    id: "projects",
    title: "Projects",
    blurb: "Selected work",
    lede: "Case studies showing how an idea became a useful product.",
    prompt: "Select a project to inspect it",
    icon: "cube",
    items: projects.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      placeholder: p.placeholder,
      tags: p.tags,
      sections: p.sections,
      links: p.links,
    })),
  },
  {
    id: "engineering",
    title: "Engineering",
    blurb: "Systems and decisions",
    lede: "The structure underneath an experience, and the trade-offs that shape it.",
    prompt: "Select a layer of the system",
    icon: "code",
    items: [
      {
        id: "architecture",
        title: "Architecture",
        summary: "Systems designed or significantly shaped.",
        placeholder: true,
        sections: [
          {
            heading: "Planned",
            body: "Placeholder. Diagrams and short write-ups of real systems: components, data flow, constraints.",
          },
        ],
      },
      {
        id: "decisions",
        title: "Decisions",
        summary: "Records of meaningful technical decisions.",
        placeholder: true,
        sections: [
          {
            heading: "Planned",
            body: "Placeholder. The alternatives considered, the trade-offs, and why a direction was chosen.",
          },
        ],
      },
      {
        id: "stack",
        title: "Stack",
        summary: "Languages, frameworks, and infrastructure in real use.",
        placeholder: true,
        sections: [
          {
            heading: "Planned",
            body: "Placeholder. Only tools actually used in shipped work.",
          },
        ],
      },
    ],
  },
  {
    id: "design",
    title: "Design",
    blurb: "Product, UX, interfaces",
    lede: "Making technology intuitive: interaction, clarity, and the details that make something feel inevitable.",
    prompt: "Select a composition",
    icon: "pen",
    items: [
      {
        id: "interface-studies",
        title: "Interface studies",
        summary: "Interaction prototypes and the reasoning behind them.",
        placeholder: true,
        sections: [
          {
            heading: "Planned",
            body: "Placeholder. Exploded views of real interfaces, annotated with the decisions behind each layer.",
          },
        ],
      },
      {
        id: "product-thinking",
        title: "Product thinking",
        summary: "Framing problems and deciding what not to build.",
        placeholder: true,
        sections: [
          {
            heading: "Planned",
            body: "Placeholder. User flows and the product reasoning that shaped them.",
          },
        ],
      },
    ],
  },
  {
    id: "about",
    title: "About",
    blurb: "Background and philosophy",
    lede: "I bring engineering, design, and product thinking together to turn ambitious ideas into intuitive, useful experiences.",
    prompt: "Select an object",
    icon: "person",
    items: [
      {
        id: "philosophy",
        title: "Imagine, build, make it useful",
        summary: "The way of working this whole site is built around.",
        placeholder: false,
        sections: [
          { heading: "Imagine", body: "Start from what could exist, not only from what already does." },
          { heading: "Build", body: "Turn the idea into something real, with engineering that holds up." },
          {
            heading: "Make it useful",
            body: "Refine until the experience feels intuitive, not merely futuristic.",
          },
        ],
      },
      {
        id: "background",
        title: "Background",
        summary: "Education, experience, and interests.",
        placeholder: true,
        sections: [
          { heading: "To be written", body: "Placeholder. Real background details will be added here." },
        ],
      },
      {
        id: "resume",
        title: "Résumé",
        summary: site.resumeHref
          ? "Download the full résumé."
          : "A downloadable résumé will live here. It hasn’t been published yet.",
        placeholder: !site.resumeHref,
        sections: [],
        links: site.resumeHref ? [{ label: "Download résumé (PDF)", href: site.resumeHref }] : [],
      },
      {
        id: "contact",
        title: "Contact",
        summary:
          contactLinks.length > 0
            ? "The best ways to get in touch."
            : "Contact details are being finalised and will appear here.",
        placeholder: contactLinks.length === 0,
        sections: [],
        links: contactLinks,
      },
    ],
  },
];

export const areaById = Object.fromEntries(areas.map((a) => [a.id, a])) as Record<AreaId, Area>;

export function isAreaId(value: string | null | undefined): value is AreaId {
  return !!value && value in areaById;
}

export function findItem(area: AreaId, itemId: string | null | undefined) {
  return areaById[area].items.find((i) => i.id === itemId) ?? null;
}
