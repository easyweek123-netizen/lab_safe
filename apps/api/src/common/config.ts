import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Email, SignUpRequest } from '@labsafe/shared';
import { z } from 'zod';

/**
 * `WEB_DIST_DIR`, resolved against the working directory to an absolute path. It must contain
 * `index.html`, so a wrong folder stops the start-up instead of serving 404s (S01.3 AC3).
 */
const WebDistDir = z.string().transform((dir, ctx) => {
  const absolute = resolve(dir);
  if (statSync(join(absolute, 'index.html'), { throwIfNoEntry: false })?.isFile()) {
    return absolute;
  }
  ctx.issues.push({ code: 'custom', input: dir, message: `no index.html in ${absolute}` });
  return z.NEVER;
});

/** The first admin's settings: all three or none (S02.2 AC1, AC2, E02 design "Flows"). */
const BOOTSTRAP_ADMIN_SETTINGS = [
  'BOOTSTRAP_ADMIN_EMAIL',
  'BOOTSTRAP_ADMIN_PASSWORD',
  'BOOTSTRAP_ADMIN_NAME',
] as const;

/** The account `BootstrapAdminService` creates when no admin exists. */
export interface BootstrapAdmin {
  email: string;
  password: string;
  name: string;
}

// Start-up settings (E01 design §7, design doc §10). Later epics add their settings here.
const ConfigSchema = z
  .object({
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
    // When set, Nest serves the built web app from this folder (S01.3, design §7).
    WEB_DIST_DIR: WebDistDir.optional(),
    // `Secure` on the session cookie (E02 design "Endpoints"). Unset: true only in production.
    COOKIE_SECURE: z
      .enum(['true', 'false'], { error: 'must be true or false' })
      .transform((value) => value === 'true')
      .optional(),
    // Checked with the sign-up rules, so the first admin could also have signed up (S02.2 AC2).
    BOOTSTRAP_ADMIN_EMAIL: Email.optional(),
    BOOTSTRAP_ADMIN_PASSWORD: SignUpRequest.shape.password.optional(),
    BOOTSTRAP_ADMIN_NAME: SignUpRequest.shape.name.optional(),
  })
  .superRefine(
    (config, ctx) => {
      const missing = BOOTSTRAP_ADMIN_SETTINGS.filter((name) => config[name] === undefined);
      if (missing.length === 0 || missing.length === BOOTSTRAP_ADMIN_SETTINGS.length) return;
      for (const name of missing) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: 'is required when any BOOTSTRAP_ADMIN_* setting is set',
        });
      }
    },
    // Also runs when another setting is bad, so one line names every problem.
    { when: () => true },
  )
  .transform(
    ({ BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME, ...config }) => ({
      ...config,
      COOKIE_SECURE: config.COOKIE_SECURE ?? config.NODE_ENV === 'production',
      BOOTSTRAP_ADMIN:
        BOOTSTRAP_ADMIN_EMAIL !== undefined &&
        BOOTSTRAP_ADMIN_PASSWORD !== undefined &&
        BOOTSTRAP_ADMIN_NAME !== undefined
          ? ({
              email: BOOTSTRAP_ADMIN_EMAIL,
              password: BOOTSTRAP_ADMIN_PASSWORD,
              name: BOOTSTRAP_ADMIN_NAME,
            } satisfies BootstrapAdmin)
          : undefined,
    }),
  );

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
