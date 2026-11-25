import {
  type CurrentUser as CurrentUserResponse,
  type MySubmissions,
  SafetyPageContent,
  type Submission,
  SubmissionIdParam,
} from '@labsafe/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Contributor, CurrentUser, Public } from '../../common/access';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { SubmissionsService } from './submissions.service';

/**
 * `/api/submissions` (S03.1 API contract). Each handler declares its own access level, because
 * S03.2's `GET` and `PUT /submissions/:id` are `@Public()` at the guard (E03-D4).
 */
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * `GET /api/submissions/mine` → 200 `MySubmissions`, newest first. Declared before any
   * `:id` route, so S03.2's `GET /submissions/:id` cannot shadow it.
   */
  @Contributor()
  @Get('mine')
  mine(@CurrentUser() user: CurrentUserResponse): Promise<MySubmissions> {
    return this.submissionsService.listMine(user.id);
  }

  /** `POST /api/submissions` → 201 `Submission` (kind `NEW`, status `PENDING`). */
  @Contributor()
  @Post()
  @HttpCode(201)
  submit(
    @CurrentUser() user: CurrentUserResponse,
    @Body(new ZodValidationPipe(SafetyPageContent)) content: SafetyPageContent,
  ): Promise<Submission> {
    return this.submissionsService.submitNew(user, content);
  }

  /**
   * `GET /api/submissions/:id` → 200 `Submission`. Public at the guard; the service answers 404
   * to everyone but the author and approved admins (E03-D4).
   */
  @Public()
  @Get(':id')
  read(
    @Param(new ZodValidationPipe(SubmissionIdParam)) params: SubmissionIdParam,
    @CurrentUser() user: CurrentUserResponse | null,
  ): Promise<Submission> {
    return this.submissionsService.read(params.id, user);
  }

  /**
   * `PUT /api/submissions/:id` → 200 `Submission`, still `PENDING`. Public at the guard; the
   * service answers 404 to everyone but the approved author (E03-D4). A bad body is 400 from the
   * pipe for any caller (design open question 5).
   */
  @Public()
  @Put(':id')
  update(
    @Param(new ZodValidationPipe(SubmissionIdParam)) params: SubmissionIdParam,
    @CurrentUser() user: CurrentUserResponse | null,
    @Body(new ZodValidationPipe(SafetyPageContent)) content: SafetyPageContent,
  ): Promise<Submission> {
    return this.submissionsService.update(params.id, user, content);
  }
}
