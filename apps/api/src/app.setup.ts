import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ErrorFilter } from './common/error.filter';

/** The set-up shared by `main.ts` and the integration tests, so tests run the real thing. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // `AccessGuard` reads the session cookie from `request.cookies` (E02 design "Endpoints").
  app.use(cookieParser());
  app.useGlobalFilters(new ErrorFilter());
}
