# Bitbucket API Token Setup Guide

This guide explains how to create and use Bitbucket API tokens and access tokens for authenticating with the Bitbucket Cloud REST API v2.0.

## Prerequisites

- An Atlassian account with access to Bitbucket Cloud
- Permissions to create API tokens for your account
- For access tokens: Admin permissions on the repository, project, or workspace

## Token Types

Bitbucket Cloud supports two main types of tokens:

1. **API Tokens** (Personal Access Tokens) - Personal access tokens tied to your account
2. **Access Tokens** - Tokens scoped to a repository, project, or workspace

### API Tokens vs Access Tokens

| Feature | API Tokens | Access Tokens |
|---------|-----------|---------------|
| **Scope** | Your entire account | Single repository/project/workspace |
| **Authentication** | Basic Auth (email:token) | Bearer token |
| **Best for** | Personal scripts, development | CI/CD, specific projects |
| **Expiration** | Up to 1 year | No expiration (managed separately) |

## Creating an API Token (Recommended for This Project)

API tokens are personal access tokens that authenticate with Bitbucket using your Atlassian account email and the token.

### Step 1: Navigate to API Tokens Page

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Or navigate from Bitbucket: **Bitbucket** → **Personal settings** → **Access management** → **API tokens**
2. Sign in with your Atlassian account credentials

### Step 2: Create a New API Token

1. Click on the **"Create API token"** button
2. In the dialog that appears:
   - **Label**: Enter a descriptive name for your token (e.g., "Test Automation Tool", "AI Test Validation")
   - **Expiration**: Set an expiration date (required, maximum 1 year)
   - **Permissions**: Select the scopes/permissions you need:
     - `Repository: Read` - View repositories
     - `Repository: Write` - Push code to repositories
     - `Pull request: Read` - View pull requests
     - `Pull request: Write` - Create and modify pull requests
3. Click **"Create"**

### Step 3: Copy and Store Your Token

1. **Important**: Copy the token immediately using the **"Copy to clipboard"** button
2. Store the token securely in a password manager or secure location
   - **Warning**: You won't be able to view this token again after closing the dialog
   - If you lose the token, you'll need to create a new one

### Step 4: Revoke or Manage Tokens (Optional)

- You can view, rename, or revoke API tokens at any time from the [API tokens page](https://id.atlassian.com/manage-profile/security/api-tokens)
- If a token is compromised, revoke it immediately and create a new one

## Creating Access Tokens (Alternative)

Access tokens are scoped to a specific repository, project, or workspace and use Bearer authentication.

### Repository Access Token

1. Navigate to your repository on Bitbucket
2. Go to **Repository settings** → **Access tokens**
3. Click **"Create repository token"**
4. Configure:
   - **Name**: Descriptive name for the token
   - **Scopes**: Select required permissions (repository, pullrequest, etc.)
5. Click **"Create"** and copy the token immediately

### Project Access Token

1. Navigate to your project on Bitbucket
2. Go to **Project settings** → **Access tokens**
3. Click **"Create project token"**
4. Configure name and scopes
5. Click **"Create"** and copy the token immediately

### Workspace Access Token

1. Navigate to your workspace on Bitbucket
2. Go to **Workspace settings** → **Access tokens**
3. Click **"Create workspace token"**
4. Configure name and scopes
5. Click **"Create"** and copy the token immediately

## Using Tokens with This Project

### Configuration with API Token (Basic Auth)

The Bitbucket client in this project supports multiple authentication methods. For API tokens, use Basic Authentication:

```typescript
import { initialize } from './integrations/bitbucket-client';

const bitbucketClient = initialize({
  baseUrl: 'https://api.bitbucket.org/2.0', // Optional, defaults to this
  email: 'your-email@example.com',          // Optional if token is in email:token format
  apiToken: 'YOUR_API_TOKEN_HERE'
});
```

**Note**: If your `apiToken` is in the format `email:token`, you don't need to provide the `email` field separately.

### Configuration with Access Token (Bearer Auth)

For access tokens (repository/project/workspace), the client automatically detects and uses Bearer authentication:

```typescript
import { initialize } from './integrations/bitbucket-client';

const bitbucketClient = initialize({
  apiToken: 'YOUR_ACCESS_TOKEN_HERE' // Access token (not in email:token format)
});
```

### Environment Variables

Store your credentials securely using environment variables:

```bash
# .env file
BITBUCKET_BASE_URL=https://api.bitbucket.org/2.0
BITBUCKET_EMAIL=your-email@example.com  # Optional for API tokens
BITBUCKET_API_TOKEN=your_api_token_here

# Or for access tokens (no email needed):
BITBUCKET_API_TOKEN=your_access_token_here
```

### Authentication Methods

The client automatically determines the authentication method:

1. **API Token with email:token format**: Uses Basic Auth
   ```typescript
   apiToken: 'email@example.com:token123'
   ```

2. **API Token with separate email**: Uses Basic Auth
   ```typescript
   email: 'email@example.com',
   apiToken: 'token123'
   ```

3. **Access Token**: Uses Bearer Auth
   ```typescript
   apiToken: 'your-access-token' // No email, no colon
   ```

## Example Usage

```typescript
import { initialize } from './integrations/bitbucket-client';

// Initialize the client
const client = initialize({
  baseUrl: process.env.BITBUCKET_BASE_URL || 'https://api.bitbucket.org/2.0',
  email: process.env.BITBUCKET_EMAIL,        // Optional
  apiToken: process.env.BITBUCKET_API_TOKEN!
});

// Get a pull request
const pr = await client.getPullRequest('workspace', 'repo-slug', '123');
console.log('PR Title:', pr.title);

// Get PR diff
const diff = await client.getPRDiff('workspace', 'repo-slug', '123');
console.log('Diff:', diff);

// Extract Jira tickets from PR
const tickets = client.extractJiraTickets(pr);
console.log('Jira tickets:', tickets);

// Get changed files
const files = await client.getChangedFiles('workspace', 'repo-slug', '123');
console.log('Changed files:', files);

// Get source branch
const branch = client.getSourceBranch(pr);
console.log('Source branch:', branch);
```

## Security Best Practices

1. **Never commit tokens to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables or secret management tools

2. **Use descriptive labels**
   - Name your tokens clearly (e.g., "Production API", "Development Testing")
   - Makes it easier to manage and revoke specific tokens

3. **Set appropriate expiration dates**
   - Rotate API tokens regularly (max 1 year)
   - Use shorter expiration for temporary scripts

4. **Limit token scope**
   - Grant only the minimum permissions needed
   - Use repository/project/workspace tokens for scoped access
   - Revoke tokens when no longer needed

5. **Monitor token usage**
   - Review active tokens periodically
   - Revoke unused or suspicious tokens

6. **Choose the right token type**
   - Use API tokens for personal development scripts
   - Use access tokens for CI/CD pipelines and production automation

## Troubleshooting

### Authentication Errors

If you receive `401 Unauthorized` errors:

1. **Verify your email address** matches your Atlassian account (for API tokens)
2. **Check your API token** is correct and hasn't expired
3. **Ensure your account** has the necessary Bitbucket permissions
4. **Verify the token type** matches the authentication method:
   - API tokens → Basic Auth (email:token)
   - Access tokens → Bearer Auth (token only)

### Token Not Working

- **Token expired**: Create a new token with a longer expiration (API tokens)
- **Token revoked**: Check if the token was accidentally revoked and create a new one
- **Wrong credentials**: Double-check email and token are correct (for API tokens)
- **Insufficient permissions**: Verify the token has the required scopes/permissions

### Common Issues

**"Invalid credentials" error:**
- For API tokens: Ensure you're using `email:token` format or providing both email and token separately
- For access tokens: Ensure you're not providing an email field

**"Forbidden" error:**
- Check token permissions match the operations you're trying to perform
- Verify you have access to the workspace/repository/project

## API Token Scopes/Permissions

When creating an API token, select appropriate scopes:

- **Repository: Read** - View repositories and pull requests
- **Repository: Write** - Push code, create branches
- **Pull request: Read** - View pull requests and comments
- **Pull request: Write** - Create, update, approve, merge pull requests
- **Webhook** - Manage webhooks
- **Pipeline** - View and manage pipelines

Select only the permissions you need for your use case.

## Additional Resources

- [Bitbucket Cloud API Token Documentation](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/)
- [Bitbucket Cloud Access Tokens Documentation](https://support.atlassian.com/bitbucket-cloud/docs/using-access-tokens/)
- [Bitbucket Cloud REST API Documentation](https://developer.atlassian.com/cloud/bitbucket/rest/intro/)
- [Bitbucket Authentication Methods](https://developer.atlassian.com/cloud/bitbucket/rest/intro/#authentication)

## Quick Reference

### API Token (Basic Auth)
```bash
curl --request GET \
  --url 'https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}' \
  --user '{email}:{api_token}' \
  --header 'Accept: application/json'
```

### Access Token (Bearer Auth)
```bash
curl --request GET \
  --url 'https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}' \
  --header 'Authorization: Bearer {access_token}' \
  --header 'Accept: application/json'
```

---

**Note**: 
- API tokens provide access to all Bitbucket operations your account has permissions for. Handle them with the same security as your account password.
- Access tokens are scoped to their specific resource (repository/project/workspace) and are safer for automation.
