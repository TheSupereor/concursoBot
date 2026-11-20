import { Logger } from '@nestjs/common';
import axios from 'axios';
import { Telegraf } from 'telegraf';
import { AppConfig } from '../../shared/config/app.config';
import { DlqMonitorService } from './dlq-monitor.service';

jest.mock('axios');
const get = axios.get as jest.Mock;
(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
  (error: { isAxiosError?: boolean }) => error.isAxiosError === true,
);

const config = (adminId: string | undefined): AppConfig =>
  ({
    rabbitmq: {
      managementUrl: 'http://rabbit.test:15672',
      user: 'monitor',
      password: 'secret',
    },
    telegram: { adminId },
  }) as unknown as AppConfig;

describe('DlqMonitorService', () => {
  let sendMessage: jest.Mock;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  const monitor = (adminId: string | null = '999') =>
    new DlqMonitorService(config(adminId ?? undefined), {
      telegram: { sendMessage },
    } as unknown as Telegraf);

  const queueHas = (messages: number) =>
    get.mockResolvedValue({ data: { messages_ready: messages } });

  beforeEach(() => {
    get.mockReset();
    sendMessage = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('is opt-in: without an admin chat it does not even look at the queue', async () => {
    await monitor(null).checkDlq();

    expect(get).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('reads the dead-letter queue from the management API with the configured credentials', async () => {
    queueHas(0);

    await monitor().checkDlq();

    expect(get).toHaveBeenCalledWith(
      'http://rabbit.test:15672/api/queues/%2F/concursos.dlq',
      { auth: { username: 'monitor', password: 'secret' } },
    );
  });

  it('stays quiet while the queue is empty', async () => {
    queueHas(0);

    await monitor().checkDlq();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('alerts the admin, in plain text, when dead letters appear', async () => {
    queueHas(3);

    await monitor().checkDlq();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, extra] = sendMessage.mock.calls[0] as [
      string,
      string,
      unknown,
    ];
    expect(chatId).toBe('999');
    expect(text).toContain('3');
    expect(text).toContain('concursos.dlq');
    // No parse mode: nothing in the message may be read as markup.
    expect(extra).toBeUndefined();
  });

  it('does not repeat the alert while the count has not grown', async () => {
    const m = monitor();
    queueHas(3);

    await m.checkDlq();
    await m.checkDlq();
    await m.checkDlq();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('alerts again when more messages arrive', async () => {
    const m = monitor();
    queueHas(3);
    await m.checkDlq();

    queueHas(5);
    await m.checkDlq();

    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('alerts again after the queue was emptied and filled again', async () => {
    const m = monitor();
    queueHas(2);
    await m.checkDlq();
    queueHas(0);
    await m.checkDlq();

    queueHas(1);
    await m.checkDlq();

    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('treats a missing count as an empty queue', async () => {
    get.mockResolvedValue({ data: {} });

    await monitor().checkDlq();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('only warns when the management API is down, and never throws', async () => {
    get.mockRejectedValue({ isAxiosError: true, code: 'ECONNREFUSED' });

    await expect(monitor().checkDlq()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('logs any other failure as an error, and never throws', async () => {
    get.mockRejectedValue(new Error('unexpected'));

    await expect(monitor().checkDlq()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });

  it('does not throw when the alert itself cannot be sent', async () => {
    queueHas(2);
    sendMessage.mockRejectedValue(new Error('telegram unreachable'));

    await expect(monitor().checkDlq()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });
});
