import type { SidebarConfig } from "./types.js";

export const DEFAULT_CATEGORY = "Other";
export const DISABLED_CATEGORY = "Disabled";
export const DEFAULT_COLLAPSED_CATEGORIES: string[] = [];

export const DEFAULTS: SidebarConfig & { default_collapsed: string[] } = {
  sidebar_width: 34,
  name_width: 18,
  poll_interval_ms: 2000,
  slot_order: 850,
  title: "Agents",
  category_order: ["Primary", "Subagents", "Built-in", "Project", "Global", "Custom", "Disabled", "Hidden", "Other"],
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
