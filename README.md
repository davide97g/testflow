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

```bash
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_API_TOKEN=your_bitbucket_api_token
```

### Creating Atlassian API Tokens

To create the required API tokens, follow the guide in [docs/JIRA_API_TOKEN_GUIDE.md](docs/JIRA_API_TOKEN_GUIDE.md). This guide covers creating both Jira and Bitbucket API tokens from the Atlassian account management page.

**Important**: Never commit your `.env` file to version control. Make sure it's added to `.gitignore`.

## Usage

After installation, you can use the CLI:

```bash
# Initialize testflow configuration
testflow init

# Extract JIRA issue
bun run extract:jira

# Extract PR changes
bun run extract:pr
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
