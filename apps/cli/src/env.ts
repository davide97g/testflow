import chalk from "chalk";
import { z } from "zod";

/**
 * Zod schema for environment variables validation
 */
export const envSchema = z.object({
  JIRA_EMAIL: z
    .string()
    .email("JIRA_EMAIL must be a valid email address")
    .min(1, "JIRA_EMAIL is required"),
  JIRA_API_TOKEN: z.string().min(1, "JIRA_API_TOKEN is required"),
  BITBUCKET_EMAIL: z
    .string()
    .email("BITBUCKET_EMAIL must be a valid email address")
    .min(1, "BITBUCKET_EMAIL is required")
    .optional(),
  BITBUCKET_API_TOKEN: z
    .string()
    .min(1, "BITBUCKET_API_TOKEN is required")
    .optional(),
  CONFLUENCE_EMAIL: z
    .string()
    .email("CONFLUENCE_EMAIL must be a valid email address")
    .min(1, "CONFLUENCE_EMAIL is required")
    .optional(),
  CONFLUENCE_API_TOKEN: z
    .string()
    .min(1, "CONFLUENCE_API_TOKEN is required")
    .optional(),
  ZEPHYR_PROJECT_KEY: z
    .string()
    .min(1, "ZEPHYR_PROJECT_KEY is required")
    .optional(),
  ZEPHYR_BASE_URL: z
    .string()
    .url("ZEPHYR_BASE_URL must be a valid URL")
    .optional(),
  ZEPHYR_ACCESS_TOKEN: z
    .string()
    .min(1, "ZEPHYR_ACCESS_TOKEN is required")
    .optional(),
  ZEPHYR_FOLDER_ID: z
    .string()
    .min(1, "ZEPHYR_FOLDER_ID is required")
    .optional(),
  ZEPHYR_PROJECT_ID: z
    .string()
    .min(1, "ZEPHYR_PROJECT_ID is required")
    .optional(),
  ZEPHYR_CONNECT_BASE_URL: z
    .string()
    .url("ZEPHYR_CONNECT_BASE_URL must be a valid URL")
    .optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Partial environment variables type for when some are missing
 */
export type PartialEnv = Partial<Env>;

/**
 * Load and validate environment variables
 * @returns Validated environment variables object
 * @throws Error if validation fails
 */
export const loadEnv = (): Env => {
  const env = {
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    BITBUCKET_EMAIL: process.env.BITBUCKET_EMAIL,
    BITBUCKET_API_TOKEN: process.env.BITBUCKET_API_TOKEN,
    CONFLUENCE_EMAIL: process.env.CONFLUENCE_EMAIL,
    CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN,
    ZEPHYR_PROJECT_KEY: process.env.ZEPHYR_PROJECT_KEY,
    ZEPHYR_BASE_URL: process.env.ZEPHYR_BASE_URL,
    ZEPHYR_ACCESS_TOKEN: process.env.ZEPHYR_ACCESS_TOKEN,
    ZEPHYR_FOLDER_ID: process.env.ZEPHYR_FOLDER_ID,
    ZEPHYR_PROJECT_ID: process.env.ZEPHYR_PROJECT_ID,
    ZEPHYR_CONNECT_BASE_URL: process.env.ZEPHYR_CONNECT_BASE_URL,
  };

  try {
    const validatedEnv = envSchema.parse(env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => {
          const path = err.path.join(".");
          return `${path}: ${err.message}`;
        })
        .join("\n");
      throw new Error(
        `Environment variables validation failed:\n${errorMessages}\n\nPlease check your environment variables or .env file.`
      );
    }
    throw error;
  }
};

/**
 * Load and validate environment variables with optional validation
 * Returns undefined for missing variables instead of throwing
 * @returns Validated environment variables object or undefined if validation fails
 */
export const loadEnvOptional = (): Env | undefined => {
  try {
    return loadEnv();
  } catch {
    return undefined;
  }
};

/**
 * Load environment variables and show warnings for missing ones instead of throwing errors
 * @param requiredVars - Array of environment variable names that are required for this script
 * @returns Partial environment variables object (may be missing some values)
 */
export const loadEnvWithWarnings = (
  requiredVars: Array<keyof Env> = ["JIRA_EMAIL", "JIRA_API_TOKEN"]
): PartialEnv => {
  const env: PartialEnv = {
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    BITBUCKET_EMAIL: process.env.BITBUCKET_EMAIL,
    BITBUCKET_API_TOKEN: process.env.BITBUCKET_API_TOKEN,
    CONFLUENCE_EMAIL: process.env.CONFLUENCE_EMAIL,
    CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_API_TOKEN,
    ZEPHYR_PROJECT_KEY: process.env.ZEPHYR_PROJECT_KEY,
    ZEPHYR_BASE_URL: process.env.ZEPHYR_BASE_URL,
    ZEPHYR_ACCESS_TOKEN: process.env.ZEPHYR_ACCESS_TOKEN,
    ZEPHYR_FOLDER_ID: process.env.ZEPHYR_FOLDER_ID,
    ZEPHYR_PROJECT_ID: process.env.ZEPHYR_PROJECT_ID,
    ZEPHYR_CONNECT_BASE_URL: process.env.ZEPHYR_CONNECT_BASE_URL,
  };

  const missingVars: Array<keyof Env> = [];
  const invalidVars: Array<{ name: keyof Env; message: string }> = [];

  // Check for missing required variables
  for (const varName of requiredVars) {
    const value = env[varName];
    if (!value || value.trim() === "") {
      missingVars.push(varName);
    } else {
      // Validate email format for email variables
      if (
        varName === "JIRA_EMAIL" ||
        varName === "BITBUCKET_EMAIL" ||
        varName === "CONFLUENCE_EMAIL"
      ) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          invalidVars.push({
            name: varName,
            message: "must be a valid email address",
          });
        }
      }
      // Validate URL format for URL variables
      if (varName === "ZEPHYR_BASE_URL") {
        try {
          new URL(value);
        } catch {
          invalidVars.push({
            name: varName,
            message: "must be a valid URL",
          });
        }
      }
    }
  }

  // Show warnings if any variables are missing or invalid
  if (missingVars.length > 0 || invalidVars.length > 0) {
    console.warn(
      chalk.yellow(`\n⚠️  Environment Variables Warning\n${"─".repeat(50)}`)
    );

    if (missingVars.length > 0) {
      console.warn(chalk.yellow("\nMissing environment variables:"));
      for (const varName of missingVars) {
        console.warn(chalk.yellow(`  • ${varName}`));
      }
    }

    if (invalidVars.length > 0) {
      console.warn(chalk.yellow("\nInvalid environment variables:"));
      for (const { name, message } of invalidVars) {
        console.warn(chalk.yellow(`  • ${name}: ${message}`));
      }
    }

    // Check which integrations are missing
    const missingBitbucket =
      !env.BITBUCKET_EMAIL ||
      !env.BITBUCKET_API_TOKEN ||
      missingVars.includes("BITBUCKET_EMAIL") ||
      missingVars.includes("BITBUCKET_API_TOKEN") ||
      invalidVars.some((v) => v.name === "BITBUCKET_EMAIL");

    const missingConfluence =
      !env.CONFLUENCE_EMAIL ||
      !env.CONFLUENCE_API_TOKEN ||
      missingVars.includes("CONFLUENCE_EMAIL") ||
      missingVars.includes("CONFLUENCE_API_TOKEN") ||
      invalidVars.some((v) => v.name === "CONFLUENCE_EMAIL");

    const missingZephyr =
      !env.ZEPHYR_PROJECT_KEY ||
      !env.ZEPHYR_BASE_URL ||
      !env.ZEPHYR_ACCESS_TOKEN ||
      missingVars.includes("ZEPHYR_PROJECT_KEY") ||
      missingVars.includes("ZEPHYR_BASE_URL") ||
      missingVars.includes("ZEPHYR_ACCESS_TOKEN") ||
      invalidVars.some((v) => v.name === "ZEPHYR_BASE_URL");

    // Show integration status
    if (missingBitbucket || missingConfluence || missingZephyr) {
      console.warn(chalk.yellow("\n⚠️  Integration Status:"));
      if (missingBitbucket) {
        console.warn(
          chalk.yellow(
            "  • Bitbucket integration: SKIPPED (missing BITBUCKET_EMAIL or BITBUCKET_API_TOKEN)"
          )
        );
      }
      if (missingConfluence) {
        console.warn(
          chalk.yellow(
            "  • Confluence integration: SKIPPED (missing CONFLUENCE_EMAIL or CONFLUENCE_API_TOKEN)"
          )
        );
      }
      if (missingZephyr) {
        console.warn(
          chalk.yellow(
            "  • Zephyr integration: SKIPPED (missing ZEPHYR_PROJECT_KEY, ZEPHYR_BASE_URL, or ZEPHYR_ACCESS_TOKEN)"
          )
        );
      }
    }

    // Show documentation references
    console.warn(chalk.yellow("\n📚 Documentation:"));
    const needsJira =
      missingVars.includes("JIRA_EMAIL") ||
      missingVars.includes("JIRA_API_TOKEN") ||
      invalidVars.some((v) => v.name === "JIRA_EMAIL");
    const needsBitbucket =
      missingVars.includes("BITBUCKET_EMAIL") ||
      missingVars.includes("BITBUCKET_API_TOKEN") ||
      invalidVars.some((v) => v.name === "BITBUCKET_EMAIL");
    const needsConfluence =
      missingVars.includes("CONFLUENCE_EMAIL") ||
      missingVars.includes("CONFLUENCE_API_TOKEN") ||
      invalidVars.some((v) => v.name === "CONFLUENCE_EMAIL");

    const needsZephyr =
      missingVars.includes("ZEPHYR_PROJECT_KEY") ||
      missingVars.includes("ZEPHYR_BASE_URL") ||
      missingVars.includes("ZEPHYR_ACCESS_TOKEN") ||
      invalidVars.some((v) => v.name === "ZEPHYR_BASE_URL");

    if (needsJira) {
      console.warn(
        chalk.yellow("  • JIRA API Token: docs/JIRA_API_TOKEN_GUIDE.md")
      );
    }
    if (needsBitbucket) {
      console.warn(
        chalk.yellow(
          "  • Bitbucket API Token: docs/BITBUCKET_API_TOKEN_GUIDE.md"
        )
      );
    }
    if (needsConfluence) {
      console.warn(
        chalk.yellow(
          "  • Confluence API Token: docs/CONFLUENCE_API_TOKEN_GUIDE.md (if available)"
        )
      );
    }
    if (needsZephyr) {
      console.warn(
        chalk.yellow("  • Zephyr API Token: docs/ZEPHYR_API_TOKEN_GUIDE.md")
      );
    }

    if (missingVars.length > 0 || invalidVars.length > 0) {
      console.warn(
        chalk.yellow(
          "\nNote: Missing optional environment variables will cause their integrations to be skipped."
        )
      );
    }

    console.warn(
      chalk.yellow(
        "\nPlease set the required environment variables in your .env file."
      )
    );
    console.warn(chalk.yellow(`${"─".repeat(50)}\n`));
  }

  return env;
};
