import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { APP_CONFIG, type AppConfig, type BootstrapAdmin } from '../../common/config';
import { hashPassword } from '../../common/password';
import { UsersService } from './users.service';

/** What start-up did about the first admin. */
type Outcome = 'admin-exists' | 'not-configured' | 'created' | 'promoted';

/**
 * The first admin (S02.2 AC1, AC2, E02 design "Flows"). Runs once per start, after the database
 * connection is ready (TypeORM connects while the providers are created; this hook runs after
 * that), and decides and writes in one transaction. A failure stops the start-up. Never logs the
 * password or the email.
 */
@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapAdminService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const outcome = await this.ensureAdmin(this.config.BOOTSTRAP_ADMIN);
    if (outcome === 'not-configured') {
      this.logger.warn(
        'No admin account exists and BOOTSTRAP_ADMIN_* are not set: nobody can approve sign-ups.',
      );
    } else if (outcome === 'created') {
      this.logger.log('Created the first admin account from BOOTSTRAP_ADMIN_*.');
    } else if (outcome === 'promoted') {
      this.logger.log('Made the existing account of BOOTSTRAP_ADMIN_EMAIL the first admin.');
    }
  }

  /**
   * If no admin exists: creates the configured account as an `APPROVED` `ADMIN`, or, if its email
   * already has an account, makes that account one and keeps its password. An existing admin
   * means nothing changes, so a second start adds nothing.
   */
  private ensureAdmin(settings: BootstrapAdmin | undefined): Promise<Outcome> {
    return this.dataSource.transaction(async (manager): Promise<Outcome> => {
      if (await this.usersService.adminExists(manager)) return 'admin-exists';
      if (!settings) return 'not-configured';

      const existing = await this.usersService.findByEmail(settings.email, manager);
      if (existing) {
        await this.usersService.makeApprovedAdmin(manager, existing.id);
        return 'promoted';
      }
      await this.usersService.createApprovedAdmin(manager, {
        name: settings.name,
        email: settings.email,
        passwordHash: await hashPassword(settings.password),
      });
      return 'created';
    });
  }
}
