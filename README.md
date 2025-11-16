# Electron + React: Zephyr (Jira) Sidebar + LLM → Playwright MCP Integration

A full-stack Electron application that integrates:

1. **Zephyr (Jira) sidebar** - Browse and select test cases from Jira/Zephyr
2. **LLM → Playwright MCP integration** - Uses structured JSON tool-call protocol to convert test cases into Playwright automation
3. **Jira Cloud OAuth 2.0 (3LO)** - Browser-based OAuth flow for authenticating Jira/Zephyr requests

## Project Structure

```
.
├── package.json
├── electron/               # Electron main process files
│   ├── main.js            # Electron main process
│   └── preload.js         # IPC bridge
├── shared/                 # Shared utilities
│   ├── mcp-client.js      # MCP client / JSON protocol helper
│   └── llm-runner.js      # LLM test runner using OpenAI API
└── renderer/              # React renderer process
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── index.jsx       # React entry point
        ├── index.css
        ├── App.jsx         # Main React component
        ├── zephyr.js       # Zephyr API client
        └── mcp_protocol.js # MCP protocol helper
```

## Features

### 1. Jira/Zephyr Integration

- OAuth 2.0 authentication flow
- Fetch test cases from Jira using JQL queries
- Display test cases in a sidebar interface

### 2. LLM Integration

- Structured JSON tool-call protocol (safer than free-text prompts)
- Converts Zephyr test cases into Playwright automation steps
- Uses OpenAI API to generate MCP operation plans

### 3. Playwright Execution

- Executes MCP plans directly using Playwright
- Supports operations: `goto`, `click`, `fill`, `assert`, `screenshot`
- Generates execution reports

## Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key (see below)

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Configure OpenAI API Key

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Enter your API key in the app's settings when prompted
3. The API key will be securely stored locally

### 4. Configure Jira OAuth

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 (3LO) app
3. Add the redirect URI: `http://localhost:3999/callback`
4. Note your **Client ID** (you'll need this when running the app)

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:

- Start the Vite dev server for the React renderer (port 5173)
- Launch Electron with hot-reload

### Production Mode

```bash
npm start
```

## Usage

### 1. Authenticate with Jira

1. Enter your **OAuth Client ID** in the input field
2. (Optional) Enter your **OAuth Client Secret** if your OAuth app requires it (most Atlassian OAuth apps do)
3. Click **"Sign in with Jira (OAuth)"**
4. A browser window will open for authentication
5. After successful authentication, enter your **Jira Cloud Base API URL**:
   - Format: `https://api.atlassian.com/ex/jira/{cloudid}/rest/api/3`
   - You can find your cloud ID in the Atlassian Developer Console

### 2. Load Test Cases

1. Click **"Load Zephyr Tests"** to fetch test cases from Jira
2. Test cases will appear in the sidebar
3. Click on a test case to select it

### 3. Run Test with LLM + Playwright

1. Select a test case from the sidebar
2. Enter the **Site URL** you want to test
3. Click **"Run with OpenAI + Playwright"**
4. The app will:
   - Send the test case to OpenAI API
   - Parse the JSON MCP plan
   - Execute the plan using Playwright
   - Display the execution report

## MCP Protocol

The app uses a structured JSON protocol for MCP operations:

```json
{
  "mcpPlan": [
    {
      "op": "goto",
      "args": { "url": "https://example.com" }
    },
    {
      "op": "click",
      "args": { "selector": "button.submit" }
    },
    {
      "op": "fill",
      "args": { "selector": "input#email", "value": "test@example.com" }
    },
    {
      "op": "assert",
      "args": { "selector": ".success", "contains": "Success" }
    },
    {
      "op": "screenshot",
      "args": { "path": "screenshot.png" }
    }
  ]
}
```

### Supported Operations

- **goto**: Navigate to a URL
- **click**: Click an element by selector
- **fill**: Fill an input field
- **assert**: Assert text content contains a string
- **screenshot**: Take a screenshot

## Security Notes

### OAuth Configuration

- Register your app in Atlassian Developer Console
- Add `http://localhost:3999/callback` as a redirect URI
- For desktop apps, using a loopback redirect is the recommended approach for 3LO
- Atlassian enforces explicit redirect URIs

### LLM Integration

- This app uses the OpenAI API to generate test automation plans
- The app expects the LLM to return strictly valid JSON
- API keys are stored securely using Electron's user data directory

### Playwright Execution

- The runner launches a real browser (headless: false by default)
- On macOS, launching subprocesses and headful browsers may require user permissions
- Consider app signing and notarization for distribution

## Troubleshooting

### OpenAI API Errors

- Verify your API key is correct and has sufficient credits
- Check your internet connection
- Ensure the API key has access to the `gpt-4o` model

### OAuth Fails

- Verify the redirect URI matches exactly: `http://localhost:3999/callback`
- Check that port 3999 is not in use
- Ensure your OAuth app has the correct scopes: `read:jira-work`, `read:jira-user`

### Playwright Browser Launch Fails

- Run `npx playwright install` to ensure browsers are installed
- Check macOS permissions for subprocess execution

### JSON Parse Errors

- The LLM may not always return valid JSON
- Check the error message for the raw output
- Consider adding retry logic or validation steps

## Next Improvements

- [ ] Full MCP server integration: Run `@playwright/mcp` and connect LLM to it instead of internal JSON→Playwright executor
- [ ] Better token management: Store refresh tokens and refresh them automatically
- [ ] Attach test artifacts (screenshots, trace) back to Zephyr test executions via Zephyr API
- [ ] Pre-flight permissions and app notarization scripts for macOS
- [ ] Add retry logic for LLM JSON parsing
- [ ] Support for more MCP operations (wait, select, etc.)
- [ ] Test execution history and reporting
- [ ] Integration with Zephyr Scale API for test execution results

## License

MIT
