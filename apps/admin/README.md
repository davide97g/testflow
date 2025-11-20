# Testflow Admin

Admin interface for managing Testflow configuration and viewing Jira issues and Zephyr test cases.

## Features

- **Configuration Management**: Upload and manage your testflow configuration file (config.json) with drag & drop support
- **Environment Variables**: Securely manage API tokens and credentials with a Vercel-style multi-row input
- **Jira Issues**: View Jira issues with linked Confluence pages and Bitbucket branches
- **Zephyr Test Cases**: View test cases from your Zephyr folder

## Getting Started

1. Install dependencies:
```bash
bun install
```

2. Run the development server:
```bash
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Configure**: Upload your `config.json` file from the testflow init process
2. **Set Environment Variables**: Add your API tokens (JIRA, Bitbucket, Confluence, Zephyr)
3. **View Data**: Navigate to Jira Issues or Zephyr Test Cases to view your data

## Environment Variables

The following environment variables can be configured:

- `JIRA_EMAIL` - Your Jira email
- `JIRA_API_TOKEN` - Your Jira API token
- `BITBUCKET_EMAIL` - Your Bitbucket email (optional)
- `BITBUCKET_API_TOKEN` - Your Bitbucket API token (optional)
- `CONFLUENCE_EMAIL` - Your Confluence email (optional)
- `CONFLUENCE_API_TOKEN` - Your Confluence API token (optional)
- `ZEPHYR_BASE_URL` - Your Zephyr base URL
- `ZEPHYR_ACCESS_TOKEN` - Your Zephyr access token
- `ZEPHYR_PROJECT_ID` - Your Zephyr project ID (optional)

## Storage

- **Configuration**: Stored in browser localStorage
- **Environment Variables**: Stored server-side in `.testflow/admin/` directory, keyed by session ID

## Security

- Environment variables are stored server-side only (not in browser storage)
- Session-based storage ensures each user has isolated data
- All API tokens are handled securely
