import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Zod schema for configuration validation
 */
export const configSchema = z.object({
  bitbucket: z
    .object({
      workspace: z.string().min(1, "Bitbucket workspace is required"),
      repo: z.string().min(1, "Bitbucket repository is required"),
    })
    .optional(),
  jira: z.object({
    baseUrl: z.string().url("Jira baseUrl must be a valid URL").min(1, "Jira baseUrl is required"),
    boardId: z.number().int().positive().optional(),
    assignee: z.string().email("Assignee must be a valid email").optional(),
    statuses: z.array(z.string().min(1)).optional(),
  }),
  confluence: z
    .object({
      baseUrl: z
        .string()
        .url("Confluence baseUrl must be a valid URL")
        .min(1, "Confluence baseUrl is required"),
    })
    .optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from JSON file
 * @param configPath - Optional path to config file (defaults to config.json in project root)
 * @returns Validated configuration object
 * @throws Error if config file doesn't exist or validation fails
 */
export const loadConfig = async (configPath?: string): Promise<Config> => {
  const configFilePath = configPath || path.join(process.cwd(), ".testflow", "config.json");

  if (!existsSync(configFilePath)) {
    throw new Error(
      `Configuration file not found at ${configFilePath}. Please run 'testflow init' to create it.`
    );
  }

  try {
    const configData = JSON.parse(readFileSync(configFilePath, "utf8"));
    const validatedConfig = configSchema.parse(configData);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new Error(
        `Configuration validation failed:\n${errorMessages}\n\nPlease check your config.json file.`
      );
    }
    throw error;
  }
};

/**
 * Synchronously load and validate configuration from JSON file
 * @param configPath - Optional path to config file (defaults to config.json in project root)
 * @returns Validated configuration object
 * @throws Error if config file doesn't exist or validation fails
 */
export const loadConfigSync = (configPath?: string): Config => {
  const configFilePath = configPath || path.join(process.cwd(), ".testflow", "config.json");

  try {
    const configData = JSON.parse(readFileSync(configFilePath, "utf8"));
    const validatedConfig = configSchema.parse(configData);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new Error(
        `Configuration validation failed:\n${errorMessages}\n\nPlease check your config.json file.`
      );
    }
    if (error instanceof Error && error.message.includes("ENOENT")) {
      throw new Error(
        `Configuration file not found at ${configFilePath}. Please run 'testflow init' to create it.`
      );
    }
    throw error;
  }
};
