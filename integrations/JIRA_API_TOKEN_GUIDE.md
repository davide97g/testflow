# Jira API Token Setup Guide

This guide explains how to create and use a Jira API token for authenticating with the Jira REST API v3.

## Prerequisites

- An Atlassian account with access to Jira Cloud
- Permissions to create API tokens for your account

## Creating a Jira API Token

### Step 1: Navigate to API Tokens Page

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Sign in with your Atlassian account credentials

### Step 2: Create a New API Token

1. Click on the **"Create API token"** button
2. In the dialog that appears:
   - **Label**: Enter a descriptive name for your token (e.g., "Test Automation Tool", "AI Test Validation")
   - **Expiration**: Set an expiration date (1-365 days) or leave it for the maximum duration
3. Click **"Create"**

### Step 3: Copy and Store Your Token

1. **Important**: Copy the token immediately using the **"Copy to clipboard"** button
2. Store the token securely in a password manager or secure location
   - **Warning**: You won't be able to view this token again after closing the dialog
   - If you lose the token, you'll need to create a new one

### Step 4: Revoke or Manage Tokens (Optional)

- You can view, rename, or revoke API tokens at any time from the [API tokens page](https://id.atlassian.com/manage-profile/security/api-tokens)
- If a token is compromised, revoke it immediately and create a new one

## Using the API Token with This Project

### Configuration

The Jira client in this project uses Basic Authentication with your email and API token. Configure it as follows:

```typescript
import { initialize } from './integrations/jira-client';

const jiraClient = initialize({
  baseUrl: 'https://your-domain.atlassian.net',
  email: 'your-email@example.com',  // Optional but recommended
  apiToken: 'YOUR_API_TOKEN_HERE'
});
```

### Environment Variables

Store your credentials securely using environment variables:

```bash
# .env file
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token_here
```

### Authentication Method

The client uses **Basic Authentication** which:
- Encodes your credentials as: `email:apiToken` (Base64 encoded)
- Sends the authorization header: `Authorization: Basic <base64-encoded-credentials>`
- Works with all Jira Cloud REST API v3 endpoints

## Security Best Practices

1. **Never commit tokens to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables or secret management tools

2. **Use descriptive labels**
   - Name your tokens clearly (e.g., "Production API", "Development Testing")
   - Makes it easier to manage and revoke specific tokens

3. **Set appropriate expiration dates**
   - Rotate tokens regularly
   - Use shorter expiration for temporary scripts

4. **Limit token scope**
   - Use tokens only for the necessary operations
   - Revoke tokens when no longer needed

5. **Monitor token usage**
   - Review active tokens periodically
   - Revoke unused or suspicious tokens

## Troubleshooting

### Authentication Errors

If you receive `401 Unauthorized` errors:

1. **Verify your email address** matches your Atlassian account
2. **Check your API token** is correct and hasn't expired
3. **Ensure your account** has the necessary Jira permissions
4. **Verify the base URL** matches your Jira instance (e.g., `https://your-domain.atlassian.net`)

### Token Not Working

- **Token expired**: Create a new token with a longer expiration
- **Token revoked**: Check if the token was accidentally revoked and create a new one
- **Wrong credentials**: Double-check email and token are correct

## Additional Resources

- [Atlassian API Token Documentation](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Jira REST API v3 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Basic Authentication Guide](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)

## Example Usage

```typescript
import { initialize } from './integrations/jira-client';

// Initialize the client
const client = initialize({
  baseUrl: process.env.JIRA_BASE_URL!,
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN!
});

// Get a ticket
const ticket = await client.getTicket('PROJ-123');
console.log('Ticket:', ticket.fields.summary);

// Get linked test cases
const testCases = await client.getLinkedTestCases('PROJ-123');
console.log('Linked test cases:', testCases);

// Post test results
const results = await client.postTestResults('PROJ-123', {
  status: 'passed',
  tests: 10,
  passed: 10,
  failed: 0
});

// Update ticket with summary
await client.updateTicket('PROJ-123', 'All tests passed successfully');
```

---

**Note**: This token provides access to all Jira operations your account has permissions for. Handle it with the same security as your account password.

