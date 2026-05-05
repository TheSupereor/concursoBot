import { Injectable } from '@nestjs/common';
import { INotificationService } from '../../domain/ports/INotificationService';
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
    this.limiter.on('dropped', () => console.warn('[Telegram] Requisição dropada pelo limiter!'));
  }

  async sendVacancyAlert(subscriber: Subscriber, vacancy: Vacancy): Promise<void> {
    // Monta a mensagem bonitinha para o usuário
    const mensagem = `
🚨 **Novo Edital Encontrado!** 🚨

**Cargo:** ${vacancy.job}
**Área:** ${vacancy.area}
**Região:** ${vacancy.region}
**Salário:** R$ ${vacancy.salary.value.toFixed(2)}

Acesse o portal para mais detalhes.
    `;

    try {
      // Aqui está a mágica! Em vez de chamar o axios direto, nós agendamos (schedule) a chamada.
      // Se chegarem 5000 pedidos de uma vez, o Bottleneck enfileira e solta 1 a cada 35ms.
      await this.limiter.schedule(() => 
        axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          chat_id: subscriber.telegramId,
          text: mensagem,
          parse_mode: 'Markdown'
        })
      );
      
      console.log(`[Telegram] Alerta enviado para ${subscriber.telegramId}`);
    } catch (error) {
      console.error(`Falha ao enviar mensagem para ${subscriber.telegramId}`, error);
      // Aqui entraria a lógica de mandar para a DLQ (Dead Letter Queue) do RabbitMQ e Retry
    }
  }

  async sendCustomAlert(subscriber: Subscriber, text: string): Promise<void> {
    try {
      // Aqui está a mágica! Em vez de chamar o axios direto, nós agendamos (schedule) a chamada.
      // Se chegarem 5000 pedidos de uma vez, o Bottleneck enfileira e solta 1 a cada 35ms.
      await this.limiter.schedule(() => 
        axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          chat_id: subscriber.telegramId,
          text: text,
          parse_mode: 'Markdown'
        })
      );
      
      console.log(`[Telegram] Alerta customizado enviado para ${subscriber.telegramId}`);
    } catch (error) {
      console.error(`Falha ao enviar mensagem para ${subscriber.telegramId}`, error);
      // Aqui entraria a lógica de mandar para a DLQ (Dead Letter Queue) do RabbitMQ e Retry
    }
  }
}