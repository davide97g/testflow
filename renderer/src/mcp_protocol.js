export async function requestRun(testCase, siteUrl) {
  return window.electronAPI.runTestWithLLM({ testCase, siteUrl });
}

