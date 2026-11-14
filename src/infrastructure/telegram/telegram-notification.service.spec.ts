import { Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { Subscriber } from '../../domain/entities/subscriber';
import { Vacancy } from '../../domain/entities/vacancy';
import { Salary } from '../../domain/value-objects/salary';
import { TelegramNotificationService } from './telegram-notification.service';

describe('TelegramNotificationService', () => {
  const subscriber = new Subscriber('42', true);
  const vacancy = new Vacancy('v1', 'Dev <b>', 'TI', 'SP', new Salary(5000));
  let sendMessage: jest.Mock;
  let service: TelegramNotificationService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    sendMessage = jest.fn().mockResolvedValue({ message_id: 1 });
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const bot = { telegram: { sendMessage } } as unknown as Telegraf;
    service = new TelegramNotificationService(bot);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends vacancy alerts as escaped HTML', async () => {
    const result = await service.sendVacancyAlert(subscriber, vacancy);

    expect(result).toEqual({ status: 'sent' });
    const [chatId, text, extra] = sendMessage.mock.calls[0];
    expect(chatId).toBe('42');
    expect(extra).toEqual({ parse_mode: 'HTML' });
    expect(text).toContain('Dev &lt;b&gt;');
  });

  it('sends custom alerts as plain text so they can never be misparsed', async () => {
    await service.sendCustomAlert(subscriber, 'use /assinar *now* <b>');

    const [, text, extra] = sendMessage.mock.calls[0];
    expect(text).toBe('use /assinar *now* <b>');
    expect(extra).toBeUndefined();
  });

  it('reports a blocked recipient instead of throwing', async () => {
    sendMessage.mockRejectedValue({ response: { error_code: 403 } });

    await expect(
      service.sendVacancyAlert(subscriber, vacancy),
    ).resolves.toEqual({ status: 'blocked' });
  });

  it('reports transport failures as retryable', async () => {
    sendMessage.mockRejectedValue(new Error('socket hang up'));

    await expect(
      service.sendVacancyAlert(subscriber, vacancy),
    ).resolves.toEqual({ status: 'retryable' });
  });

  it('does not leak the bot token in logs when a request fails', async () => {
    sendMessage.mockRejectedValue(
      new Error('request to https://api.telegram.org/botSECRET-TOKEN/x failed'),
    );

    await service.sendVacancyAlert(subscriber, vacancy);

    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET-TOKEN');
  });

  it('spaces requests out to respect Telegram rate limits', async () => {
    const started = Date.now();

    await Promise.all([
      service.sendCustomAlert(subscriber, 'a'),
      service.sendCustomAlert(subscriber, 'b'),
      service.sendCustomAlert(subscriber, 'c'),
    ]);

    // Three sends with a 35ms spacing take at least ~70ms.
    expect(Date.now() - started).toBeGreaterThanOrEqual(60);
  });
});
