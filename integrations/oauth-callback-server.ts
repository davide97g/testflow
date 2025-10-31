/**
 * OAuth Callback Server
 *
 * Starts a local HTTP server to handle OAuth redirect callbacks.
 */

import { createServer, type Server } from "node:http";
import { URL } from "node:url";

export interface CallbackResult {
  code: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Starts a local HTTP server to receive OAuth callbacks
 * @param port - Port to listen on (default: 3000)
 * @param timeout - Timeout in milliseconds (default: 5 minutes)
 * @returns Promise that resolves with the authorization code when callback is received
 */
export const startCallbackServer = (
  port = 3000,
  timeout = 5 * 60 * 1000
): Promise<CallbackResult> => {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      // Send success page to user
      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Authorization Successful</title></head>
            <body>
              <h1>Authorization Successful!</h1>
              <p>You can close this window now.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);
      } else if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Authorization Failed</title></head>
            <body>
              <h1>Authorization Failed</h1>
              <p>${errorDescription || error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
      } else {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Invalid Request</title></head>
            <body>
              <h1>Invalid Request</h1>
              <p>No authorization code or error received.</p>
            </body>
          </html>
        `);
      }

      // Close server and resolve
      server.close(() => {
        clearTimeout(timeoutId);

        if (error) {
          reject(new Error(`OAuth authorization failed: ${error} - ${errorDescription || ""}`));
        } else if (code) {
          resolve({
            code,
            state: state || undefined,
          });
        } else {
          reject(new Error("No authorization code or error received"));
        }
      });
    });

    // Handle server errors
    server.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    // Start server
    server.listen(port, () => {
      console.log(`Callback server listening on http://localhost:${port}`);
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      server.close();
      reject(new Error(`OAuth callback timeout after ${timeout}ms`));
    }, timeout);
  });
};
