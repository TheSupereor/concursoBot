import axios from 'axios';
import { Subscriber } from '../../domain/entities/subscriber';
import { Vacancy } from '../../domain/entities/vacancy';
import { Salary } from '../../domain/value-objects/salary';
import { TelegramNotificationService } from './telegram-notification.service';

jest.mock('axios');
const post = axios.post as jest.Mock;

describe('TelegramNotificationService', () => {
  const subscriber = new Subscriber('42', true);
  const vacancy = new Vacancy('v1', 'Dev <b>', 'TI', 'SP', new Salary(5000));
  let service: TelegramNotificationService;

  beforeEach(() => {
    post.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new TelegramNotificationService();
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends vacancy alerts as escaped HTML', async () => {
    post.mockResolvedValue({ data: { ok: true } });

    const result = await service.sendVacancyAlert(subscriber, vacancy);

    expect(result).toEqual({ status: 'sent' });
    const [, body] = post.mock.calls[0];
    expect(body.chat_id).toBe('42');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('Dev &lt;b&gt;');
  });

  it('sends custom alerts as plain text so they can never be misparsed', async () => {
    post.mockResolvedValue({ data: { ok: true } });

    await service.sendCustomAlert(subscriber, 'use /assinar *now* <b>');

    const [, body] = post.mock.calls[0];
    expect(body.text).toBe('use /assinar *now* <b>');
    expect(body).not.toHaveProperty('parse_mode');
  });

  it('reports a blocked recipient instead of throwing', async () => {
    post.mockRejectedValue({ response: { status: 403 } });

    await expect(
      service.sendVacancyAlert(subscriber, vacancy),
    ).resolves.toEqual({ status: 'blocked' });
  });

  it('does not leak the bot token in logs when a request fails', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'SECRET-TOKEN';
    const leaky = new TelegramNotificationService();
    post.mockRejectedValue({
      message: 'Request failed for https://api.telegram.org/botSECRET-TOKEN/x',
      response: { status: 500 },
    });

    await leaky.sendVacancyAlert(subscriber, vacancy);

    const logged = JSON.stringify((console.error as jest.Mock).mock.calls);
    expect(logged).not.toContain('SECRET-TOKEN');
  });
});
