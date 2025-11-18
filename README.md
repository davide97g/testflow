# testflow

To install dependencies:

```bash
bun install
```

## Environment Setup

Create a `.env` file in the root directory with the following environment variables:

```bash
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_API_TOKEN=your_bitbucket_api_token
```

### Creating Atlassian API Tokens

To create the required API tokens, follow the guide in [docs/JIRA_API_TOKEN_GUIDE.md](docs/JIRA_API_TOKEN_GUIDE.md). This guide covers creating both Jira and Bitbucket API tokens from the Atlassian account management page.

**Important**: Never commit your `.env` file to version control. Make sure it's added to `.gitignore`.

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
