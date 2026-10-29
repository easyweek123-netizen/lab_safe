import { z } from 'zod';

// Start-up settings (E01 design §7, design doc §10). Later epics add their settings here.
const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'], {
      error: 'must be one of development, test, production',
    })
    .default('development'),
  PORT: z.coerce
    .number({ error: 'must be a whole number from 1 to 65535' })
    .int({ error: 'must be a whole number from 1 to 65535' })
    .min(1, { error: 'must be a whole number from 1 to 65535' })
    .max(65535, { error: 'must be a whole number from 1 to 65535' })
    .default(3000),
  DATABASE_URL: z.url({
    error: (issue) => (issue.input === undefined ? 'is required' : 'must be a valid URL'),
  }),
  // Checked by S01.3, which serves the built web app from this folder.
  WEB_DIST_DIR: z.string().optional(),
});

export type AppConfig = z.output<typeof ConfigSchema>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Injection token for the validated `AppConfig`. */
export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Validates the settings. Throws one `ConfigError` that names every bad setting, for example
 * `Invalid configuration: DATABASE_URL: is required; PORT: must be a whole number from 1 to 65535`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = ConfigSchema.safeParse(env);
  if (result.success) return result.data;

  const problems = new Map<string, string>();
  for (const issue of result.error.issues) {
    const name = issue.path.map(String).join('.') || '(root)';
    if (!problems.has(name)) problems.set(name, issue.message);
  }
  const parts = [...problems].map(([name, message]) => `${name}: ${message}`);
  throw new ConfigError(`Invalid configuration: ${parts.join('; ')}`);
}
