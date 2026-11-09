/**
 * PLACEHOLDER project data.
 *
 * Nothing here describes real work yet. Every entry is flagged `placeholder`
 * and the UI labels it as such. Replace with real projects (and remove the
 * flag) before deploying.
 */
export interface Project {
  id: string;
  title: string;
  summary: string;
  placeholder: boolean;
  tags: string[];
  sections: { heading: string; body: string }[];
  links: { label: string; href: string }[];
}

export const projects: Project[] = [
  {
    id: "example-project",
    title: "Example Project",
    summary: "A placeholder showing how a project is inspected in the space.",
    placeholder: true,
    tags: ["Product", "Engineering", "Design"],
    sections: [
      {
        heading: "Problem",
        body: "Placeholder. Describe who had the problem, why it mattered, and what made it hard.",
      },
      {
        heading: "Approach",
        body: "Placeholder. Outline the key product, design, and technical decisions and the trade-offs behind them.",
      },
      {
        heading: "My role",
        body: "Placeholder. State precisely what you owned and who you worked with.",
      },
      {
        heading: "Outcome",
        body: "Placeholder. Add real, verifiable results only. No invented metrics.",
      },
    ],
    links: [],
  },
  {
    id: "project-two",
    title: "Project slot two",
    summary: "Reserved for a second case study.",
    placeholder: true,
    tags: ["To be added"],
    sections: [],
    links: [],
  },
  {
    id: "project-three",
    title: "Project slot three",
    summary: "Reserved for a third case study.",
    placeholder: true,
    tags: ["To be added"],
    sections: [],
    links: [],
  },
];
