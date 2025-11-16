// renderer/src/example-mock.jsx
// Example component demonstrating how to use the mock Zephyr API

import React, { useState } from "react";

const ExampleMock = () => {
  const [projectKey, setProjectKey] = useState("");
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoadTests = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock authentication - no token or URL needed!
      // Use IPC to call the mock function through main process
      const res = await window.electronAPI.fetchZephyrTests({
        zephyrUrl: "mock://zephyr-api", // Ignored in mock mode
        token: "mock-token", // Ignored in mock mode
        projectKey: projectKey || undefined,
        limit: 100,
        startAt: 0,
        useMock: true, // Enable mock mode
      });

      if (res.ok) {
        setTests(res.tests);
        console.log(`Loaded ${res.tests.length} of ${res.total} test cases`);
      } else {
        setError(res.error || "Failed to load tests");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
      console.error("Error loading tests:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-80 p-3 border-r border-gray-300 overflow-y-auto bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Mock Zephyr Example</h3>
        <p className="text-xs text-gray-600 mb-4">
          This example uses mocked Zephyr API - no authentication required!
        </p>

        <div className="mb-4">
          <label
            htmlFor="project-key-filter"
            className="block text-sm font-medium mb-1"
          >
            Project Key Filter (optional):
          </label>
          <input
            id="project-key-filter"
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            placeholder="e.g., BAT"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
            tabIndex={0}
            aria-label="Project key filter"
          />
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={handleLoadTests}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            tabIndex={0}
            aria-label="Load mock Zephyr tests"
          >
            {loading ? "Loading..." : "Load Mock Tests"}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="mt-4">
          {tests.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-4">
              Click "Load Mock Tests" to see test cases
            </p>
          )}
          {tests.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className={`w-full text-left p-2 cursor-pointer rounded mb-2 ${
                selected?.id === t.id
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-white hover:bg-gray-100 border border-gray-200"
              }`}
              tabIndex={0}
              aria-label={`Select test case ${t.key}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <strong className="text-sm font-semibold text-gray-900">
                    {t.key}
                  </strong>
                  <div className="text-xs text-gray-600 mt-1">{t.summary}</div>
                  {t.status && (
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${t.status.color}20`,
                          color: t.status.color,
                        }}
                      >
                        {t.status.name}
                      </span>
                      {t.priority && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${t.priority.color}20`,
                            color: t.priority.color,
                          }}
                        >
                          {t.priority.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {selected
            ? `${selected.key} — ${selected.summary}`
            : "Select a test case"}
        </h2>

        {selected && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded p-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Test Case Details
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-600">ID:</dt>
                  <dd className="font-mono">{selected.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Key:</dt>
                  <dd className="font-mono">{selected.key}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Project Key:</dt>
                  <dd>{selected.projectKey}</dd>
                </div>
                {selected.estimatedTime && (
                  <div>
                    <dt className="text-gray-600">Estimated Time:</dt>
                    <dd>{Math.round(selected.estimatedTime / 1000)}s</dd>
                  </div>
                )}
                {selected.createdOn && (
                  <div>
                    <dt className="text-gray-600">Created On:</dt>
                    <dd>{new Date(selected.createdOn).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {selected.status && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                  Status & Priority
                </h3>
                <div className="flex gap-4">
                  <div>
                    <span className="text-xs text-gray-600">Status:</span>
                    <div
                      className="text-sm font-medium mt-1 px-2 py-1 rounded inline-block"
                      style={{
                        backgroundColor: `${selected.status.color}20`,
                        color: selected.status.color,
                      }}
                    >
                      {selected.status.name}
                    </div>
                  </div>
                  {selected.priority && (
                    <div>
                      <span className="text-xs text-gray-600">Priority:</span>
                      <div
                        className="text-sm font-medium mt-1 px-2 py-1 rounded inline-block"
                        style={{
                          backgroundColor: `${selected.priority.color}20`,
                          color: selected.priority.color,
                        }}
                      >
                        {selected.priority.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selected.labels && selected.labels.length > 0 && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                  Labels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.lastTestResultStatus && (
              <div className="bg-white border border-gray-200 rounded p-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                  Last Test Result
                </h3>
                <div
                  className="text-sm font-medium px-2 py-1 rounded inline-block"
                  style={{
                    backgroundColor: `${selected.lastTestResultStatus.color}20`,
                    color: selected.lastTestResultStatus.color,
                  }}
                >
                  {selected.lastTestResultStatus.name}
                </div>
              </div>
            )}

            {selected._original && (
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                  Raw Data (for debugging)
                </h3>
                <pre className="text-xs overflow-auto max-h-64 bg-white p-2 rounded border">
                  {JSON.stringify(selected._original, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExampleMock;

