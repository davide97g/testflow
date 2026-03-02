/**
 * Known environment variable sections and keys for the admin env config UI.
 * Keeps a single source of truth for Jira, Bitbucket, Confluence, Zephyr.
 */

export type EnvKeyType = "email" | "url" | "token" | "string";

export interface EnvKeySpec {
  key: string;
  label: string;
  placeholder: string;
  type: EnvKeyType;
}

export interface EnvSectionSpec {
  id: string;
  title: string;
  description: string;
  required: boolean;
  keys: EnvKeySpec[];
}

export const ENV_SECTIONS: EnvSectionSpec[] = [
  {
    id: "jira",
    title: "Jira",
    description: "Atlassian Jira API credentials (required for issues and boards)",
    required: true,
    keys: [
      {
        key: "JIRA_EMAIL",
        label: "Email",
        placeholder: "your-email@company.com",
        type: "email",
      },
      {
        key: "JIRA_API_TOKEN",
        label: "API Token",
        placeholder: "Paste your Jira API token",
        type: "token",
      },
    ],
  },
  {
    id: "bitbucket",
    title: "Bitbucket",
    description: "Bitbucket API credentials for PRs and branches",
    required: false,
    keys: [
      {
        key: "BITBUCKET_EMAIL",
        label: "Email",
        placeholder: "your-email@company.com",
        type: "email",
      },
      {
        key: "BITBUCKET_API_TOKEN",
        label: "API Token",
        placeholder: "Paste your Bitbucket app password or token",
        type: "token",
      },
    ],
  },
  {
    id: "confluence",
    title: "Confluence",
    description: "Confluence API credentials for linked documentation",
    required: false,
    keys: [
      {
        key: "CONFLUENCE_EMAIL",
        label: "Email",
        placeholder: "your-email@company.com",
        type: "email",
      },
      {
        key: "CONFLUENCE_API_TOKEN",
        label: "API Token",
        placeholder: "Paste your Confluence API token",
        type: "token",
      },
    ],
  },
  {
    id: "zephyr",
    title: "Zephyr",
    description: "Zephyr Scale/Server API for test cases",
    required: false,
    keys: [
      {
        key: "ZEPHYR_BASE_URL",
        label: "Base URL",
        placeholder: "https://api.zephyrscale.smartbear.com/v2",
        type: "url",
      },
      {
        key: "ZEPHYR_ACCESS_TOKEN",
        label: "Access Token",
        placeholder: "Paste your Zephyr API token",
        type: "token",
      },
      {
        key: "ZEPHYR_PROJECT_KEY",
        label: "Project Key",
        placeholder: "e.g. DEMO",
        type: "string",
      },
      {
        key: "ZEPHYR_PROJECT_ID",
        label: "Project ID",
        placeholder: "Optional project ID",
        type: "string",
      },
      {
        key: "ZEPHYR_FOLDER_ID",
        label: "Folder ID",
        placeholder: "Optional folder ID",
        type: "string",
      },
      {
        key: "ZEPHYR_CONNECT_BASE_URL",
        label: "Connect Base URL",
        placeholder: "Optional Zephyr Connect URL",
        type: "url",
      },
    ],
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isEnvValueValid(value: string, type: EnvKeyType): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  switch (type) {
    case "email":
      return EMAIL_REGEX.test(trimmed);
    case "url":
      return isValidUrl(trimmed);
    case "token":
    case "string":
      return trimmed.length > 0;
    default:
      return trimmed.length > 0;
  }
}

export function isSectionFullyConfigured(
  section: EnvSectionSpec,
  values: Record<string, string>
): boolean {
  if (section.required) {
    return section.keys.every((keySpec) =>
      isEnvValueValid(values[keySpec.key] ?? "", keySpec.type)
    );
  }
  // Optional section: no invalid values, and at least the first two keys (email+token or url+token) are set
  const hasInvalid = section.keys.some((keySpec) => {
    const value = values[keySpec.key] ?? "";
    return value.trim() !== "" && !isEnvValueValid(value, keySpec.type);
  });
  if (hasInvalid) return false;
  const primaryKeys = section.keys.slice(0, 2);
  const hasPrimary = primaryKeys.every((keySpec) =>
    isEnvValueValid(values[keySpec.key] ?? "", keySpec.type)
  );
  return hasPrimary;
}

/** All known env keys in order (for building initial state and merging imports) */
export const ALL_ENV_KEYS = ENV_SECTIONS.flatMap((s) => s.keys.map((k) => k.key));
