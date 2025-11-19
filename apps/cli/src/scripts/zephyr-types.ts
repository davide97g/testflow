/**
 * TypeScript interfaces and types for Zephyr API responses and data structures
 */

export interface ZephyrTestCase {
  id?: number;
  key?: string;
  name?: string;
  projectKey?: string;
  status?: {
    id?: number;
    name?: string;
  };
  priority?: {
    id?: number;
    name?: string;
  };
  type?: {
    id?: number;
    name?: string;
  };
  createdOn?: string;
  updatedOn?: string;
  [key: string]: unknown;
}

export interface ZephyrTestStepInline {
  description?: string;
  testData?: string | null;
  expectedResult?: string | null;
  customFields?: Record<string, unknown>;
  reflectRef?: string | null;
}

export interface ZephyrTestStep {
  inline?: ZephyrTestStepInline;
  testCase?: unknown | null;
  // Legacy fields for backward compatibility
  id?: string;
  orderId?: number;
  issueId?: number;
  step?: string;
  data?: string;
  result?: string;
  createdBy?: string;
  createdByAccountId?: string;
  modifiedBy?: string;
  modifiedByAccountId?: string;
  createdOn?: number;
  lastModifiedOn?: number;
  customFieldValues?: unknown[];
  attachments?: unknown[];
}

export interface ZephyrTestStepsResponse {
  next?: string | null;
  startAt?: number;
  maxResults?: number;
  total?: number;
  isLast?: boolean;
  values?: ZephyrTestStep[];
  totalCount?: number; // Legacy field
}

export interface ZephyrExecution {
  id?: string;
  issueId?: number;
  versionId?: number;
  projectId?: number;
  cycleId?: string;
  status?: {
    name?: string;
    id?: number;
    description?: string;
    color?: string;
  };
  cycleName?: string;
  executedBy?: string;
  executedOn?: string;
  comment?: string;
  defects?: unknown[];
  testCaseKey?: string;
  testCaseSummary?: string;
  projectKey?: string;
  versionName?: string;
  priority?: string;
}

export interface ZephyrExecutionsResponse {
  totalExecutionCount?: number;
  currentOffset?: number;
  totalCount?: number;
  searchObjectList?: ZephyrExecution[];
  executionStatus?: unknown[];
}

export interface ZephyrTraceabilityExecution {
  execution?: {
    id?: string;
    status?: string;
    statusId?: string;
    stepLevel?: boolean;
    testCycle?: string;
  };
  requirement?: Array<{
    id?: number;
    key?: string;
    status?: string;
    statusId?: number;
    summary?: string;
  }>;
  test?: {
    id?: number;
    key?: string;
    status?: string;
    statusId?: number;
    summary?: string;
  };
}

export interface DetailedTestCase {
  id?: number;
  key?: string;
  title?: string;
  name?: string;
  description?: string;
  preconditions?: string;
  projectKey?: string;
  status?: {
    id?: number;
    name?: string;
  };
  priority?: {
    id?: number;
    name?: string;
  };
  type?: {
    id?: number;
    name?: string;
  };
  createdOn?: string;
  updatedOn?: string;
  steps?: Array<{
    id?: string;
    orderId?: number;
    step?: string;
    data?: string;
    result?: string;
    conditions?: string;
    description?: string;
    expectations?: string;
    createdOn?: number;
    lastModifiedOn?: number;
  }>;
  executions?: Array<{
    id?: string;
    status?: string;
    cycleName?: string;
    executedBy?: string;
    executedOn?: string;
    comment?: string;
    defects?: unknown[];
  }>;
  traceability?: {
    requirements?: Array<{
      id?: number;
      key?: string;
      status?: string;
      summary?: string;
    }>;
    linkedIssues?: Array<{
      issueId?: number;
      id?: number;
      type?: string;
      target?: string;
      self?: string;
    }>;
    executions?: ZephyrTraceabilityExecution[];
  };
  [key: string]: unknown;
}

export interface ZephyrTestCasesResponse {
  values?: ZephyrTestCase[];
  maxResults?: number;
  startAt?: number;
  total?: number;
  isLast?: boolean;
}

export interface GetZephyrTestCasesParams {
  projectKey: string;
  folderId?: string;
}

