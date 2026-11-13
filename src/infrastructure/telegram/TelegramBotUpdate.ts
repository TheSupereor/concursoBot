import Stripe from 'stripe';
import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { SignUpSubscriberUseCase } from '../../application/use-cases/SignUpSubscriberUseCase';
import { Context, Markup } from 'telegraf';
import { AddPreferenceUseCase } from '../../application/use-cases/addPreferenceUseCase';
import { RemovePreferenceUseCase } from '../../application/use-cases/removePreferenceUseCase';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';
import { DefineSalaryUseCase } from '../../application/use-cases/DefineSalaryUseCase';
import { GetSubscriberStatusUseCase } from '../../application/use-cases/GetSubscriberStatusUseCase';
import { Logger } from '@nestjs/common';

@Update()
export class TelegramBotUpdate {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });

  constructor(
    private readonly signUpSubscriberUseCase: SignUpSubscriberUseCase,
    private readonly addPreferenceUseCase: AddPreferenceUseCase,
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly removePreferenceUseCase: RemovePreferenceUseCase,
    private readonly defineSalaryUseCase: DefineSalaryUseCase,
    private readonly getSubscriberStatusUseCase: GetSubscriberStatusUseCase,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const telegramId = ctx.from.id.toString();
    const nome = ctx.from.first_name;

    try {
      await this.signUpSubscriberUseCase.execute(telegramId);

      await ctx.reply(
        `Olá, ${nome}! Bem-vindo ao Radar de Concursos. 🎯\n\n` +
          `Eu sou um bot focado em não deixar você perder o edital da sua vida.\n\n` +
          `Para começar, use o comando /filtros para me dizer quais vagas você está buscando.`,
      );
    } catch (error) {
      console.error('Erro ao processar /start', error);
      await ctx.reply(
        'Ops, tive um problema interno. Tente novamente em alguns minutos.',
      );
    }
  }

  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    const telegramId = ctx.from.id.toString();

    try {
      const status = await this.getSubscriberStatusUseCase.execute(telegramId);

      if (!status.exists) {
        await ctx.reply(
          'Você ainda não está cadastrado. Use /start para começar.',
        );
        return;
      }

      const assinaturaLabel = status.isActive ? '✅ Ativa' : '❌ Inativa';
      const areaEmoji: Record<string, string> = {
        TI: '💻',
        SAUDE: '🏥',
        EDUCACAO: '📚',
        TRIBUNAIS: '⚖️',
        POLICIAL: '🚔',
      };

      let prefsText: string;
      if (status.preferences.length === 0) {
        prefsText = '_Nenhuma área cadastrada_';
      } else {
        prefsText = status.preferences
          .map((pref) => {
            const emoji = areaEmoji[pref.area] ?? '📌';
            const regionLabel = pref.region === 'BR' ? 'Nacional' : pref.region;
            const salaryLabel =
              pref.minimumSalary === 0
                ? 'qualquer salário'
                : `R$ ${pref.minimumSalary.toLocaleString('pt-BR')}+`;
            return `  ${emoji} *${pref.area}* — ${regionLabel} (${salaryLabel})`;
          })
          .join('\n');
      }

      const totalPrefs = status.preferences.length;
      const message =
        `📊 *Seu Radar de Concursos*\n\n` +
        `Assinatura: ${assinaturaLabel}\n` +
        `Áreas monitoradas: *${totalPrefs}/5*\n\n` +
        `${prefsText}\n\n` +
        `Use /areas para adicionar · /minhas\\_areas para remover · /salario para filtrar`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Erro ao buscar status', error);
      await ctx.reply(
        'Não consegui carregar seu status agora. Tente novamente.',
      );
    }
  }

  @Command('areas')
  async onFilters(@Ctx() ctx: Context) {
    // Markup.inlineKeyboard desenha os botões.
    // O primeiro parâmetro do botão é o Texto (visível), o segundo é o Callback Data (oculto)
    const teclado = Markup.inlineKeyboard([
      [
        Markup.button.callback('💻 T.I.', 'add_area_TI'),
        Markup.button.callback('⚖️ Tribunais', 'add_area_TRIBUNAIS'),
      ],
      [
        Markup.button.callback('🏥 Saúde', 'add_area_SAUDE'),
        Markup.button.callback('📚 Educação', 'add_area_EDUCACAO'),
      ],
      [Markup.button.callback('🚔 Carreiras Policiais', 'add_area_POLICIAL')],
    ]);

    await ctx.reply(
      'Selecione uma área de interesse para adicionar ao seu radar:',
      teclado,
    );
  }

  @Action(/add_area_(.+)/)
  async onSelectedArea(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const selectedArea = ctx.match[1];

    await ctx.answerCbQuery();

    const regionKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🇧🇷 Nacional', `pick_region:${selectedArea}:BR`),
        Markup.button.callback('SP', `pick_region:${selectedArea}:SP`),
      ],
      [
        Markup.button.callback('RJ', `pick_region:${selectedArea}:RJ`),
        Markup.button.callback('MG', `pick_region:${selectedArea}:MG`),
      ],
      [
        Markup.button.callback('RS', `pick_region:${selectedArea}:RS`),
        Markup.button.callback('PR', `pick_region:${selectedArea}:PR`),
      ],
      [
        Markup.button.callback('BA', `pick_region:${selectedArea}:BA`),
        Markup.button.callback('DF', `pick_region:${selectedArea}:DF`),
      ],
      [
        Markup.button.callback('CE', `pick_region:${selectedArea}:CE`),
        Markup.button.callback('GO', `pick_region:${selectedArea}:GO`),
      ],
    ]);

    await ctx.reply(
      `Área *${selectedArea}* selecionada. Agora escolha a região:`,
      { parse_mode: 'Markdown', ...regionKeyboard },
    );
  }

  @Action(/pick_region:([^:]+):(.+)/)
  async onRegionSelected(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = ctx.from.id.toString();
    const area = ctx.match[1];
    const region = ctx.match[2];

    try {
      await this.addPreferenceUseCase.execute(telegramId, area, region);

      const regionLabel = region === 'BR' ? 'Nacional' : region;
      await ctx.answerCbQuery('Preferência adicionada!');
      await ctx.editMessageText(
        `✅ Adicionado: *${area}* — *${regionLabel}*\n\nSempre que um edital dessa área e região aparecer, eu te aviso.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error(error);
      await ctx.answerCbQuery(
        error instanceof Error
          ? error.message
          : 'Erro ao adicionar preferência.',
        { show_alert: true },
      );
    }
  }

  @Command('minhas_areas')
  async onMinhasAreas(@Ctx() ctx: Context) {
    const telegramId = ctx.from.id.toString();
    const subscriber =
      await this.subscriberRepository.searchByTelegramId(telegramId);

    if (!subscriber || subscriber.getPreferences().length === 0) {
      await ctx.reply(
        'Você ainda não tem nenhuma área no seu radar. Use /areas para adicionar.',
      );
      return;
    }

    const preferencias = subscriber.getPreferences();

    // Vamos criar um botão com um "❌" para CADA área que o usuário tem salva
    const buttons = preferencias.map((pref) => {
      return [
        Markup.button.callback(`Remover ${pref.area}`, `del_area_${pref.area}`),
      ];
    });

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.reply(
      'Aqui estão as áreas no seu radar. Clique em uma para remover:',
      keyboard,
    );
  }

  // 2. A Action que escuta o clique no botão de excluir
  @Action(/del_area_(.+)/)
  async onAreaRemovida(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = ctx.from.id.toString();
    const areaParaRemover = ctx.match[1];

    try {
      await this.removePreferenceUseCase.execute(telegramId, areaParaRemover);

      // Responde ao callback para tirar o ícone de reloginho do botão
      await ctx.answerCbQuery('Área removida com sucesso!');

      // Edita a mensagem original ou manda uma nova
      await ctx.editMessageText(
        `✅ A área **${areaParaRemover}** foi removida do seu radar.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error(error);
      await ctx.answerCbQuery('Erro ao remover a área.', { show_alert: true });
    }
  }

  @Command('assinar')
  async onAssinar(@Ctx() ctx: Context) {
    const telegramId = ctx.from.id.toString();

    try {
      // Cria uma sessão de checkout no Stripe
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            // Você cria esse "Price ID" lá no painel do Stripe (ex: R$ 49,90/mês)
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        // O SEGREDO ESTÁ AQUI: Enviamos o ID do Telegram de forma oculta
        client_reference_id: telegramId,
        success_url: 'https://seusite.com/sucesso', // Uma página simples de "Obrigado"
        cancel_url: 'https://seusite.com/cancelado',
        metadata: {
          telegramId: telegramId, // O Stripe vai grudar essa informação na assinatura para sempre
        },
      });

      await ctx.reply(
        `💳 *Ative seu Radar Premium!*\n\n` +
          `Para começar a receber as notificações em tempo real, conclua sua assinatura no link seguro abaixo:\n\n` +
          `👉 [Clique aqui para assinar](${session.url})`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error('Erro ao gerar link do Stripe:', error);
      await ctx.reply(
        'Ops, não consegui gerar seu link de pagamento agora. Tente novamente mais tarde.',
      );
    }
  }

  @Command('salario')
  async onSalary(@Ctx() ctx: Context) {
    const teclado = Markup.inlineKeyboard([
      [
        Markup.button.callback('Qualquer Valor', 'set_salario_0'),
        Markup.button.callback('R$ 3.000+', 'set_salario_3000'),
      ],
      [
        Markup.button.callback('R$ 5.000+', 'set_salario_5000'),
        Markup.button.callback('R$ 10.000+', 'set_salario_10000'),
      ],
      [
        Markup.button.callback(
          'R$ 15.000+ (Alto Escalão)',
          'set_salario_15000',
        ),
      ],
    ]);

    await ctx.reply(
      '💸 *Filtro de Salário*\n\nSelecione o piso salarial desejado. Só enviaremos vagas que paguem acima deste valor:',
      { reply_markup: teclado.reply_markup, parse_mode: 'Markdown' },
    );
  }

  // 2. A Action que captura o clique
  @Action(/set_salario_(\d+)/)
  async onSalaryDefine(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = ctx.from.id.toString();
    const valorEscolhido = parseInt(ctx.match[1], 10); // Extrai o número do callback

    try {
      await this.defineSalaryUseCase.execute(telegramId, valorEscolhido);

      const textoSalario =
        valorEscolhido === 0
          ? 'Qualquer valor'
          : `Acima de R$ ${valorEscolhido},00`;

      await ctx.answerCbQuery('Salário atualizado!');
      await ctx.editMessageText(
        `✅ Feito! Seu radar agora só buscará vagas com salário: **${textoSalario}**`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      Logger.error(error);
      await ctx.answerCbQuery('Erro ao atualizar salário.', {
        show_alert: true,
      });
    }
  }
}
