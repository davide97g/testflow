import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  bitbucket: z.object({
    workspace: z.string(),
    repo: z.string(),
  }),
});

const requestSchema = z.object({
  config: configSchema,
  issueKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, issueKey } = requestSchema.parse(body);

    const envVars = await getEnvVars();
    const BITBUCKET_EMAIL = envVars.BITBUCKET_EMAIL;
    const BITBUCKET_API_TOKEN = envVars.BITBUCKET_API_TOKEN;

    if (!BITBUCKET_EMAIL || !BITBUCKET_API_TOKEN) {
      return NextResponse.json(
        {
          success: true,
          data: {},
          hasData: false,
          error: "Bitbucket credentials not configured",
        },
        { status: 200 }
      );
    }

    const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
    const bbAuth = Buffer.from(
      `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
    ).toString("base64");
    const bbHeaders = {
      Authorization: `Basic ${bbAuth}`,
      Accept: "application/json",
    };

    const ticketPattern = new RegExp(
      issueKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const result: {
      branch?: { name: string; url: string };
      pr?: { title: string; description: string; url: string };
      patch?: string;
    } = {};

    // Try to find PR
    try {
      const prsUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/pullrequests?state=OPEN&pagelen=50`;
      const prsResponse = await axios.get(prsUrl, { headers: bbHeaders });
      const prsData = prsResponse.data as {
        values?: Array<{
          title?: string;
          description?: string;
          source?: { branch?: { name?: string } };
          links?: { html?: { href?: string } };
        }>;
      };

      if (prsData.values) {
        for (const pr of prsData.values) {
          const titleMatch = pr.title && ticketPattern.test(pr.title);
          const descMatch =
            pr.description && ticketPattern.test(pr.description);
          const branchMatch =
            pr.source?.branch?.name &&
            ticketPattern.test(pr.source.branch.name);

          if (titleMatch || descMatch || branchMatch) {
            result.pr = {
              title: pr.title || "",
              description: pr.description || "",
              url: pr.links?.html?.href || "",
            };
            if (pr.source?.branch?.name) {
              result.branch = {
                name: pr.source.branch.name,
                url: "",
              };
            }
            break;
          }
        }
      }
    } catch {
      // Ignore PR fetch errors, continue to try branches
    }

    // Try to find branch if not found in PR
    if (!result.branch) {
      try {
        const branchesUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/refs/branches?pagelen=100`;
        const branchesResponse = await axios.get(branchesUrl, {
          headers: bbHeaders,
        });
        const branchesData = branchesResponse.data as {
          values?: Array<{
            name?: string;
            links?: { html?: { href?: string } };
          }>;
        };

        if (branchesData.values) {
          for (const branch of branchesData.values) {
            if (branch.name && ticketPattern.test(branch.name)) {
              result.branch = {
                name: branch.name,
                url: branch.links?.html?.href || "",
              };
              break;
            }
          }
        }
      } catch {
        // Ignore branch fetch errors
      }
    }

    // If we have a branch, try to get PR changes
    if (result.branch?.name) {
      try {
        // This would require the PR ID, which we might have from above
        // For now, we'll return what we have
      } catch (error) {
        console.error("Error fetching PR changes:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      hasData: !!(result.branch || result.pr),
    });
  } catch (error) {
    console.error("Error fetching Bitbucket data:", error);
    return NextResponse.json(
      {
        success: true,
        data: {},
        hasData: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
