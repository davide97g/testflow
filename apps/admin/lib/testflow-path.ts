import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolves the monorepo root directory (testflow repo root).
 * When running from apps/admin, cwd is apps/admin so we go up two levels.
 * When running from repo root (e.g. turbo), cwd is already the root.
 */
function getMonorepoRoot(): string {
  const cwd = process.cwd();
  const rootPackageInCwd = join(cwd, "package.json");
  if (existsSync(rootPackageInCwd)) {
    const appsAdmin = join(cwd, "apps", "admin", "package.json");
    if (existsSync(appsAdmin)) return cwd;
  }
  const candidate = join(cwd, "..", "..");
  const rootPackagePath = join(candidate, "package.json");
  if (existsSync(rootPackagePath)) return candidate;
  return cwd;
}

/**
 * Directory for testflow config and output: .testflow at monorepo root.
 * All env, config, and output paths should use this so admin and CLI share the same location.
 */
export function getTestflowDir(): string {
  return join(getMonorepoRoot(), ".testflow");
}

/**
 * Central env file path. Single source of truth for environment variables
 * saved from the admin Env page. All API routes and config test read from here.
 */
export function getCentralEnvPath(): string {
  return join(getTestflowDir(), "env.json");
}
