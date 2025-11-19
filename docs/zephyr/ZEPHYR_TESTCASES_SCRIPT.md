# Zephyr Test Cases Extraction Script Documentation

This document provides comprehensive documentation for the `get-zephyr-testcases.ts` script, including API documentation sources, endpoint examples, and workflow explanation.

## Table of Contents

1. [API Documentation Sources](#api-documentation-sources)
2. [Environment Variables](#environment-variables)
3. [API Endpoints Used](#api-endpoints-used)
4. [Resource Examples](#resource-examples)
5. [Script Workflow](#script-workflow)
6. [Usage Guide](#usage-guide)
7. [Output Structure](#output-structure)

---

## API Documentation Sources

### Primary Documentation

The script uses **Zephyr Squad Cloud REST API v2**. The API documentation can be found in the following locations:

1. **Zephyr Squad Cloud API Documentation**

   - **URL**: [https://zephyrsquad.docs.apiary.io/](https://zephyrsquad.docs.apiary.io/)
   - **Description**: Official interactive API documentation with examples
   - **Format**: Apiary documentation

2. **Local API Blueprint**

   - **File**: `docs/zephyr/zephyrsquad.apib`
   - **Description**: API Blueprint format documentation included in this repository
   - **Host**: `https://prod-api.zephyr4jiracloud.com/connect`

3. **Zephyr Support Documentation**
   - **API Access Tokens**: [https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html)
   - **JWT Authentication**: [https://support.smartbear.com/zephyr-squad-cloud-v1/docs/en/zephyr-squad-cloud-rest-api/generating-a-jwt-authentication-token-for-zephyr-squad-cloud-api.html](https://support.smartbear.com/zephyr-squad-cloud-v1/docs/en/zephyr-squad-cloud-rest-api/generating-a-jwt-authentication-token-for-zephyr-squad-cloud-api.html)

### API Base URLs

The script uses two different base URLs:

1. **`ZEPHYR_BASE_URL`**: For listing test cases

   - Example: `https://api.zephyrscale.smartbear.com/v2`
   - Used for: `/v2/testcases` endpoint

2. **`ZEPHYR_CONNECT_BASE_URL`**: For detailed endpoints (test steps, links, executions)
   - Example: `https://your-instance.zephyr4jiracloud.com/connect/v2`
   - Used for: `/v2/testcases/{key}/teststeps`, `/v2/testcases/{key}/links`, `/v2/executions`

---

## Environment Variables

The script requires the following environment variables:

| Variable                  | Required | Description                         | Example                                                 |
| ------------------------- | -------- | ----------------------------------- | ------------------------------------------------------- |
| `ZEPHYR_PROJECT_KEY`      | Yes      | Project key identifier              | `PROJ`                                                  |
| `ZEPHYR_BASE_URL`         | Yes      | Base URL for test cases listing     | `https://api.zephyrscale.smartbear.com/v2`              |
| `ZEPHYR_CONNECT_BASE_URL` | Yes      | Base URL for detailed endpoints     | `https://your-instance.zephyr4jiracloud.com/connect/v2` |
| `ZEPHYR_ACCESS_TOKEN`     | Yes      | JWT Bearer token for authentication | `eyJhbGciOiJIUzI1NiI...`                                |
| `ZEPHYR_PROJECT_ID`       | No       | Project ID for filtering            | `123456`                                                |
| `ZEPHYR_FOLDER_ID`        | No       | Folder ID to filter test cases      | `12345678`                                              |

### Setting Environment Variables

Create a `.env` file in the project root:

```bash
ZEPHYR_PROJECT_KEY=PROJ
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2
ZEPHYR_CONNECT_BASE_URL=https://your-instance.zephyr4jiracloud.com/connect/v2
ZEPHYR_ACCESS_TOKEN=your_jwt_token_here
ZEPHYR_PROJECT_ID=123456
ZEPHYR_FOLDER_ID=12345678
```

---

## API Endpoints Used

The script interacts with the following Zephyr Squad Cloud API v2 endpoints:

### 1. List Test Cases

**Endpoint**: `GET /v2/testcases`

**Base URL**: `ZEPHYR_BASE_URL`

**Purpose**: Fetches all test cases for a project (with pagination)

**Query Parameters**:

- `projectKey` (required): Project key identifier
- `folderId` (optional): Filter by folder ID
- `projectId` (optional): Filter by project ID
- `startAt` (optional): Pagination offset (default: 0)
- `maxResults` (optional): Page size (default: 50)

**Authentication**: Bearer token in `Authorization` header

### 2. Get Test Steps

**Endpoint**: `GET /v2/testcases/{testCaseKey}/teststeps`

**Base URL**: `ZEPHYR_CONNECT_BASE_URL`

**Purpose**: Retrieves all test steps for a specific test case

**Path Parameters**:

- `testCaseKey` (required): Test case key (e.g., `PROJ-T123`)

**Authentication**: Bearer token in `Authorization` header

### 3. Get Executions

**Endpoint**: `GET /v2/executions`

**Base URL**: `ZEPHYR_CONNECT_BASE_URL`

**Purpose**: Retrieves execution history for a test case

**Query Parameters**:

- `testCaseKey` (required): Test case key
- `projectId` (optional): Project ID filter
- `maxResults` (optional): Maximum results per page (default: 50)
- `startAt` (optional): Pagination offset (default: 0)

**Authentication**: Bearer token in `Authorization` header

### 4. Get Links (Traceability)

**Endpoint**: `GET /v2/testcases/{testCaseKey}/links`

**Base URL**: `ZEPHYR_CONNECT_BASE_URL`

**Purpose**: Retrieves linked issues and traceability information

**Path Parameters**:

- `testCaseKey` (required): Test case key

**Authentication**: Bearer token in `Authorization` header

---

## Resource Examples

### Example 1: List Test Cases Request

**cURL Command**:

```bash
curl -X GET \
  'https://api.zephyrscale.smartbear.com/v2/testcases?projectKey=PROJ&projectId=123456&folderId=12345678&startAt=0&maxResults=50' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Accept: application/json'
```

**Response Example**:

```json
{
  "values": [
    {
      "id": 123456789,
      "key": "PROJ-T123",
      "name": "Sample Test Case - Example Feature",
      "projectKey": "PROJ",
      "status": {
        "id": 10001,
        "name": "Approved"
      },
      "priority": {
        "id": 10002,
        "name": "High"
      },
      "createdOn": "2024-01-19T14:06:55Z",
      "precondition": "PROJ-T100<br>PROJ-T101<br>Prerequisites must be met",
      "project": {
        "id": 123456
      },
      "testScript": {
        "self": "https://your-instance.zephyr4jiracloud.com/connect/v2/testcases/PROJ-T123/teststeps"
      },
      "links": {
        "self": "https://your-instance.zephyr4jiracloud.com/connect/v2/testcases/PROJ-T123/links",
        "issues": [
          {
            "issueId": 100001,
            "type": "COVERAGE"
          }
        ]
      }
    }
  ],
  "maxResults": 50,
  "startAt": 0,
  "total": 100,
  "isLast": false
}
```

### Example 2: Get Test Steps Request

**cURL Command**:

```bash
curl -X GET \
  'https://your-instance.zephyr4jiracloud.com/connect/v2/testcases/PROJ-T123/teststeps' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Accept: application/json'
```

**Response Example**:

```json
{
  "next": null,
  "startAt": 0,
  "maxResults": 4,
  "total": 4,
  "isLast": true,
  "values": [
    {
      "inline": {
        "description": "Perform action step",
        "testData": null,
        "expectedResult": "Expected result should be displayed",
        "customFields": {},
        "reflectRef": null
      },
      "testCase": null
    },
    {
      "inline": {
        "description": "Select an item",
        "testData": null,
        "expectedResult": "Item details should be displayed with expected options",
        "customFields": {},
        "reflectRef": null
      },
      "testCase": null
    }
  ]
}
```

### Example 3: Get Executions Request

**cURL Command**:

```bash
curl -X GET \
  'https://your-instance.zephyr4jiracloud.com/connect/v2/executions?testCaseKey=PROJ-T123&projectId=123456&maxResults=50&startAt=0' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Accept: application/json'
```

**Response Example**:

```json
{
  "totalExecutionCount": 5,
  "currentOffset": 0,
  "totalCount": 5,
  "searchObjectList": [
    {
      "id": "0001234567890123-abcdef1234567890-0001",
      "issueId": 123456789,
      "status": {
        "name": "PASS",
        "id": 1,
        "description": "Test was executed and passed successfully.",
        "color": "#75B000"
      },
      "cycleName": "Regression Cycle",
      "executedBy": "john.doe@example.com",
      "executedOn": "2024-01-20T10:30:00Z",
      "comment": "All steps passed successfully",
      "defects": []
    }
  ],
  "executionStatus": {}
}
```

### Example 4: Get Links (Traceability) Request

**cURL Command**:

```bash
curl -X GET \
  'https://your-instance.zephyr4jiracloud.com/connect/v2/testcases/PROJ-T123/links' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Accept: application/json'
```

**Response Example**:

```json
{
  "issues": [
    {
      "issueId": 100001,
      "self": "https://your-instance.zephyr4jiracloud.com/connect/v2/links/12345678",
      "id": 12345678,
      "target": "https://your-company.atlassian.net/rest/api/2/issue/100001",
      "type": "COVERAGE"
    },
    {
      "issueId": 100002,
      "self": "https://your-instance.zephyr4jiracloud.com/connect/v2/links/12345679",
      "id": 12345679,
      "target": "https://your-company.atlassian.net/rest/api/2/issue/100002",
      "type": "RELATES"
    }
  ]
}
```

---

## Script Workflow

The script follows this workflow to extract comprehensive test case information:

```
┌─────────────────────────────────────────────────────────────┐
│                    Script Execution Flow                     │
└─────────────────────────────────────────────────────────────┘

1. Initialize
   ├── Load environment variables
   ├── Validate required variables
   └── Set up error logging

2. Fetch Test Cases List
   ├── Call GET /v2/testcases?projectKey={key}&projectId={id}
   ├── Handle pagination (fetch all pages)
   └── Store basic test case information

3. For Each Test Case (Parallel Processing with Rate Limiting)
   │
   ├── 3.1. Extract Basic Information
   │   ├── ID, Key, Title, Name
   │   ├── Status, Priority, Type
   │   ├── Description (from objective field)
   │   └── Preconditions
   │
   ├── 3.2. Fetch Test Steps
   │   ├── Call GET /v2/testcases/{key}/teststeps
   │   ├── Extract: description, testData, expectedResult
   │   └── Map to: step, data, result, conditions, expectations
   │
   ├── 3.3. Fetch Executions
   │   ├── Call GET /v2/executions?testCaseKey={key}&projectId={id}
   │   ├── Extract: status, cycle, executedBy, executedOn, comment
   │   └── Map execution history
   │
   └── 3.4. Fetch Links (Traceability)
       ├── Call GET /v2/testcases/{key}/links
       ├── Extract: linked issues, requirements
       └── Map to traceability object

4. Save Results
   ├── Save basic test cases: zephyr-testcases.json
   ├── Save detailed test cases: zephyr-testcases-detailed.json
   └── Generate summary: zephyr-testcases-summary.txt

5. Error Handling
   ├── Log errors to .testflow/testflow.log
   ├── Continue processing other test cases on failure
   └── Provide user-friendly error messages
```

### Detailed Workflow Steps

#### Step 1: Initialization

- Validates environment variables using `loadEnvWithWarnings()`
- Sets up error logging to `.testflow/testflow.log`
- Initializes progress spinners using `ora`

#### Step 2: Fetch Test Cases

- Calls the test cases endpoint with pagination
- Handles `startAt` and `maxResults` for pagination
- Filters by `projectKey`, `projectId`, and optionally `folderId`
- Collects all test cases across all pages

#### Step 3: Enrich Each Test Case

For each test case, the script fetches additional information:

**3.1 Basic Information Extraction**

- Extracts fields directly from the test case response
- Maps `objective` → `description`
- Maps `precondition` → `preconditions`

**3.2 Test Steps**

- Fetches test steps from the `teststeps` endpoint
- Extracts from `inline` object:
  - `description` → step description
  - `testData` → test data/conditions
  - `expectedResult` → expected results/expectations
- Handles both new API structure (`inline`) and legacy structure

**3.3 Executions**

- Fetches execution history
- Extracts execution status, cycle information, executor, execution date
- Includes comments and linked defects

**3.4 Traceability**

- Fetches linked issues and requirements
- Maps to traceability object with issue IDs, types, and targets

#### Step 4: Save Results

- Creates output directory: `.testflow/output/zephyr-{projectKey}/raw/`
- Saves two JSON files:
  - `zephyr-testcases.json`: Basic test case information
  - `zephyr-testcases-detailed.json`: Complete detailed information
- Generates text summary: `zephyr-testcases-summary.txt`

#### Step 5: Error Handling

- Logs all errors to `.testflow/testflow.log` with full context
- Continues processing other test cases if one fails
- Provides clear error messages for common issues (401, 403, 404)
- Adds delays between requests to avoid rate limiting

---

## Usage Guide

### Basic Usage

```bash
# Using project key from environment variable
bun run apps/cli/src/scripts/get-zephyr-testcases.ts

# Or specify project key as argument
bun run apps/cli/src/scripts/get-zephyr-testcases.ts PROJ
```

### Prerequisites

1. **Set up environment variables** in `.env` file
2. **Generate Zephyr API token** (see [ZEPHYR_API_TOKEN_GUIDE.md](./ZEPHYR_API_TOKEN_GUIDE.md))
3. **Ensure you have access** to the Zephyr project

### Command Line Arguments

```bash
get-zephyr-testcases.ts [projectKey]
```

- `projectKey` (optional): Overrides `ZEPHYR_PROJECT_KEY` environment variable

### Output Location

All output files are saved to:

```
.testflow/output/zephyr-{projectKey}/
├── raw/
│   ├── zephyr-testcases.json          # Basic test cases
│   └── zephyr-testcases-detailed.json  # Detailed test cases
└── zephyr-testcases-summary.txt        # Text summary
```

### Error Logging

Errors are logged to:

```
.testflow/testflow.log
```

---

## Output Structure

### Basic Test Cases (`zephyr-testcases.json`)

Contains the raw test case data from the API:

```json
[
  {
    "id": 123456789,
    "key": "PROJ-T123",
    "name": "Sample Test Case",
    "projectKey": "PROJ",
    "status": { "id": 10001, "name": "Approved" },
    "priority": { "id": 10002, "name": "High" },
    "createdOn": "2024-01-19T14:06:55Z",
    "precondition": "PROJ-T100<br>PROJ-T101"
  }
]
```

### Detailed Test Cases (`zephyr-testcases-detailed.json`)

Contains enriched test case data with all additional information:

```json
[
  {
    "id": 123456789,
    "key": "PROJ-T123",
    "title": "Sample Test Case",
    "name": "Sample Test Case",
    "description": "Test case description",
    "preconditions": "PROJ-T100<br>PROJ-T101",
    "projectKey": "PROJ",
    "status": { "id": 10001, "name": "Approved" },
    "priority": { "id": 10002, "name": "High" },
    "createdOn": "2024-01-19T14:06:55Z",
    "steps": [
      {
        "orderId": 1,
        "step": "Perform action step",
        "description": "Perform action step",
        "data": null,
        "result": "Expected result should be displayed",
        "conditions": null,
        "expectations": "Expected result should be displayed"
      }
    ],
    "executions": [
      {
        "id": "0001234567890123-abcdef1234567890-0001",
        "status": "PASS",
        "cycleName": "Regression Cycle",
        "executedBy": "user@example.com",
        "executedOn": "2024-01-20T10:30:00Z",
        "comment": "All steps passed successfully",
        "defects": []
      }
    ],
    "traceability": {
      "linkedIssues": [
        {
          "issueId": 100001,
          "id": 12345678,
          "type": "COVERAGE",
          "target": "https://your-company.atlassian.net/rest/api/2/issue/100001"
        }
      ],
      "requirements": [],
      "executions": []
    }
  }
]
```

### Summary File (`zephyr-testcases-summary.txt`)

Human-readable text summary:

```
Zephyr Test Cases for Project: PROJ
Total Test Cases: 100

================================================================================

1. PROJ-T123: Sample Test Case - Example Feature
   Status: Approved
   Priority: High
   Created: 2024-01-19T14:06:55Z

2. PROJ-T124: Another Sample Test Case
   Status: Approved
   Priority: High
   Created: 2024-01-19T14:06:55Z
...
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors (401)

- **Cause**: Invalid or expired JWT token
- **Solution**: Generate a new API token from Zephyr settings

#### 2. Access Forbidden (403)

- **Cause**: Insufficient permissions
- **Solution**: Check Zephyr project permissions for your account

#### 3. Project Not Found (404)

- **Cause**: Invalid project key or project ID
- **Solution**: Verify `ZEPHYR_PROJECT_KEY` and `ZEPHYR_PROJECT_ID` values

#### 4. Empty Steps/Executions

- **Cause**: Using wrong base URL for detailed endpoints
- **Solution**: Ensure `ZEPHYR_CONNECT_BASE_URL` is set correctly (should contain "connect")

#### 5. Rate Limiting

- **Cause**: Too many requests in short time
- **Solution**: Script includes 200ms delays between requests; increase if needed

### Debugging

1. **Check error logs**: `.testflow/testflow.log`
2. **Verify environment variables**: Ensure all required variables are set
3. **Test API endpoints manually**: Use cURL commands from examples above
4. **Check network connectivity**: Ensure you can reach the Zephyr API endpoints

---

## Additional Resources

- [Zephyr API Token Setup Guide](./ZEPHYR_API_TOKEN_GUIDE.md)
- [Zephyr Squad Cloud API Documentation](https://zephyrsquad.docs.apiary.io/)
- [Zephyr API Access Tokens Management](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html)
- [JWT Authentication Guide](https://support.smartbear.com/zephyr-squad-cloud-v1/docs/en/zephyr-squad-cloud-rest-api/generating-a-jwt-authentication-token-for-zephyr-squad-cloud-api.html)

---

**Last Updated**: 2024-01-20  
**Script Version**: 1.0.0  
**API Version**: Zephyr Squad Cloud REST API v2
