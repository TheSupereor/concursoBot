import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class PciConcursosScrapper {
  private readonly logger = new Logger(PciConcursosScrapper.name);
  private readonly publishedIds = new Set<string>();

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scrape() {
    this.logger.log('Iniciando captura de novos concursos.');

    try {
      const { data: html } = await axios.get(
        'https://www.pciconcursos.com.br/concursos/sudeste/',
      );
      const $ = cheerio.load(html);

      let published = 0;
      let skipped = 0;

      $('.caixa').each((_, element) => {
        const title = $(element).find('a').text();
        const job = $(element).find('.job').text();
        const salaryText = $(element).find('.salario').text();

        const id = Buffer.from(title + job).toString('base64');

        if (this.publishedIds.has(id)) {
          skipped++;
          return;
        }

        const vacancy = {
          id,
          job,
          area: this.identifyArea(job),
          region: 'SP',
          salary: this.extractSalary(salaryText),
        };

        this.client.emit('concursos.new', vacancy);
        this.publishedIds.add(id);
        published++;
      });

      this.logger.log(
        `Captura concluída: ${published} publicadas, ${skipped} ignoradas (já vistas).`,
      );
    } catch (error) {
      this.logger.error('Erro ao acessar portal de concursos', error);
    }
  }

  private extractSalary(texto: string): number {
    const onlyNumbers = texto.replace(/\D/g, '');
    return parseFloat(onlyNumbers) / 100 || 0;
  }

  private identifyArea(cargo: string): string {
    const upper = cargo.toUpperCase();
    if (upper.includes('TI') || upper.includes('SISTEMAS') || upper.includes('TECNOLOGIA')) return 'TI';
    if (upper.includes('SAÚDE') || upper.includes('MÉDICO') || upper.includes('ENFERMEIRO')) return 'SAUDE';
    if (upper.includes('PROFESSOR') || upper.includes('EDUCAÇÃO') || upper.includes('DOCENTE')) return 'EDUCACAO';
    if (upper.includes('POLICIAL') || upper.includes('DELEGADO') || upper.includes('AGENTE')) return 'POLICIAL';
    if (upper.includes('TRIBUNAL') || upper.includes('JUDICIÁRIO') || upper.includes('ANALISTA JUDICIÁRIO')) return 'TRIBUNAIS';
    return 'Geral';
  }
}
