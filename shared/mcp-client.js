// mcp-client.js
const axios = require('axios');

/**
 * Call OpenAI API and ask it to output a JSON object describing MCP steps.
 * Returns parsed JSON object produced by the model.
 */
async function askOpenAIForMCPPlan({ apiKey, testCase, siteUrl, credentials }) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Please authenticate first.');
  }

  // Structured prompt: ask OpenAI to return a `mcpPlan` JSON
  const credentialsNote = credentials && credentials.email 
    ? ' NOTE: The user will already be logged in automatically before executing this plan. Do NOT include login steps in the plan. Start with the test case steps after login.'
    : '';

  const prompt = `You are an automation engineer. Given the following Zephyr test case, output a single valid JSON object with a key "mcpPlan" whose value is an array of MCP operations. Each operation should be an object like {"op":"goto|click|fill|assert|screenshot", "args": {...} }. Use siteUrl=${siteUrl}.${credentialsNote} Test case:

KEY: ${testCase.key}
SUMMARY: ${testCase.summary}
DESCRIPTION: ${String(testCase.description).slice(0, 2000)}

Only output the JSON object and nothing else.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    
    // Extract JSON from output (assume the model prints one JSON blob)
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in OpenAI response');
    }
    
    const jsonText = content.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonText);
    
    return parsed;
  } catch (error) {
    if (error.response) {
      // API error response
      const errorMsg = error.response.data?.error?.message || error.response.statusText;
      throw new Error(`OpenAI API error: ${errorMsg} (Status: ${error.response.status})`);
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from OpenAI API. Please check your internet connection.');
    } else {
      // Error in parsing or other
      throw new Error(`Failed to parse OpenAI output as JSON: ${error.message}\n\nRaw output:\n${error.response?.data?.choices?.[0]?.message?.content || 'No output'}`);
    }
  }
}

module.exports = { askOpenAIForMCPPlan };

