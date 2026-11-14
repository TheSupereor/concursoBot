import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class DlqMonitorService {
  private readonly logger = new Logger(DlqMonitorService.name);
  private lastAlertedCount = 0;

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkDlq() {
    const managementUrl =
      process.env.RABBITMQ_MANAGEMENT_URL || 'http://localhost:15672';
    const user = process.env.RABBITMQ_USER || 'guest';
    const password = process.env.RABBITMQ_PASSWORD || 'guest';
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const dlqName = 'concursos.dlq';

    if (!adminTelegramId || !botToken) {
      return;
    }

    try {
      const { data } = await axios.get(
        `${managementUrl}/api/queues/%2F/${dlqName}`,
        { auth: { username: user, password } },
      );

      const messageCount: number = data.messages_ready ?? 0;

      if (messageCount > this.lastAlertedCount) {
        await this.sendAdminAlert(
          botToken,
          adminTelegramId,
          `⚠️ *DLQ Alert — ${dlqName}*\n\n` +
            `Mensagens aguardando: *${messageCount}*\n\n` +
            `Acesse o painel do RabbitMQ para inspecionar e reprocessar:\n` +
            `${managementUrl}`,
        );
        this.logger.warn(
          `DLQ alerta enviado: ${messageCount} mensagens em ${dlqName}`,
        );
      }

      this.lastAlertedCount = messageCount;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        this.logger.warn(
          'RabbitMQ Management API indisponível — monitoramento de DLQ ignorado.',
        );
        return;
      }
      this.logger.error('Erro ao verificar DLQ', error);
    }
  }

  private async sendAdminAlert(botToken: string, chatId: string, text: string) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  }
}
