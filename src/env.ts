import { z } from "zod";

/**
 * Zod schema for environment variables validation
 */
export const envSchema = z.object({
  JIRA_EMAIL: z
    .string()
    .email("JIRA_EMAIL must be a valid email address")
    .min(1, "JIRA_EMAIL is required"),
  JIRA_API_TOKEN: z
    .string()
    .min(1, "JIRA_API_TOKEN is required"),
  BITBUCKET_EMAIL: z
    .string()
    .email("BITBUCKET_EMAIL must be a valid email address")
    .min(1, "BITBUCKET_EMAIL is required"),
  BITBUCKET_API_TOKEN: z
    .string()
    .min(1, "BITBUCKET_API_TOKEN is required"),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type Env = z.infer<typeof envSchema>;

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

