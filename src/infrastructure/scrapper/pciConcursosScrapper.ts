import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class PciConcursosScrapper {
	private readonly logger = new Logger(PciConcursosScrapper.name);

	@Cron(CronExpression.EVERY_30_MINUTES)
	async scrape() {
		this.logger.log('Iniciando captura de novos concursos.');

		try {
			const { data: html } = await axios.get('https://www.pciconcursos.com.br/concursos/sudeste/');
			const $ = cheerio.load(html);

			$('.caixa').each((i, element) => {
        const title = $(element).find('a').text(); // Ex: "Prefeitura de São Paulo"
        const job = $(element).find('.job').text(); 
        const salaryText = $(element).find('.salario').text();

        // 1. Normalização dos dados
        const numericSalary = this.extractSalary(salaryText);
        
        // 2. Criação do objeto que será enviado para o RabbitMQ
        const foundVacancy = {
          id: Buffer.from(title + job).toString('base64'), // ID gerado pelo conteúdo (Dedup)
          job: job,
          area: this.identifyArea(job),
          regiao: 'SP',
          salario: numericSalary
        };

        this.publishOnQueue(foundVacancy);
      });
    } catch (error) {
      this.logger.error('Erro ao acessar portal de concursos', error);
    }
  }

  private extractSalary(texto: string): number {
    // Lógica para converter "R$ 1.234,56" em 1234.56
    const onlyNumbers = texto.replace(/\D/g, '');
    return parseFloat(onlyNumbers) / 100 || 0;
  }

  private identifyArea(cargo: string): string {
    if (cargo.toUpperCase().includes('TI') || cargo.toUpperCase().includes('SISTEMAS')) return 'TI';
    return 'Geral';
  }

  private publishOnQueue(vaga: any) {
    // Aqui usamos o ClientProxy do NestJS para enviar para a exchange 'concursos.new'
    this.logger.log(`Vaga publicada: ${vaga.cargo}`);
  }
}