// renderer/src/zephyr.js
const axios = require("axios");

async function fetchZephyrTests({
  zephyrUrl,
  token,
  projectKey,
  limit = 100,
  startAt = 0,
}) {
  try {
    let apiUrl;

    // Determine if this is a Zephyr Scale Cloud API URL or Jira-integrated Zephyr
    if (zephyrUrl.includes("api.zephyrscale.smartbear.com")) {
      // Direct Zephyr Scale Cloud API
      const baseUrl = zephyrUrl.endsWith("/")
        ? zephyrUrl.slice(0, -1)
        : zephyrUrl;
      apiUrl = `${baseUrl}/testcases`;
    } else if (zephyrUrl.includes(".atlassian.net")) {
      // Jira Cloud with Zephyr Scale integration
      // Zephyr Scale API is typically at /rest/atm/1.0/testcase
      const baseUrl = zephyrUrl
        .replace("/rest/api/3", "")
        .replace("/rest/api/2", "");
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      apiUrl = `${cleanBase}/rest/atm/1.0/testcase`;
    } else {
      // Assume it's already a full Zephyr API URL
      const baseUrl = zephyrUrl.endsWith("/")
        ? zephyrUrl.slice(0, -1)
        : zephyrUrl;
      apiUrl = baseUrl.includes("/testcases")
        ? baseUrl
        : `${baseUrl}/testcases`;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (projectKey) {
      params.append("projectKey", projectKey);
    }
    params.append("limit", limit.toString());
    params.append("startAt", startAt.toString());

    const url = `${apiUrl}?${params.toString()}`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `JWT ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Zephyr Scale API returns data in different formats depending on endpoint
    // Handle both direct testcases response and paginated response
    let testCases = [];

    if (res.data && Array.isArray(res.data)) {
      // Direct array response
      testCases = res.data;
    } else if (res.data?.values) {
      // Paginated response with values array
      testCases = res.data.values;
    } else if (res.data?.data) {
      // Nested data response
      testCases = Array.isArray(res.data.data) ? res.data.data : [];
    } else if (res.data?.body) {
      // Response with body wrapper
      testCases = Array.isArray(res.data.body) ? res.data.body : [];
    }

    // Map Zephyr Scale test case format to our internal format
    const tests = testCases.map((tc) => ({
      id: tc.id || tc.key || tc.testCaseKey,
      key: tc.key || tc.testCaseKey || tc.id,
      summary: tc.name || tc.summary || tc.title || "",
      description: tc.objective || tc.description || "",
      projectKey: tc.projectKey || projectKey,
      // Include additional Zephyr-specific fields
      status: tc.status,
      priority: tc.priority,
      folder: tc.folder,
      labels: tc.labels || [],
    }));

    return { ok: true, tests, total: res.data?.total || tests.length };
  } catch (err) {
    // Provide more detailed error information
    const errorMessage =
      err.response?.data?.message || err.response?.data?.error || err.message;
    const errorDetails = err.response?.data
      ? JSON.stringify(err.response.data, null, 2)
      : "";

    return {
      ok: false,
      error: errorMessage,
      details: errorDetails,
      status: err.response?.status,
    };
  }
}

module.exports = { fetchZephyrTests };
