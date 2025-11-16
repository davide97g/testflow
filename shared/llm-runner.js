// llm-runner.js
const { chromium } = require("playwright");
const { askOpenAIForMCPPlan } = require("./mcp-client");
const axios = require("axios");

/**
 * Analyze page structure with OpenAI to find login form selectors
 */
async function findLoginSelectorsWithOpenAI({ apiKey, pageHtml }) {
  const prompt = `You are analyzing an HTML page to find login form elements. Given the HTML structure below, identify the CSS selectors for:
1. Email/username input field
2. Password input field  
3. Submit/login button

Return a JSON object with exactly these keys:
- "emailSelector": CSS selector for email/username input (use the most specific selector possible, prefer id or name attributes)
- "passwordSelector": CSS selector for password input (use the most specific selector possible, prefer id or name attributes)
- "submitSelector": CSS selector for submit/login button (use the most specific selector possible)

If you cannot find any of these elements, set that key to null.

HTML Structure:
${pageHtml}

Only return the JSON object, nothing else.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
      }
    );

    const content = response.data.choices[0].message.content;

    // Extract JSON from output
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in OpenAI response");
    }

    const jsonText = content.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonText);

    return parsed;
  } catch (error) {
    if (error.response) {
      const errorMsg =
        error.response.data?.error?.message || error.response.statusText;
      throw new Error(
        `OpenAI API error: ${errorMsg} (Status: ${error.response.status})`
      );
    } else if (error.request) {
      throw new Error(
        "No response from OpenAI API. Please check your internet connection."
      );
    } else {
      throw new Error(`Failed to parse OpenAI output: ${error.message}`);
    }
  }
}

/**
 * Get Playwright's recommended selector for an element
 */
async function getPlaywrightSelector(page, element) {
  try {
    // Use Playwright's built-in selector suggestions
    const selector = await page.evaluate((el) => {
      // Try to get a unique selector using Playwright's approach
      const getSelector = (element) => {
        if (element.id) {
          return `#${element.id}`;
        }
        if (element.name) {
          return `[name="${element.name}"]`;
        }
        // Try to build a path-based selector
        const path = [];
        let current = element;
        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break;
          }
          if (current.className) {
            const classes = Array.from(current.classList)
              .filter((c) => !c.startsWith("ng-") && !c.startsWith("react-"))
              .join(".");
            if (classes) {
              selector += `.${classes}`;
            }
          }
          const siblings = Array.from(current.parentElement?.children || []);
          const index = siblings.indexOf(current);
          if (siblings.length > 1) {
            selector += `:nth-of-type(${index + 1})`;
          }
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(" > ");
      };
      return getSelector(el);
    }, element);
    return selector;
  } catch (error) {
    return null;
  }
}

/**
 * Use Playwright's inspector to analyze page and get better selectors
 */
async function analyzePageWithPlaywright(page) {
  // Get all interactive elements with Playwright's context
  const elements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input, button, select, textarea, a"));
    return inputs.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        id: el.id || null,
        name: el.name || null,
        placeholder: el.placeholder || null,
        className: el.className || null,
        text: el.textContent?.trim().substring(0, 50) || null,
        visible: rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== "hidden",
        role: el.getAttribute("role") || null,
        ariaLabel: el.getAttribute("aria-label") || null,
        dataTestId: el.getAttribute("data-testid") || null,
        dataTest: el.getAttribute("data-test") || null,
      };
    }).filter((el) => el.visible);
  });

  // Use Playwright's locator API to verify elements exist and get better selectors
  const verifiedElements = [];
  for (const elementInfo of elements) {
    let selector = null;
    
    // Prefer data-testid or data-test attributes (common in modern apps)
    if (elementInfo.dataTestId) {
      selector = `[data-testid="${elementInfo.dataTestId}"]`;
    } else if (elementInfo.dataTest) {
      selector = `[data-test="${elementInfo.dataTest}"]`;
    } else if (elementInfo.id) {
      selector = `#${elementInfo.id}`;
    } else if (elementInfo.name) {
      selector = `[name="${elementInfo.name}"]`;
    } else if (elementInfo.ariaLabel) {
      selector = `[aria-label="${elementInfo.ariaLabel}"]`;
    } else if (elementInfo.text) {
      // Use text content as fallback
      selector = `text="${elementInfo.text}"`;
    }

    if (selector) {
      try {
        const locator = page.locator(selector).first();
        const isVisible = await locator.isVisible().catch(() => false);
        if (isVisible) {
          verifiedElements.push({
            ...elementInfo,
            selector,
            verified: true,
          });
        }
      } catch {
        // Selector not valid, skip
      }
    }
  }

  return verifiedElements;
}

async function performLogin(page, credentials, siteUrl, apiKey) {
  try {
    // Navigate to the site
    await page.goto(siteUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000); // Wait for page to fully load

    // Use Playwright's inspector capabilities to analyze the page
    const verifiedElements = await analyzePageWithPlaywright(page);

    // Get page structure - extract form elements and their attributes
    const pageStructure = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll("form"));
      const inputs = Array.from(document.querySelectorAll("input"));
      const buttons = Array.from(
        document.querySelectorAll('button, input[type="submit"]')
      );

      const getElementInfo = (el) => {
        const info = {
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          id: el.id || null,
          name: el.name || null,
          placeholder: el.placeholder || null,
          className: el.className || null,
          text: el.textContent?.trim().substring(0, 50) || null,
        };

        // Get parent form info if exists
        const form = el.closest("form");
        if (form) {
          info.formId = form.id || null;
          info.formClass = form.className || null;
        }

        return info;
      };

      return {
        forms: forms.map(getElementInfo),
        inputs: inputs.map(getElementInfo),
        buttons: buttons.map(getElementInfo),
        html: document.documentElement.outerHTML.substring(0, 10000), // First 10k chars of HTML
      };
    });

    // Create a simplified HTML structure for OpenAI analysis, including Playwright-verified elements
    const verifiedElementsInfo = verifiedElements
      .map(
        (e) =>
          `  - ${e.tag} type="${e.type || ""}" id="${e.id || ""}" name="${
            e.name || ""
          }" placeholder="${e.placeholder || ""}" data-testid="${
            e.dataTestId || ""
          }" aria-label="${e.ariaLabel || ""}" selector="${e.selector || ""}"`
      )
      .join("\n");

    const simplifiedHtml = `
Forms found: ${pageStructure.forms.length}
Inputs found: ${pageStructure.inputs.length}
Buttons found: ${pageStructure.buttons.length}
Playwright-verified visible elements: ${verifiedElements.length}

Forms:
${pageStructure.forms
  .map((f) => `  - ${f.tag} id="${f.id || ""}" class="${f.className || ""}"`)
  .join("\n")}

Inputs:
${pageStructure.inputs
  .map(
    (i) =>
      `  - ${i.tag} type="${i.type || ""}" id="${i.id || ""}" name="${
        i.name || ""
      }" placeholder="${i.placeholder || ""}"`
  )
  .join("\n")}

Buttons:
${pageStructure.buttons
  .map(
    (b) =>
      `  - ${b.tag} type="${b.type || ""}" id="${b.id || ""}" text="${
        b.text || ""
      }"`
  )
  .join("\n")}

Playwright-verified elements (preferred selectors):
${verifiedElementsInfo}

Relevant HTML snippet:
${pageStructure.html}
`;

    // Use OpenAI to find the correct selectors
    const selectors = await findLoginSelectorsWithOpenAI({
      apiKey,
      pageHtml: simplifiedHtml,
    });

    if (!selectors.emailSelector || !selectors.passwordSelector) {
      throw new Error(
        `OpenAI could not identify login form elements. Email selector: ${
          selectors.emailSelector || "null"
        }, Password selector: ${selectors.passwordSelector || "null"}`
      );
    }

    // Use the identified selectors to find elements with Playwright's locator API
    const emailInput = page.locator(selectors.emailSelector).first();
    const passwordInput = page.locator(selectors.passwordSelector).first();

    // Verify elements are visible using Playwright's built-in checks
    await emailInput.waitFor({ state: "visible", timeout: 5000 });
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });

    // Use Playwright's actionability checks before interacting
    await emailInput.scrollIntoViewIfNeeded();
    await passwordInput.scrollIntoViewIfNeeded();

    // Fill in credentials
    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);

    // Handle submit button
    if (selectors.submitSelector) {
      const submitButton = page.locator(selectors.submitSelector).first();
      try {
        await submitButton.waitFor({ state: "visible", timeout: 3000 });
        await submitButton.click();
      } catch {
        // If submit button not found or not clickable, try pressing Enter
        await passwordInput.press("Enter");
      }
    } else {
      // If no submit selector found, try pressing Enter on the password field
      await passwordInput.press("Enter");
    }

    // Wait for navigation or some indication that login was successful
    await page.waitForTimeout(2000);

    // Check if URL changed (common after successful login)
    const currentUrl = page.url();
    if (
      currentUrl !== siteUrl &&
      !currentUrl.includes("login") &&
      !currentUrl.includes("signin")
    ) {
      // URL changed, likely successful login
      return {
        success: true,
        message: "Login successful - URL changed",
        selectors,
      };
    }

    // Wait a bit more and check for common post-login elements
    await page.waitForTimeout(1000);

    return { success: true, message: "Login attempt completed", selectors };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTestWithLLM({ testCase, apiKey, siteUrl, credentials }) {
  try {
    const plan = await askOpenAIForMCPPlan({
      apiKey,
      testCase,
      siteUrl,
      credentials,
    });
    const ops = plan.mcpPlan;

    // Launch browser with inspector mode enabled (can be controlled via environment variable)
    const inspectorMode = process.env.PWDEBUG === "1" || process.env.PWDEBUG === "console";
    const browser = await chromium.launch({ 
      headless: false,
      // Enable inspector if PWDEBUG is set
      ...(inspectorMode && { 
        devtools: true 
      })
    });
    const context = await browser.newContext({
      // Enable better debugging
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Enable Playwright's trace for better debugging (optional)
    if (process.env.PWTRACE === "1") {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }

    const report = [];

    // Perform login if credentials are provided
    if (credentials?.email && credentials?.password) {
      report.push({
        op: "login",
        status: "attempting",
        message: "Analyzing page structure with OpenAI...",
      });
      const loginResult = await performLogin(
        page,
        credentials,
        siteUrl,
        apiKey
      );
      if (!loginResult.success) {
        await browser.close();
        return { ok: false, error: `Login failed: ${loginResult.error}` };
      }
      report.push({
        op: "login",
        status: "success",
        message: loginResult.message,
        selectors: loginResult.selectors,
      });
    }

    // Execute the test plan operations
    for (const op of ops) {
      const { op: name, args } = op;

      if (name === "goto") {
        await page.goto(args.url);
        report.push({ op: "goto", url: args.url });
      } else if (name === "click") {
        // Use Playwright's locator API with better error handling
        const element = page.locator(args.selector).first();
        await element.waitFor({ state: "visible", timeout: 5000 });
        await element.scrollIntoViewIfNeeded();
        await element.click({ timeout: 5000 });
        report.push({ op: "click", selector: args.selector });
      } else if (name === "fill") {
        // Use Playwright's locator API with better error handling
        const element = page.locator(args.selector).first();
        await element.waitFor({ state: "visible", timeout: 5000 });
        await element.scrollIntoViewIfNeeded();
        await element.fill(args.value, { timeout: 5000 });
        report.push({ op: "fill", selector: args.selector });
      } else if (name === "assert") {
        // Use Playwright's locator API for assertions
        const element = page.locator(args.selector).first();
        await element.waitFor({ state: "visible", timeout: 5000 });
        const text = await element.textContent();
        const pass = Boolean(text?.includes(args.contains));
        report.push({
          op: "assert",
          selector: args.selector,
          contains: args.contains,
          pass,
        });
        if (!pass)
          throw new Error(`Assertion failed for selector ${args.selector}. Expected to contain "${args.contains}", but got: "${text}"`);
      } else if (name === "screenshot") {
        const path = args.path || `screenshot-${Date.now()}.png`;
        await page.screenshot({ path });
        report.push({ op: "screenshot", path });
      } else {
        report.push({ op: "unknown", name });
      }
    }

    // Stop tracing if it was started
    if (process.env.PWTRACE === "1") {
      await context.tracing.stop({ path: `trace-${Date.now()}.zip` });
    }

    // Optionally pause before closing (useful for debugging)
    if (process.env.PWPAUSE === "1") {
      await page.pause(); // Opens Playwright Inspector
    }

    await browser.close();

    return { ok: true, report };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { runTestWithLLM };

