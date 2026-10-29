import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

const DATABASE_URL = 'postgres://labsafe:labsafe@localhost:5442/labsafe';

function configErrorOf(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error('loadConfig did not throw');
}

describe('loadConfig', () => {
  it('TC-7.1 refuses an env without DATABASE_URL and names it', () => {
    const error = configErrorOf({ PORT: '3000', NODE_ENV: 'development' });

    expect(error.message).toBe('Invalid configuration: DATABASE_URL: is required');
  });

  it('TC-7.1 refuses a DATABASE_URL that is not a URL', () => {
    const error = configErrorOf({ DATABASE_URL: 'not a url' });

    expect(error.message).toBe('Invalid configuration: DATABASE_URL: must be a valid URL');
  });

  it('TC-7.2 names both PORT and NODE_ENV in one ConfigError', () => {
    const error = configErrorOf({ PORT: 'abc', NODE_ENV: 'staging', DATABASE_URL });

    expect(error.message).toMatch(/^Invalid configuration: /);
    expect(error.message).toContain('PORT: must be a whole number from 1 to 65535');
    expect(error.message).toContain('NODE_ENV: must be one of development, test, production');
    expect(error.message).not.toContain('\n');
  });

  it.each(['0', '65536', '30.5', ''])('TC-7.2 refuses PORT=%j', (PORT) => {
    const error = configErrorOf({ PORT, DATABASE_URL });

    expect(error.message).toBe(
      'Invalid configuration: PORT: must be a whole number from 1 to 65535',
    );
  });

  it('TC-7.3 uses the defaults when only DATABASE_URL is set', () => {
    const config = loadConfig({ DATABASE_URL });

    expect(config).toEqual({ NODE_ENV: 'development', PORT: 3000, DATABASE_URL });
    expect(config.WEB_DIST_DIR).toBeUndefined();
  });

  it('TC-7.3 coerces PORT from text and keeps only known settings', () => {
    const WEB_DIST_DIR = 'apps/web/dist';
    const config = loadConfig({
      DATABASE_URL,
      PORT: '4100',
      NODE_ENV: 'test',
      WEB_DIST_DIR,
      HOME: '/x',
    });

    expect(config).toEqual({ NODE_ENV: 'test', PORT: 4100, DATABASE_URL, WEB_DIST_DIR });
  });
});
