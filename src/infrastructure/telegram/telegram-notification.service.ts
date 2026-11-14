import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Subscriber } from '../../domain/entities/subscriber';
import { Vacancy } from '../../domain/entities/vacancy';
import {
  DeliveryResult,
  INotificationService,
} from '../../domain/ports/notification-service.port';
import { classifyTelegramError } from './telegram-delivery';
import { formatVacancyAlert } from './telegram-format';

@Injectable()
export class TelegramNotificationService implements INotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly limiter: Bottleneck;

  constructor(@InjectBot() private readonly bot: Telegraf) {
    // Telegram accepts about 30 messages per second. One request every 35ms, one at a
    // time, keeps us safely under that limit even when thousands of alerts queue up.
    this.limiter = new Bottleneck({ minTime: 35, maxConcurrent: 1 });
  }

  async sendVacancyAlert(
    subscriber: Subscriber,
    vacancy: Vacancy,
  ): Promise<DeliveryResult> {
    return this.deliver(
      subscriber.telegramId,
      formatVacancyAlert(vacancy),
      'HTML',
    );
  }

  async sendCustomAlert(
    subscriber: Subscriber,
    text: string,
  ): Promise<DeliveryResult> {
    // Plain text: internal messages never carry markup, so nothing can be misparsed.
    return this.deliver(subscriber.telegramId, text);
  }

  /**
   * Sends one message through the rate limiter and reports the outcome instead of throwing,
   * so callers can decide whether to retry. Only the outcome is logged: transport errors can
   * embed the request URL, which contains the bot token.
   */
  private async deliver(
    chatId: string,
    text: string,
    parseMode?: 'HTML',
  ): Promise<DeliveryResult> {
    try {
      await this.limiter.schedule(() =>
        this.bot.telegram.sendMessage(
          chatId,
          text,
          parseMode ? { parse_mode: parseMode } : undefined,
        ),
      );
      return { status: 'sent' };
    } catch (error) {
      const result = classifyTelegramError(error);
      this.logger.warn(`Delivery to ${chatId} failed (${result.status})`);
      return result;
    }
  }
}
