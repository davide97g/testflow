# testflow

Framework for testing and automation.

## Installation

### From GitHub Packages

```bash
# Configure npm to use GitHub Packages
echo "@davide97g:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc

# Install the package
bun add @davide97g/testflow
```

### From Source

```bash
# Clone the repository
git clone https://github.com/davide97g/testflow.git
cd testflow

# Install dependencies
bun install

# Build the project
bun run build
```

## Development

### Building

```bash
# Build the project
bun run build

# Build with type definitions
bun run build && bun run build:types
```

### Publishing

The package is configured to publish to GitHub Packages. To publish manually:

1. Ensure you're authenticated with GitHub Packages:

   ```bash
   echo "@davide97g:registry=https://npm.pkg.github.com" >> ~/.npmrc
   echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
   ```

2. Build the project:

   ```bash
   bun run build && bun run build:types
   ```

3. Publish:
   ```bash
   npm publish
   ```

The package will automatically build and publish when a new GitHub release is created (via GitHub Actions).

## Environment Setup

Create a `.env` file in the root directory with the following environment variables:

### Required

```bash
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
```

### Optional (for enhanced features)

```bash
# Bitbucket integration (optional)
BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_API_TOKEN=your_bitbucket_api_token

# Confluence integration (optional)
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your_confluence_api_token
```

**Note**: If Bitbucket or Confluence credentials are missing, those integrations will be automatically skipped. Only Jira credentials are required.

### Creating Atlassian API Tokens

To create the required API tokens, follow the guides:

- [JIRA API Token Guide](docs/JIRA_API_TOKEN_GUIDE.md)
- [Bitbucket API Token Guide](docs/BITBUCKET_API_TOKEN_GUIDE.md)

**Important**: Never commit your `.env` file to version control. Make sure it's added to `.gitignore`.

## Usage

After installation, you can use the CLI with two main commands:

### 1. Initialize Configuration

Run the initialization wizard to set up your testflow configuration:

```bash
testflow init
```

This interactive command will:

- Configure Bitbucket integration (optional)
- Configure Jira integration (required)
- Configure Confluence integration (optional)
- Create configuration files
- Set up AI editor rules (Cursor, GitHub Copilot, etc.)

### 2. Extract Issue Data

Extract Jira issue data, linked resources, and PR changes:

```bash
# Extract with interactive issue selection
testflow extract

# Extract a specific issue by key
testflow extract JI-123
```

This command will:

- Fetch Jira issue details
- Extract linked resources (other Jira issues and Confluence pages)
- Fetch Confluence page content (if configured)
- Search for associated Bitbucket branches and PRs (if configured)
- Download PR changes and patches (if PR is found)
- Save all data to `.testflow/output/{ISSUE-KEY}/`

### Output Structure

After extraction, you'll find:

```
.testflow/output/{ISSUE-KEY}/
├── jira-issue-description.txt    # Human-readable issue summary
├── pr.patch                       # PR code changes (if PR found)
├── raw/
│   ├── jira-issue.json           # Full Jira issue data
│   ├── linked-resources.json     # List of linked resources
│   ├── bitbucket-branch.json     # Branch info (if found)
│   └── bitbucket-pullrequests.json # PR data (if found)
└── confluence/                    # Confluence pages (if found)
    ├── page-{ID}.json
    └── page-{ID}.txt
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
