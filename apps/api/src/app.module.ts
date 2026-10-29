import { type DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig } from './common/config';
import { dataSourceOptions } from './db/data-source';
import { HealthModule } from './modules/health/health.module';
import { MetaModule } from './modules/meta/meta.module';

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
        MetaModule,
        // One origin in test and production (design doc D7): every path outside `/api` gets the
        // built web app, falling back to `index.html`. `/api` paths go on to Nest's router, so an
        // unknown one is still the JSON 404. Express 5 needs the `{*path}` wildcard syntax.
        ...(config.WEB_DIST_DIR
          ? [
              ServeStaticModule.forRoot({
                rootPath: config.WEB_DIST_DIR,
                exclude: ['/api/{*path}'],
              }),
            ]
          : []),
      ],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
