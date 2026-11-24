import {
  type CurrentUser as CurrentUserResponse,
  LoginRequest,
  type SessionResponse,
  SignUpRequest,
} from '@labsafe/shared';
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { type AccessRequest, CurrentUser, Public, SignedIn } from '../../common/access';
import { APP_CONFIG, type AppConfig } from '../../common/config';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  clearSessionCookie,
  type CookieResponse,
  hasSessionCookie,
  sessionTokenOf,
  setSessionCookie,
} from './session-cookie';

/**
 * `/api/auth` (S02.1 API contract, E02 design "Endpoints"). The cookie is set only by sign-up and
 * login, and cleared by logout and by `me` when it names no live session.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** `POST /api/auth/signup` → 201 `CurrentUser` and the session cookie. */
  @Public()
  @Post('signup')
  async signUp(
    @Body(new ZodValidationPipe(SignUpRequest)) body: SignUpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<CurrentUserResponse> {
    const { user, session } = await this.authService.signUp(body);
    setSessionCookie(response, session.token, this.config.COOKIE_SECURE);
    return user;
  }

  /** `POST /api/auth/login` → 200 `CurrentUser` and a new session cookie. */
  @Public()
  @Post('login')
  @HttpCode(200)
  async logIn(
    @Body(new ZodValidationPipe(LoginRequest)) body: LoginRequest,
    @Req() request: AccessRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<CurrentUserResponse> {
    const { user, session } = await this.authService.logIn(body, sessionTokenOf(request));
    setSessionCookie(response, session.token, this.config.COOKIE_SECURE);
    return user;
  }

  /** `POST /api/auth/logout` → 204; deletes the session and clears the cookie. */
  @SignedIn()
  @Post('logout')
  @HttpCode(204)
  async logOut(
    @Req() request: AccessRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    // `@SignedIn()` let the request through, so it has a live session token.
    const token = sessionTokenOf(request);
    if (token !== undefined) await this.authService.logOut(token);
    clearSessionCookie(response, this.config.COOKIE_SECURE);
  }

  /**
   * `GET /api/auth/me` → `{ user }`, `null` when anonymous (E02-D3). `AccessGuard` already loaded
   * the user; a cookie that named no live session is cleared, and no cookie is ever set.
   */
  @Public()
  @Get('me')
  me(
    @CurrentUser() user: CurrentUserResponse | null,
    @Req() request: AccessRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): SessionResponse {
    if (user === null && hasSessionCookie(request)) {
      clearSessionCookie(response, this.config.COOKIE_SECURE);
    }
    return { user };
  }
}
