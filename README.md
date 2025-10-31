# ai-test-validation

## Project Structure

```plaintext
ai-test-validation/
├── README.md
├── package.json
├── tsconfig.json
├── biome.json
├── .gitignore
├── .env.example
├── apps/local-runner/
│   ├── browser-launcher.ts
│   ├── test-executor.ts
│   ├── ai-agent.ts
│   └── logger.ts
├── cli/
│   ├── fetch-tests.ts
│   ├── run-tests.ts
│   └── report.ts
├── integrations/
│   ├── jira-client.ts
│   ├── bitbucket-client.ts
│   └── zephyr-client.ts
├── llm/
│   ├── llm.ts
│   └── inference.ts
└── scripts/
    └── setup-env.sh
```

### Directory Descriptions

- **apps/local-runner/** – Executes Zephyr test scripts locally in a browser with an AI agent following steps and validating outcomes.
- **cli/** – Command-line scripts to fetch tests, run them, and post results.
- **integrations/** – API clients for Jira, Bitbucket, and Zephyr.
- **llm/** – AI engine to infer which tests match a PR and Jira ticket.
- **scripts/** – Helper scripts, e.g., environment setup.

## Getting Started

### Clone the repository

```bash
git clone <repo-url>
cd ai-test-validation
```

### Set up environment variables

Copy `.env.example` to `.env` and fill in API tokens for Jira, Bitbucket, and Zephyr:

```bash
./scripts/setup-env.sh
```

Or manually:

```bash
cp .env.example .env
```

Then edit `.env` and add your API tokens.

### Install dependencies

```bash
bun install
```

### Build TypeScript

```bash
bun run build
```

### Run CLI commands

**Fetch linked tests:**

```bash
bun run fetch-tests
# or
bun cli/fetch-tests.ts
```

**Run tests locally:**

```bash
bun run run-tests
# or
bun cli/run-tests.ts
```

**Post results to Jira:**

```bash
bun run report
# or
bun cli/report.ts
```

**Type check:**

```bash
bun run type-check
```

**Lint and format code:**

```bash
bun run lint          # Check for linting issues
bun run format        # Format code
bun run check          # Run full check (lint + format)
bun run check:fix      # Auto-fix issues
```

## Folder Overview

| Folder               | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `apps/local-runner/` | Runs test scripts in a browser, captures logs/screenshots. |
| `cli/`               | Commands to fetch tests, execute, and report results.      |
| `integrations/`      | API clients for Jira, Bitbucket, Zephyr.                   |
| `llm/`               | AI inference engine linking PRs to tests.                  |
| `scripts/`           | Utilities like environment setup.                          |

## Notes

- Project is written in TypeScript with strict type checking enabled.
- All modules use CommonJS exports and TypeScript interfaces/types.
- TypeScript files are ready for implementation with empty function scaffolding.
- Uses **Bun** as the runtime and package manager.
- Uses **BiomeJS** for linting and formatting (replaces ESLint and Prettier).
- Use `bun` for direct TypeScript execution or build with `bun run build` for compiled JavaScript.

## Goals

- Automated regression testing on every PR.
- AI-assisted mapping of PR changes to Zephyr test cases.
- Full traceability: Jira → Zephyr → PR → Test results.
- Easy to extend with real AI logic or browser automation.
