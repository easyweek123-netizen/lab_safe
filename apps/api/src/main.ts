import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { type AppConfig, ConfigError, loadConfig } from './common/config';

function loadConfigOrExit(): AppConfig {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      // One readable line, no stack trace (AC7).
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function bootstrap(): Promise<void> {
  const config = loadConfigOrExit();
  const app = await NestFactory.create(AppModule.forRoot(config));
  configureApp(app);
  await app.listen(config.PORT);
}

void bootstrap();
