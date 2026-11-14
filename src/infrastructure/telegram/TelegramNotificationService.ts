import { Injectable } from '@nestjs/common';
import {
  DeliveryResult,
  INotificationService,
} from '../../domain/ports/INotificationService';
import { classifyTelegramError } from './telegram-delivery';
import { formatVacancyAlert } from './telegram-format';
import { Subscriber } from '../../domain/entities/Subscriber';
import { Vacancy } from '../../domain/entities/Vacancy';
import axios from 'axios';
import Bottleneck from 'bottleneck';

@Injectable()
export class TelegramNotificationService implements INotificationService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly limiter: Bottleneck;

  constructor() {
    // Configurando a "Catraca" (Rate Limiter)
    this.limiter = new Bottleneck({
      // O Telegram aceita ~30 mensagens por segundo.
      // 1000ms / 30 = ~33.3ms. Colocamos 35ms por segurança.
      // Isso garante que NUNCA faremos requisições mais rápido que 1 a cada 35 milissegundos.
      minTime: 35,

      // Quantas requisições simultâneas podemos abrir?
      maxConcurrent: 1,
    });

    // Opcional: Escutar eventos de gargalo para monitoramento
    this.limiter.on('dropped', () =>
      console.warn('[Telegram] Requisição dropada pelo limiter!'),
    );
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
   * so callers can decide whether to retry. Errors are logged by status only: the raw axios
   * error embeds the request URL, which contains the bot token.
   */
  private async deliver(
    chatId: string,
    text: string,
    parseMode?: 'HTML',
  ): Promise<DeliveryResult> {
    try {
      // Bottleneck queues requests and releases one every 35ms.
      await this.limiter.schedule(() =>
        axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          chat_id: chatId,
          text,
          ...(parseMode ? { parse_mode: parseMode } : {}),
        }),
      );
      return { status: 'sent' };
    } catch (error) {
      const result = classifyTelegramError(error);
      const httpStatus = (error as { response?: { status?: number } })?.response
        ?.status;
      console.error(
        `[Telegram] Delivery to ${chatId} failed (${result.status}, http ${httpStatus ?? 'n/a'})`,
      );
      return result;
    }
  }
}
