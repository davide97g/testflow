/**
 * Zephyr Client
 *
 * Zephyr Scale API helper functions for test case retrieval and execution.
 * Handles authentication and test case data fetching.
 *
 * API Documentation: https://support.smartbear.com/zephyr-scale-cloud/api-docs
 */

export interface ZephyrConfig {
  apiToken: string;
  baseUrl?: string;
  [key: string]: unknown;
}

export interface ZephyrClient {
  getTestCase(testCaseKey: string): Promise<TestCase>;
  getTestSteps(testCaseKey: string): Promise<TestStep[]>;
  getTestCases(testCaseKeys: string[]): Promise<TestCase[]>;
  createTestExecution(
    testCaseKey: string,
    testCycleKey: string,
    executionData: ExecutionData
  ): Promise<ExecutionRecord>;
}

export interface TestCase {
  id: number;
  key: string;
  name: string;
  project?: {
    id: number;
    self: string;
  };
  objective?: string;
  precondition?: string;
  estimatedTime?: number;
  labels?: string[];
  [key: string]: unknown;
}

export interface TestStep {
  id: number;
  order: number;
  inline?: {
    description: string;
    expectedResult?: string;
    testData?: string;
    attachments?: Array<{
      id: number;
      fileName: string;
      fileSize: number;
      createdOn: string;
      self: string;
    }>;
  };
  testCase?: {
    id: number;
    key: string;
    name: string;
    self: string;
  };
  [key: string]: unknown;
}

export interface ExecutionData {
  status: "Pass" | "Fail" | "In Progress" | "Blocked" | "Not Executed";
  executionTime?: number;
  comment?: string;
  environmentName?: string;
  testScriptResults?: Array<{
    stepId: number;
    status: "Pass" | "Fail" | "In Progress" | "Blocked" | "Not Executed";
    comment?: string;
    executionTime?: number;
  }>;
  [key: string]: unknown;
}

export interface ExecutionRecord {
  id: number;
  key: string;
  testCase?: {
    id: number;
    self: string;
  };
  testCycle?: {
    id: number;
    self: string;
  };
  testExecutionStatus?: {
    id: number;
    name: string;
    self: string;
  };
  executionTime?: number;
  comment?: string;
  [key: string]: unknown;
}

interface InternalClientConfig {
  apiToken: string;
  baseUrl: string;
  getAuthHeader: () => string | Promise<string>;
}

/**
 * Initializes the Zephyr client with API credentials
 * @param config - Configuration object with API token and base URL
 * @returns Configured Zephyr client instance
 */
export const initialize = (config: ZephyrConfig): ZephyrClient => {
  const baseUrl = config.baseUrl || "https://api.zephyrscale.smartbear.com/v2";
  const { apiToken } = config;

  /**
   * Gets the authorization header for a request
   * Prefers OAuth tokens if available, falls back to API token
   */
  const getAuthHeader = async (): Promise<string> => {
    // Try to get stored Zephyr token first
    const { getZephyrToken } = await import("./token-helper");
    const storedToken = await getZephyrToken();

    if (storedToken) {
      return `Bearer ${storedToken}`;
    }

    // Fall back to API token from config
    if (apiToken) {
      return `Bearer ${apiToken}`;
    }

    throw new Error(
      "No Zephyr API token available. Please set up a token or provide one in config."
    );
  };

  const clientConfig: InternalClientConfig = {
    apiToken: config.apiToken || "",
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    getAuthHeader: () => {
      throw new Error("getAuthHeader must be called asynchronously");
    },
  };

  const makeRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const url = `${clientConfig.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    headers.set("Authorization", await getAuthHeader());
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Zephyr API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as T;
  };

  return {
    getTestCase: async (testCaseKey: string) => {
      // Test case keys are in format PROJECT-T123
      // API endpoint: GET /testcases/{testCaseKey}
      return makeRequest<TestCase>(`/testcases/${testCaseKey}`);
    },
    getTestSteps: async (testCaseKey: string) => {
      // API endpoint: GET /testcases/{testCaseKey}/teststeps
      // Returns paginated response with maxResults and startAt
      const allSteps: TestStep[] = [];
      let startAt = 0;
      const maxResults = 100;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          startAt: startAt.toString(),
          maxResults: maxResults.toString(),
        });
        const response = await makeRequest<{
          values: TestStep[];
          startAt: number;
          maxResults: number;
          total: number;
          isLast: boolean;
        }>(`/testcases/${testCaseKey}/teststeps?${params.toString()}`);

        allSteps.push(...response.values);
        hasMore = !response.isLast;
        startAt += response.maxResults;
      }

      // Sort steps by order to ensure correct sequence
      return allSteps.sort((a, b) => a.order - b.order);
    },
    getTestCases: async (testCaseKeys: string[]) => {
      // Fetch multiple test cases in parallel
      const promises = testCaseKeys.map((key) =>
        makeRequest<TestCase>(`/testcases/${key}`).catch((error) => {
          // Log error but continue with other requests
          console.error(`Failed to fetch test case ${key}:`, error);
          return null;
        })
      );

      const results = await Promise.all(promises);
      // Filter out null results from failed requests
      return results.filter((result): result is TestCase => result !== null);
    },
    createTestExecution: async (
      testCaseKey: string,
      testCycleKey: string,
      executionData: ExecutionData
    ) => {
      // API endpoint: POST /testexecutions
      // Requires: projectKey, testCaseKey, testCycleKey, statusName
      // First, get the test case to extract projectKey
      const testCase = await makeRequest<TestCase>(`/testcases/${testCaseKey}`);

      if (!testCase.project) {
        throw new Error(`Test case ${testCaseKey} does not have a project`);
      }

      // Get project key from test case key (format: PROJECT-T123, extract PROJECT)
      const projectKeyMatch = testCaseKey.match(/^([A-Z][A-Z_0-9]+)-/);
      if (!projectKeyMatch) {
        throw new Error(`Invalid test case key format: ${testCaseKey}`);
      }
      const projectKey = projectKeyMatch[1];

      // Map status to Zephyr status names
      const statusName = executionData.status;

      const requestBody = {
        projectKey,
        testCaseKey,
        testCycleKey,
        statusName,
        ...(executionData.executionTime !== undefined && {
          executionTime: executionData.executionTime,
        }),
        ...(executionData.comment && { comment: executionData.comment }),
        ...(executionData.environmentName && {
          environmentName: executionData.environmentName,
        }),
        ...(executionData.testScriptResults && {
          testScriptResults: executionData.testScriptResults,
        }),
        ...executionData,
      };

      return makeRequest<ExecutionRecord>("/testexecutions", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
    },
  };
};
