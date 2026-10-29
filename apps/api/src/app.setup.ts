import type { INestApplication } from '@nestjs/common';
import { ErrorFilter } from './common/error.filter';

/** The set-up shared by `main.ts` and the integration tests, so tests run the real thing. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
}
