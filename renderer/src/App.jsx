import React, { useEffect, useState } from "react";

const extractZephyrApiUrl = (inputUrl) => {
  if (!inputUrl) return "";

  try {
    const url = new URL(inputUrl);
    const hostname = url.hostname;

    // Check if it's an Atlassian domain (Jira Cloud with Zephyr Scale)
    if (hostname.includes(".atlassian.net")) {
      // Extract the base domain (e.g., luxotticaretail.atlassian.net)
      const baseUrl = `https://${hostname}`;
      // For Zephyr Scale, we can use either Jira REST API or Zephyr ATM API
      // Default to Jira REST API base, Zephyr endpoint will be constructed in zephyr.js
      return `${baseUrl}/rest/api/3`;
    }

    // Check if it's already a Zephyr Scale Cloud API URL
    if (hostname.includes("api.zephyrscale.smartbear.com")) {
      return inputUrl;
    }

    // If it already looks like an API URL, return as is
    if (inputUrl.includes("/rest/api/") || inputUrl.includes("/rest/atm/")) {
      return inputUrl;
    }

    return inputUrl;
  } catch {
    // If URL parsing fails, return the input as is
    return inputUrl;
  }
};

export default function App() {
  const [useMock, setUseMock] = useState(false);
  const [jiraUrl, setJiraUrl] = useState("");
  const [zephyrUrl, setZephyrUrl] = useState("");
  const [zephyrToken, setZephyrToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState("");
  const [siteUrl, setSiteUrl] = useState(
    "https://dev-gmnpms-bff.luxgroup.net/dashboard"
  );
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [openAiApiKeySaved, setOpenAiApiKeySaved] = useState(false);
  const [openAiApiKeyInput, setOpenAiApiKeyInput] = useState("");
  const [websiteEmail, setWebsiteEmail] = useState("");
  const [websitePassword, setWebsitePassword] = useState("");
  const [websiteCredentialsSaved, setWebsiteCredentialsSaved] = useState(false);
  const [websiteEmailInput, setWebsiteEmailInput] = useState("");
  const [websitePasswordInput, setWebsitePasswordInput] = useState("");

  // Load saved API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      const result = await window.electronAPI.getOpenAiApiKey();
      if (result.ok && result.apiKey) {
        setOpenAiApiKey(result.apiKey);
        setOpenAiApiKeySaved(true);
        // Show masked version in input
        setOpenAiApiKeyInput("•".repeat(20));
      }
    };
    loadApiKey();
  }, []);

  // Load saved website credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      const result = await window.electronAPI.getWebsiteCredentials();
      if (result.ok && result.credentials) {
        setWebsiteEmail(result.credentials.email);
        setWebsitePassword(result.credentials.password);
        setWebsiteCredentialsSaved(true);
        // Show masked version in inputs
        setWebsiteEmailInput(result.credentials.email);
        setWebsitePasswordInput("•".repeat(20));
      }
    };
    loadCredentials();
  }, []);

  const handleJiraUrlChange = (value) => {
    setJiraUrl(value);
    const apiUrl = extractZephyrApiUrl(value);
    setZephyrUrl(apiUrl);
  };

  const handleLoadTests = async () => {
    if (!useMock && (!zephyrUrl || !zephyrToken)) {
      alert("Please enter Zephyr URL and token first (or enable Mock Mode)");
      return;
    }

    const res = await window.electronAPI.fetchZephyrTests({
      zephyrUrl: useMock ? "mock://zephyr-api" : zephyrUrl,
      token: useMock ? "mock-token" : zephyrToken,
      projectKey: projectKey || undefined,
      useMock,
    });

    if (res.ok) {
      setTests(res.tests);
      if (res.total && res.total > res.tests.length) {
        console.log(`Loaded ${res.tests.length} of ${res.total} test cases`);
      }
    } else {
      const errorMsg = res.details
        ? `${res.error}\n\nDetails:\n${res.details}`
        : res.error;
      alert("Fetch fail: " + errorMsg);
      console.error("Zephyr API Error:", res);
    }
  };

  const handleSaveOpenAiApiKey = async () => {
    if (!openAiApiKeyInput || openAiApiKeyInput.trim() === "") {
      alert("Please enter an OpenAI API key");
      return;
    }

    const result = await window.electronAPI.saveOpenAiApiKey(
      openAiApiKeyInput.trim()
    );
    if (result.ok) {
      setOpenAiApiKey(openAiApiKeyInput.trim());
      setOpenAiApiKeySaved(true);
      setOpenAiApiKeyInput("•".repeat(20));
      alert("OpenAI API key saved successfully!");
    } else {
      alert("Failed to save API key: " + (result.error || "Unknown error"));
    }
  };

  const handleClearOpenAiApiKey = async () => {
    if (confirm("Are you sure you want to clear the saved OpenAI API key?")) {
      const result = await window.electronAPI.clearOpenAiApiKey();
      if (result.ok) {
        setOpenAiApiKey("");
        setOpenAiApiKeySaved(false);
        setOpenAiApiKeyInput("");
        alert("OpenAI API key cleared");
      } else {
        alert("Failed to clear API key: " + (result.error || "Unknown error"));
      }
    }
  };

  const handleSaveWebsiteCredentials = async () => {
    if (!websiteEmailInput || websiteEmailInput.trim() === "") {
      alert("Please enter an email address");
      return;
    }
    if (
      !websitePasswordInput ||
      websitePasswordInput.trim() === "" ||
      websitePasswordInput.startsWith("•")
    ) {
      alert("Please enter a password");
      return;
    }

    const result = await window.electronAPI.saveWebsiteCredentials({
      email: websiteEmailInput.trim(),
      password: websitePasswordInput.trim(),
    });
    if (result.ok) {
      setWebsiteEmail(websiteEmailInput.trim());
      setWebsitePassword(websitePasswordInput.trim());
      setWebsiteCredentialsSaved(true);
      setWebsitePasswordInput("•".repeat(20));
      alert("Website credentials saved successfully!");
    } else {
      alert("Failed to save credentials: " + (result.error || "Unknown error"));
    }
  };

  const handleClearWebsiteCredentials = async () => {
    if (
      confirm("Are you sure you want to clear the saved website credentials?")
    ) {
      const result = await window.electronAPI.clearWebsiteCredentials();
      if (result.ok) {
        setWebsiteEmail("");
        setWebsitePassword("");
        setWebsiteCredentialsSaved(false);
        setWebsiteEmailInput("");
        setWebsitePasswordInput("");
        alert("Website credentials cleared");
      } else {
        alert(
          "Failed to clear credentials: " + (result.error || "Unknown error")
        );
      }
    }
  };

  const handleRun = async () => {
    if (!selected) {
      alert("Select a test first");
      return;
    }

    // Use saved key if available, otherwise use the input (if it's not the masked placeholder)
    const apiKeyToUse =
      openAiApiKey ||
      (openAiApiKeyInput && !openAiApiKeyInput.startsWith("•")
        ? openAiApiKeyInput.trim()
        : null);

    if (!apiKeyToUse) {
      alert(
        "Please authenticate with OpenAI API first. Enter your API key and click 'Save OpenAI API Key'"
      );
      return;
    }

    // Check for website credentials
    const credentialsToUse =
      websiteEmail && websitePassword
        ? { email: websiteEmail, password: websitePassword }
        : websiteEmailInput &&
          websitePasswordInput &&
          !websitePasswordInput.startsWith("•")
        ? {
            email: websiteEmailInput.trim(),
            password: websitePasswordInput.trim(),
          }
        : null;

    if (!credentialsToUse) {
      alert(
        "Please enter website credentials (email and password) first. Click 'Save Credentials' to save them."
      );
      return;
    }

    setLog("Running...");
    const res = await window.electronAPI.runTestWithLLM({
      testCase: selected,
      apiKey: apiKeyToUse,
      siteUrl,
      credentials: credentialsToUse,
    });
    setLog(JSON.stringify(res, null, 2));
  };

  return (
    <div className="flex h-screen">
      <aside className="w-80 p-3 border-r border-gray-300 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          OpenAI API Authentication
        </h3>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <label
            htmlFor="openai-api-key"
            className="block text-sm font-medium mb-1"
          >
            OpenAI API Key:
          </label>
          <input
            id="openai-api-key"
            type="password"
            value={openAiApiKeyInput}
            onChange={(e) => {
              setOpenAiApiKeyInput(e.target.value);
              if (openAiApiKeySaved && e.target.value !== "•".repeat(20)) {
                setOpenAiApiKeySaved(false);
              }
            }}
            placeholder="sk-..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            tabIndex={0}
            aria-label="OpenAI API key"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveOpenAiApiKey}
              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              tabIndex={0}
              aria-label="Save OpenAI API key"
            >
              {openAiApiKeySaved ? "Update Key" : "Save Key"}
            </button>
            {openAiApiKeySaved && (
              <button
                type="button"
                onClick={handleClearOpenAiApiKey}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                tabIndex={0}
                aria-label="Clear OpenAI API key"
              >
                Clear
              </button>
            )}
          </div>
          {openAiApiKeySaved && (
            <p className="text-xs text-green-600 mt-2">
              ✓ API key saved and ready to use
            </p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-4 mt-6">Website Credentials</h3>

        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <label
            htmlFor="website-email"
            className="block text-sm font-medium mb-1"
          >
            Email:
          </label>
          <input
            id="website-email"
            type="email"
            value={websiteEmailInput}
            onChange={(e) => {
              setWebsiteEmailInput(e.target.value);
              if (websiteCredentialsSaved) {
                setWebsiteCredentialsSaved(false);
              }
            }}
            placeholder="user@example.com"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            tabIndex={0}
            aria-label="Website email"
          />
          <label
            htmlFor="website-password"
            className="block text-sm font-medium mb-1"
          >
            Password:
          </label>
          <input
            id="website-password"
            type="password"
            value={websitePasswordInput}
            onChange={(e) => {
              setWebsitePasswordInput(e.target.value);
              if (
                websiteCredentialsSaved &&
                e.target.value !== "•".repeat(20)
              ) {
                setWebsiteCredentialsSaved(false);
              }
            }}
            placeholder="Enter password"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            tabIndex={0}
            aria-label="Website password"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveWebsiteCredentials}
              className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              tabIndex={0}
              aria-label="Save website credentials"
            >
              {websiteCredentialsSaved
                ? "Update Credentials"
                : "Save Credentials"}
            </button>
            {websiteCredentialsSaved && (
              <button
                type="button"
                onClick={handleClearWebsiteCredentials}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                tabIndex={0}
                aria-label="Clear website credentials"
              >
                Clear
              </button>
            )}
          </div>
          {websiteCredentialsSaved && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Credentials saved and ready to use
            </p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            These credentials will be used to login before running test cases
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-4 mt-6">Jira / Zephyr</h3>

        <div className="mb-4">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              className="w-4 h-4"
              tabIndex={0}
              aria-label="Use mock mode"
            />
            <span className="text-sm font-medium">
              Use Mock Mode (no auth required)
            </span>
          </label>
          {useMock && (
            <p className="text-xs text-green-600 mb-2 bg-green-50 p-2 rounded">
              ✓ Mock mode enabled - authentication bypassed
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="jira-url" className="block text-sm font-medium mb-1">
            Jira URL (or API URL):
          </label>
          <input
            id="jira-url"
            type="text"
            value={jiraUrl}
            onChange={(e) => handleJiraUrlChange(e.target.value)}
            placeholder="https://your-instance.atlassian.net/..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            tabIndex={0}
            aria-label="Jira URL or API URL"
          />
          <label
            htmlFor="zephyr-url"
            className="block text-sm font-medium mb-1"
          >
            Zephyr API URL (auto-detected):
          </label>
          <input
            id="zephyr-url"
            type="text"
            value={zephyrUrl}
            onChange={(e) => setZephyrUrl(e.target.value)}
            placeholder="https://your-instance.atlassian.net/rest/api/3"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2 bg-gray-50"
            disabled={useMock}
            tabIndex={0}
            aria-label="Zephyr API URL"
          />
          <label
            htmlFor="zephyr-token"
            className="block text-sm font-medium mb-1"
          >
            Zephyr Token:
          </label>
          <input
            id="zephyr-token"
            type="password"
            value={zephyrToken}
            onChange={(e) => setZephyrToken(e.target.value)}
            placeholder="Enter your Zephyr API token"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            disabled={useMock}
            tabIndex={0}
            aria-label="Zephyr API token"
          />
          <label
            htmlFor="project-key"
            className="block text-sm font-medium mb-1"
          >
            Project Key (optional):
          </label>
          <input
            id="project-key"
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            placeholder="e.g., BAT"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            tabIndex={0}
            aria-label="Project key"
          />
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={handleLoadTests}
            disabled={!useMock && (!zephyrUrl || !zephyrToken)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            tabIndex={0}
            aria-label="Load Zephyr tests"
          >
            {useMock ? "Load Mock Tests" : "Load Zephyr Tests"}
          </button>
        </div>

        <div className="mt-4">
          {tests.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className={`w-full text-left p-2 cursor-pointer rounded mb-2 ${
                selected?.id === t.id
                  ? "bg-blue-100"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <strong className="text-sm">{t.key}</strong>
              <div className="text-xs text-gray-600 mt-1">{t.summary}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {selected ? `${selected.key} — ${selected.summary}` : "Select a test"}
        </h2>

        {selected && (
          <div className="mb-4">
            <label
              htmlFor="site-url"
              className="block text-sm font-medium mb-1"
            >
              Site URL to test:
            </label>
            <input
              id="site-url"
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            />
            <button
              type="button"
              onClick={handleRun}
              disabled={!selected}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Run with OpenAI + Playwright
            </button>
          </div>
        )}

        <pre className="mt-4 bg-gray-900 text-gray-100 p-3 rounded h-96 overflow-auto text-xs">
          {log || "No logs yet..."}
        </pre>
      </main>
    </div>
  );
}
