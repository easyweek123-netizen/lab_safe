import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig } from './common/config';
import { dataSourceOptions } from './db/data-source';
import { HealthModule } from './modules/health/health.module';

@Module({})
export class AppModule {
  /** The config is passed in (never loaded at import time), so tests can use their own. */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [
        // Migrations never run at start-up in E01, and `synchronize` stays false (design doc §10).
        TypeOrmModule.forRoot({
          ...dataSourceOptions(config.DATABASE_URL),
          autoLoadEntities: true,
        }),
        HealthModule,
      ],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
