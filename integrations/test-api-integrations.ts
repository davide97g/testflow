/**
 * API Integration Test Functions
 *
 * Simple test functions to verify authentication and parameters
 * for Bitbucket, Jira, and Zephyr integrations.
 */

import { type BitbucketConfig, initialize as initializeBitbucket } from "./bitbucket-client";
import { initialize as initializeJira, type JiraConfig } from "./jira-client";
import { initialize as initializeZephyr, type ZephyrConfig } from "./zephyr-client";

/**
 * Test Bitbucket API integration
 * Verifies authentication and validates configuration
 * https://developer.atlassian.com/cloud/bitbucket/rest/
 * @param config - Bitbucket configuration (optional, will use env vars if not provided)
 * @returns Object with success status and message/details
 */
export const testBitbucketIntegration = async (
  config?: BitbucketConfig
): Promise<{ success: boolean; message: string; details?: unknown }> => {
  try {
    // Use provided config or load from environment variables
    const testConfig: BitbucketConfig = config || {
      apiToken: process.env.BITBUCKET_API_TOKEN || "",
      baseUrl: process.env.BITBUCKET_BASE_URL,
      email: process.env.BITBUCKET_EMAIL,
      workspace: process.env.BITBUCKET_WORKSPACE,
      repoSlug: process.env.BITBUCKET_REPO_SLUG,
    };

    if (!testConfig.apiToken) {
      return {
        success: false,
        message:
          "Bitbucket API token is missing. Please provide BITBUCKET_API_TOKEN or pass config.apiToken",
      };
    }

    // Initialize client
    const client = initializeBitbucket(testConfig);

    // Test authentication by fetching current user info
    // This is a simple endpoint that requires authentication
    const baseUrl = testConfig.baseUrl || "https://api.bitbucket.org/2.0";
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    const workspace = testConfig.workspace;
    const repoSlug = testConfig.repoSlug;
    const url = `${normalizedBaseUrl}/repositories/${workspace}/${repoSlug}`;
    // const url = `${normalizedBaseUrl}/user`;

    // Make a test request using the client's internal makeRequest logic
    // Since we can't access internal methods, we'll test by getting a PR or workspace info
    // Actually, let's make a direct request to test auth
    const authHeader = await (async () => {
      const { getValidAccessToken } = await import("./token-helper");
      const oauthToken = await getValidAccessToken("bitbucket");

      if (oauthToken) {
        return `Bearer ${oauthToken}`;
      }

      if (!testConfig.apiToken) {
        throw new Error("No authentication method available");
      }

      const tokenContainsColon = testConfig.apiToken.includes(":");
      if (tokenContainsColon) {
        const credentials = Buffer.from(testConfig.apiToken).toString("base64");
        return `Basic ${credentials}`;
      } else if (testConfig.email) {
        const credentials = Buffer.from(`${testConfig.email}:${testConfig.apiToken}`).toString(
          "base64"
        );
        return `Basic ${credentials}`;
      } else {
        const auth = Buffer.from(`${testConfig.email}:${testConfig.apiToken}`).toString("base64");
        return `Basic ${auth}`;
      }
    })();

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        message: `Bitbucket API authentication failed: ${response.status} ${response.statusText}`,
        details: errorText,
      };
    }

    const userData = await response.json();

    // Validate response structure
    if (!userData || typeof userData !== "object") {
      return {
        success: false,
        message: "Bitbucket API returned invalid response structure",
        details: userData,
      };
    }

    return {
      success: true,
      message: "Bitbucket API integration test passed",
      details: {
        username: (userData as { username?: string }).username || "N/A",
        displayName: (userData as { display_name?: string }).display_name || "N/A",
        accountId: (userData as { account_id?: string }).account_id || "N/A",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Bitbucket API integration test failed: ${error instanceof Error ? error.message : String(error)}`,
      details: error,
    };
  }
};

/**
 * Test Jira API integration
 * Verifies authentication and validates configuration
 * @param config - Jira configuration (optional, will use env vars if not provided)
 * @returns Object with success status and message/details
 */
export const testJiraIntegration = async (
  config?: JiraConfig
): Promise<{ success: boolean; message: string; details?: unknown }> => {
  try {
    // Use provided config or load from environment variables
    const testConfig: JiraConfig = {
      apiToken: config?.apiToken || process.env.JIRA_API_TOKEN || "",
      baseUrl: config?.baseUrl || process.env.JIRA_BASE_URL || "",
      email: config?.email || process.env.JIRA_EMAIL,
    };

    if (!testConfig.baseUrl) {
      return {
        success: false,
        message: "Jira base URL is missing. Please provide JIRA_BASE_URL or pass config.baseUrl",
      };
    }

    if (!testConfig.apiToken) {
      return {
        success: false,
        message: "Jira API token is missing. Please provide JIRA_API_TOKEN or pass config.apiToken",
      };
    }

    // Initialize client
    const client = initializeJira(testConfig);

    // Test authentication by fetching current user info
    // This uses the client's getTicket method with a simple call
    // Actually, let's use the /myself endpoint which is simpler
    const normalizedBaseUrl = testConfig.baseUrl.replace(/\/+$/, "");
    const apiBaseUrl = `${normalizedBaseUrl}/rest/api/3`;

    // Get auth header
    const authHeader = await (async () => {
      const { getValidAccessToken } = await import("./token-helper");
      const oauthToken = await getValidAccessToken("jira");

      if (oauthToken) {
        return `Bearer ${oauthToken}`;
      }

      if (testConfig.apiToken) {
        const credentials = testConfig.email
          ? `${testConfig.email}:${testConfig.apiToken}`
          : `:${testConfig.apiToken}`;
        const encoded = Buffer.from(credentials).toString("base64");
        return `Basic ${encoded}`;
      }

      throw new Error("No authentication method available");
    })();

    const response = await fetch(`${apiBaseUrl}/myself`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        message: `Jira API authentication failed: ${response.status} ${response.statusText}`,
        details: errorText,
      };
    }

    const userData = await response.json();

    // Validate response structure
    if (!userData || typeof userData !== "object") {
      return {
        success: false,
        message: "Jira API returned invalid response structure",
        details: userData,
      };
    }

    return {
      success: true,
      message: "Jira API integration test passed",
      details: {
        accountId: (userData as { accountId?: string }).accountId || "N/A",
        displayName: (userData as { displayName?: string }).displayName || "N/A",
        emailAddress: (userData as { emailAddress?: string }).emailAddress || "N/A",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Jira API integration test failed: ${error instanceof Error ? error.message : String(error)}`,
      details: error,
    };
  }
};

/**
 * Test Zephyr API integration
 * Verifies authentication and validates configuration
 * https://smartbear.portal.swaggerhub.com/zephyr-squad/default/introduction
 * @param config - Zephyr configuration (optional, will use env vars if not provided)
 * @returns Object with success status and message/details
 */
export const testZephyrIntegration = async (
  config?: ZephyrConfig
): Promise<{ success: boolean; message: string; details?: unknown }> => {
  try {
    // Use provided config or load from environment variables
    const testConfig: ZephyrConfig = {
      apiToken: config?.apiToken || process.env.ZEPHYR_API_TOKEN || "",
      baseUrl: config?.baseUrl || process.env.ZEPHYR_BASE_URL,
    };

    if (!testConfig.apiToken) {
      return {
        success: false,
        message:
          "Zephyr API token is missing. Please provide ZEPHYR_API_TOKEN or pass config.apiToken",
      };
    }

    // Initialize client
    const client = initializeZephyr(testConfig);

    // Test authentication by making a simple API call
    // Zephyr doesn't have a /myself endpoint, so we'll test with a simple request
    // We can try to get projects or test a basic endpoint
    const baseUrl = testConfig.baseUrl || "https://api.zephyrscale.smartbear.com/v2";
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

    // Get auth header
    const authHeader = await (async () => {
      const { getZephyrToken } = await import("./token-helper");
      const storedToken = await getZephyrToken();

      if (storedToken) {
        return `Bearer ${storedToken}`;
      }

      if (testConfig.apiToken) {
        return `${testConfig.apiToken}`;
      }

      throw new Error("No Zephyr API token available");
    })();

    // Test with a simple endpoint - try to get user info or projects
    // Zephyr API v2 doesn't have a /myself, so we'll use /projects which is a simple read endpoint
    const response = await fetch(`${normalizedBaseUrl}/projects?maxResults=1`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        message: `Zephyr API authentication failed: ${response.status} ${response.statusText}`,
        details: errorText,
      };
    }

    const projectsData = await response.json();

    // Validate response structure
    if (!projectsData || typeof projectsData !== "object") {
      return {
        success: false,
        message: "Zephyr API returned invalid response structure",
        details: projectsData,
      };
    }

    return {
      success: true,
      message: "Zephyr API integration test passed",
      details: {
        projectsAvailable: Array.isArray((projectsData as { values?: unknown[] }).values)
          ? (projectsData as { values: unknown[] }).values.length
          : "N/A",
        totalProjects: (projectsData as { total?: number }).total || "N/A",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Zephyr API integration test failed: ${error instanceof Error ? error.message : String(error)}`,
      details: error,
    };
  }
};

/**
 * Test all three API integrations
 * @param configs - Optional configs for each integration
 * @returns Object with results for each integration
 */
export const testAllIntegrations = async (configs?: {
  bitbucket?: BitbucketConfig;
  jira?: JiraConfig;
  zephyr?: ZephyrConfig;
}): Promise<{
  bitbucket: Awaited<ReturnType<typeof testBitbucketIntegration>>;
  jira: Awaited<ReturnType<typeof testJiraIntegration>>;
  zephyr: Awaited<ReturnType<typeof testZephyrIntegration>>;
}> => {
  const [bitbucket, jira, zephyr] = await Promise.all([
    testBitbucketIntegration(configs?.bitbucket),
    testJiraIntegration(configs?.jira),
    testZephyrIntegration(configs?.zephyr),
  ]);

  return { bitbucket, jira, zephyr };
};
