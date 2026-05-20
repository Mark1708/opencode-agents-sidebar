import type { SidebarConfig } from "./types.js";

export const DEFAULT_CATEGORY = "Other";
export const DISABLED_CATEGORY = "Disabled";
export const DEFAULT_COLLAPSED_CATEGORIES = ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting"];

export const DEFAULTS: SidebarConfig & { default_collapsed: string[] } = {
  sidebar_width: 34,
  name_width: 18,
  poll_interval_ms: 2000,
  slot_order: 850,
  title: "OmO Agents",
  category_order: ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting", "Other"],
  default_collapsed: DEFAULT_COLLAPSED_CATEGORIES,
  model_display: "details-only",
  show_provider: true,
  show_variant_in_details: false,
  show_disabled: "dimmed",
  agent_row_mode: "compact",
  symbols: "unicode",
  provider_aliases: {
    openai: "oa",
    opencode: "oc",
    "zai-coding-plan": "zai",
  },
  model_aliases: {
    "gpt-5.4-mini-fast": "gpt-5.4mf",
    "gpt-5.4-mini": "gpt-5.4m",
    "gpt-5.5": "5.5",
    "glm-4.5-air": "glm-4.5a",
  },
  variant_aliases: {
    medium: "M",
    high: "H",
    xhigh: "XH",
  },
};

export const DEFAULT_CATEGORY_ORDER = DEFAULTS.category_order;

export const CATEGORY_MAP: Record<string, string> = {
  sisyphus: "Orchestration",
  hephaestus: "Orchestration",
  prometheus: "Orchestration",
  atlas: "Orchestration",
  "sisyphus-junior": "Orchestration",
  oracle: "Research",
  librarian: "Research",
  explore: "Research",
  metis: "Research",
  momus: "Research",
  "multimodal-looker": "Research",
  planner: "Architecture",
  architect: "Architecture",
  "code-architect": "Architecture",
  "code-reviewer": "Review",
  "typescript-reviewer": "Review",
  "python-reviewer": "Review",
  "go-reviewer": "Review",
  "rust-reviewer": "Review",
  "java-reviewer": "Review",
  "kotlin-reviewer": "Review",
  "security-auditor": "Review",
  "devops-reviewer": "Review",
  "backend-dev": "Engineering",
  "test-writer": "Engineering",
  "docs-writer": "Engineering",
  "build-error-resolver": "Operations",
  "e2e-runner": "Operations",
  "release-manager": "Operations",
  "database-specialist": "Operations",
  "data-analyst": "Analytics",
  "vision-processor": "Analytics",
  "health-consultant": "Consulting",
};
