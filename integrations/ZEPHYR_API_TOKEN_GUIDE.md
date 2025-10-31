# Zephyr Scale API Token Setup Guide

This guide explains how to create and use a Zephyr Scale API token for authenticating with the Zephyr Scale Cloud API.

## Prerequisites

- A Zephyr Scale Cloud account with access to a Jira instance
- Permissions to access Zephyr Scale settings
- Access to Jira where Zephyr Scale is installed

## Creating a Zephyr Scale API Token

### Step 1: Navigate to Zephyr API Keys

1. Log in to your Jira instance where Zephyr Scale is installed
2. Click on your **profile picture** at the **bottom left** of the page
3. Choose the option **"Zephyr API keys"** from the menu

For more detailed information, refer to the [Zephyr API Access Tokens Management documentation](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html).

### Step 2: Generate a New API Key

1. In the Zephyr API keys section, click on **"Generate a Key"** or similar option
2. The system will generate a new API access token (JWT - JSON Web Token)
3. **Important**: Copy the token immediately as it will only be shown once

### Step 3: Copy and Store Your Token

1. **Critical**: Copy the token immediately using the **"Copy"** button
2. Store the token securely in a password manager or secure location
   - **Warning**: You won't be able to view this token again after the dialog closes
   - If you lose the token, you'll need to generate a new one

### Step 4: Manage or Revoke Tokens (Optional)

- You can view or revoke API tokens from the Zephyr API keys management page
- If a token is compromised, revoke it immediately and generate a new one

## Using the API Token with This Project

### Configuration

The Zephyr client in this project uses Bearer Token authentication with your API token. Configure it as follows:

```typescript
import { initialize } from './integrations/zephyr-client';

const zephyrClient = initialize({
  baseUrl: 'https://api.zephyrscale.smartbear.com/v2', // or https://eu.api.zephyrscale.smartbear.com/v2 for EU
  apiToken: 'YOUR_API_TOKEN_HERE'
});
```

### Environment Variables

Store your credentials securely using environment variables:

```bash
# .env file
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2
# or for EU region:
# ZEPHYR_BASE_URL=https://eu.api.zephyrscale.smartbear.com/v2
ZEPHYR_API_TOKEN=your_api_token_here
```

### Authentication Method

The client uses **Bearer Token Authentication** which:
- Sends the authorization header: `Authorization: Bearer <your-api-token>`
- Works with all Zephyr Scale Cloud API v2 endpoints

### API Base URLs

- **US/Global**: `https://api.zephyrscale.smartbear.com/v2`
- **EU Region**: `https://eu.api.zephyrscale.smartbear.com/v2`

The client defaults to the US/Global base URL if not specified.

## Security Best Practices

1. **Never commit tokens to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables or secret management tools

2. **Store tokens securely**
   - Use environment variables in production
   - Consider using secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)

3. **Rotate tokens regularly**
   - Generate new tokens periodically for security
   - Revoke old tokens when creating new ones

4. **Limit token scope**
   - Use tokens only for the necessary operations
   - Revoke tokens when no longer needed

5. **Monitor token usage**
   - Review active tokens periodically
   - Revoke unused or suspicious tokens

## Troubleshooting

### Authentication Errors

If you receive `401 Unauthorized` errors:

1. **Verify your API token** is correct and hasn't been revoked
2. **Check the base URL** matches your Zephyr Scale instance region
   - US/Global: `https://api.zephyrscale.smartbear.com/v2`
   - EU: `https://eu.api.zephyrscale.smartbear.com/v2`
3. **Ensure your account** has the necessary Zephyr Scale permissions
4. **Verify the token format** - it should be a JWT token

### Token Not Working

- **Token revoked**: Check if the token was accidentally revoked and generate a new one
- **Wrong region**: Ensure you're using the correct base URL for your Zephyr Scale instance
- **Expired token**: Zephyr API tokens may have expiration dates - check and generate a new one if needed

### API Endpoint Issues

- **404 Not Found**: Verify you're using the correct API version (v2)
- **403 Forbidden**: Ensure your account has the necessary permissions in Zephyr Scale

## Additional Resources

- [Zephyr Scale Cloud API Documentation](https://support.smartbear.com/zephyr-scale-cloud/api-docs)
- [Zephyr API Access Tokens Management](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html)
- [Making Authenticated Requests](https://support.smartbear.com/zephyr-scale-cloud/api-docs#section/Authentication/Making-Authenticated-Requests)

## Example Usage

```typescript
import { initialize } from './integrations/zephyr-client';

// Initialize the client
const client = initialize({
  baseUrl: process.env.ZEPHYR_BASE_URL || 'https://api.zephyrscale.smartbear.com/v2',
  apiToken: process.env.ZEPHYR_API_TOKEN!
});

// Get a test case
const testCase = await client.getTestCase('PROJ-T123');
console.log('Test case:', testCase.name);

// Get test steps
const testSteps = await client.getTestSteps('PROJ-T123');
console.log('Test steps:', testSteps);

// Create test execution
const execution = await client.createTestExecution('PROJ-T123', {
  projectKey: 'PROJ',
  testCaseKey: 'PROJ-T123',
  testCycleKey: 'PROJ-R456',
  statusName: 'Pass',
  testScriptResults: []
});
console.log('Execution created:', execution.key);
```

---

**Note**: This token provides access to all Zephyr Scale operations your account has permissions for. Handle it with the same security as your account password.

