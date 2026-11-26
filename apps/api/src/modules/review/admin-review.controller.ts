import {
  ApproveSubmissionRequest,
  RejectSubmissionRequest,
  type CurrentUser as CurrentUserResponse,
  type ReviewDecision,
  type ReviewQueue,
  type ReviewSubmission,
  SubmissionIdParam,
} from '@labsafe/shared';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Admin, CurrentUser } from '../../common/access';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ReviewService } from './review.service';

/**
 * `/api/admin/review-queue`, `/api/admin/submissions/:id` (S04.1 API contract), its approve
 * route (S04.2) and its reject route (S04.3). `@Admin()` on
 * the class: anonymous 401, every other account 403, also the page's own author (E04-D4).
 */
@Admin()
@Controller('admin')
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /** `GET /api/admin/review-queue` → 200 `ReviewQueue`, oldest submission first. */
  @Get('review-queue')
  queue(): Promise<ReviewQueue> {
    return this.reviewService.queue();
  }

  /** `GET /api/admin/submissions/:id` → 200 `ReviewSubmission` (any status). */
  @Get('submissions/:id')
  read(
    @Param(new ZodValidationPipe(SubmissionIdParam)) params: SubmissionIdParam,
  ): Promise<ReviewSubmission> {
    return this.reviewService.read(params.id);
  }

  /**
   * `POST /api/admin/submissions/:id/approve` → 200 `ReviewDecision`: publishes the `version`
   * the admin saw (S04.2 AC1, AC9).
   */
  @Post('submissions/:id/approve')
  @HttpCode(200)
  approve(
    @Param(new ZodValidationPipe(SubmissionIdParam)) params: SubmissionIdParam,
    @Body(new ZodValidationPipe(ApproveSubmissionRequest)) body: ApproveSubmissionRequest,
    @CurrentUser() admin: CurrentUserResponse,
  ): Promise<ReviewDecision> {
    return this.reviewService.approve(params.id, body.version, admin.id);
  }

  /**
   * `POST /api/admin/submissions/:id/reject` → 200 `ReviewDecision`: rejects a pending page with
   * the trimmed note for its contributor (S04.3 AC1, AC2).
   */
  @Post('submissions/:id/reject')
  @HttpCode(200)
  reject(
    @Param(new ZodValidationPipe(SubmissionIdParam)) params: SubmissionIdParam,
    @Body(new ZodValidationPipe(RejectSubmissionRequest)) body: RejectSubmissionRequest,
    @CurrentUser() admin: CurrentUserResponse,
  ): Promise<ReviewDecision> {
    return this.reviewService.reject(params.id, body.note, admin.id);
  }
}
