import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AppConfig } from '../../shared/config/app.config';
import { APP_CONFIG } from '../../shared/tokens';
import { DEAD_LETTER_QUEUE } from '../messaging/rabbitmq.config';

@Injectable()
export class DlqMonitorService {
  private readonly logger = new Logger(DlqMonitorService.name);
  private lastAlertedCount = 0;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkDlq() {
    const { managementUrl, user, password } = this.config.rabbitmq;
    const adminId = this.config.telegram.adminId;

    // Monitoring is opt-in: without an admin chat there is nobody to alert.
    if (!adminId) return;

    try {
      const { data } = await axios.get(
        `${managementUrl}/api/queues/%2F/${DEAD_LETTER_QUEUE}`,
        { auth: { username: user, password } },
      );

      const messageCount: number = data.messages_ready ?? 0;

      if (messageCount > this.lastAlertedCount) {
        // Plain text on purpose: nothing here may be misparsed as markup.
        await this.bot.telegram.sendMessage(
          adminId,
          `⚠️ DLQ alert: ${DEAD_LETTER_QUEUE}\n\n` +
            `Messages waiting: ${messageCount}\n\n` +
            `Inspect and replay them in the RabbitMQ management UI:\n` +
            `${managementUrl}`,
        );
        this.logger.warn(
          `DLQ alert sent: ${messageCount} messages in ${DEAD_LETTER_QUEUE}`,
        );
      }

      this.lastAlertedCount = messageCount;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        this.logger.warn(
          'RabbitMQ management API unavailable; skipping DLQ monitoring.',
        );
        return;
      }
      this.logger.error('Failed to check the DLQ', error);
    }
  }
}
