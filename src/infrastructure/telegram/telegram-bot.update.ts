import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { SignUpSubscriberUseCase } from '../../application/use-cases/sign-up-subscriber.use-case';
import { Context, Markup } from 'telegraf';
import { AddPreferenceUseCase } from '../../application/use-cases/add-preference.use-case';
import { RemovePreferenceUseCase } from '../../application/use-cases/remove-preference.use-case';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { DefineSalaryUseCase } from '../../application/use-cases/define-salary.use-case';
import { GetSubscriberStatusUseCase } from '../../application/use-cases/get-subscriber-status.use-case';
import { Inject, Logger } from '@nestjs/common';
import { MAX_PREFERENCES } from '../../domain/entities/subscriber';
import { SALARY_OPTIONS, callbackData, callbackPattern } from './callback-data';
import { userMessageFor } from './user-messages';
import { StripeClient } from '../billing/stripe-types';
import { AppConfig } from '../../shared/config/app.config';
import {
  APP_CONFIG,
  STRIPE_CLIENT,
  SUBSCRIBER_REPOSITORY,
} from '../../shared/tokens';
import { buildCheckoutSessionParams } from '../billing/checkout-session';

/** Updates without a sender (for example channel posts) cannot be attributed to a subscriber. */
const senderId = (ctx: Context): string | undefined => ctx.from?.id.toString();

@Update()
export class TelegramBotUpdate {
  private readonly logger = new Logger(TelegramBotUpdate.name);
  constructor(
    private readonly signUpSubscriberUseCase: SignUpSubscriberUseCase,
    private readonly addPreferenceUseCase: AddPreferenceUseCase,
    @Inject(SUBSCRIBER_REPOSITORY)
    private readonly subscriberRepository: ISubscriberRepository,
    private readonly removePreferenceUseCase: RemovePreferenceUseCase,
    private readonly defineSalaryUseCase: DefineSalaryUseCase,
    private readonly getSubscriberStatusUseCase: GetSubscriberStatusUseCase,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;
    const nome = ctx.from?.first_name ?? '';

    try {
      await this.signUpSubscriberUseCase.execute(telegramId);

      await ctx.reply(
        `Olá, ${nome}! Bem-vindo ao Radar de Concursos. 🎯\n\n` +
          `Eu sou um bot focado em não deixar você perder o edital da sua vida.\n\n` +
          `Para começar, use o comando /areas para me dizer quais vagas você está buscando.`,
      );
    } catch (error) {
      this.logger.error('Failed to handle /start', error);
      await ctx.reply(
        'Ops, tive um problema interno. Tente novamente em alguns minutos.',
      );
    }
  }

  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;

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
        `Áreas monitoradas: *${totalPrefs}/${MAX_PREFERENCES}*\n\n` +
        `${prefsText}\n\n` +
        `Use /areas para adicionar · /minhas\\_areas para remover · /salario para filtrar`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Failed to load the subscriber status', error);
      await ctx.reply(
        'Não consegui carregar seu status agora. Tente novamente.',
      );
    }
  }

  @Command('areas')
  async onFilters(@Ctx() ctx: Context) {
    // The first argument of a button is the visible text, the second the data sent back.
    const teclado = Markup.inlineKeyboard([
      [
        Markup.button.callback('💻 T.I.', callbackData.addArea('TI')),
        Markup.button.callback(
          '⚖️ Tribunais',
          callbackData.addArea('TRIBUNAIS'),
        ),
      ],
      [
        Markup.button.callback('🏥 Saúde', callbackData.addArea('SAUDE')),
        Markup.button.callback('📚 Educação', callbackData.addArea('EDUCACAO')),
      ],
      [
        Markup.button.callback(
          '🚔 Carreiras Policiais',
          callbackData.addArea('POLICIAL'),
        ),
      ],
    ]);

    await ctx.reply(
      'Selecione uma área de interesse para adicionar ao seu radar:',
      teclado,
    );
  }

  @Action(callbackPattern.addArea)
  async onSelectedArea(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const [, selectedArea] = ctx.match;
    if (!selectedArea) return;

    await ctx.answerCbQuery();

    const region = (code: string, label = code) =>
      Markup.button.callback(
        label,
        callbackData.pickRegion(selectedArea, code),
      );
    const regionKeyboard = Markup.inlineKeyboard([
      [region('BR', '🇧🇷 Nacional'), region('SP')],
      [region('RJ'), region('MG')],
      [region('RS'), region('PR')],
      [region('BA'), region('DF')],
      [region('CE'), region('GO')],
    ]);

    await ctx.reply(
      `Área *${selectedArea}* selecionada. Agora escolha a região:`,
      {
        parse_mode: 'Markdown',
        reply_markup: regionKeyboard.reply_markup,
      },
    );
  }

  @Action(callbackPattern.pickRegion)
  async onRegionSelected(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;
    const [, area, region] = ctx.match;
    if (!area || !region) return;

    try {
      await this.addPreferenceUseCase.execute(telegramId, area, region);

      const regionLabel = region === 'BR' ? 'Nacional' : region;
      await ctx.answerCbQuery('Preferência adicionada!');
      await ctx.editMessageText(
        `✅ Adicionado: *${area}* — *${regionLabel}*\n\nSempre que um edital dessa área e região aparecer, eu te aviso.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(error);
      await ctx.answerCbQuery(userMessageFor(error), { show_alert: true });
    }
  }

  @Command('minhas_areas')
  async onMinhasAreas(@Ctx() ctx: Context) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;
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
        Markup.button.callback(
          `Remover ${pref.area} — ${pref.region}`,
          callbackData.removePreference(pref.area, pref.region),
        ),
      ];
    });

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.reply(
      'Aqui estão as áreas no seu radar. Clique em uma para remover:',
      keyboard,
    );
  }

  // 2. A Action que escuta o clique no botão de excluir
  @Action(callbackPattern.removePreference)
  async onAreaRemovida(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;
    const [, areaToRemove, regionToRemove] = ctx.match;
    if (!areaToRemove || !regionToRemove) return;

    try {
      await this.removePreferenceUseCase.execute(
        telegramId,
        areaToRemove,
        regionToRemove,
      );

      // Responde ao callback para tirar o ícone de reloginho do botão
      await ctx.answerCbQuery('Área removida com sucesso!');

      // Edita a mensagem original ou manda uma nova
      await ctx.editMessageText(
        `✅ ${areaToRemove} — ${regionToRemove} foi removida do seu radar.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(error);
      await ctx.answerCbQuery(userMessageFor(error), { show_alert: true });
    }
  }

  @Command('assinar')
  async onAssinar(@Ctx() ctx: Context) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;

    try {
      // Cria uma sessão de checkout no Stripe
      const session = await this.stripe.checkout.sessions.create(
        buildCheckoutSessionParams({
          telegramId,
          priceId: this.config.stripe.priceId,
          successUrl: this.config.stripe.successUrl,
          cancelUrl: this.config.stripe.cancelUrl,
        }),
      );

      await ctx.reply(
        `💳 *Ative seu Radar Premium!*\n\n` +
          `Para começar a receber as notificações em tempo real, conclua sua assinatura no link seguro abaixo:\n\n` +
          `👉 [Clique aqui para assinar](${session.url})`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Failed to create the Stripe checkout link', error);
      await ctx.reply(
        'Ops, não consegui gerar seu link de pagamento agora. Tente novamente mais tarde.',
      );
    }
  }

  @Command('salario')
  async onSalary(@Ctx() ctx: Context) {
    const labels: Record<(typeof SALARY_OPTIONS)[number], string> = {
      0: 'Qualquer Valor',
      3000: 'R$ 3.000+',
      5000: 'R$ 5.000+',
      10000: 'R$ 10.000+',
      15000: 'R$ 15.000+ (Alto Escalão)',
    };
    const teclado = Markup.inlineKeyboard(
      SALARY_OPTIONS.map((value) => [
        Markup.button.callback(labels[value], callbackData.setSalary(value)),
      ]),
    );

    await ctx.reply(
      '💸 *Filtro de Salário*\n\nSelecione o piso salarial desejado. Só enviaremos vagas que paguem acima deste valor:',
      { reply_markup: teclado.reply_markup, parse_mode: 'Markdown' },
    );
  }

  // 2. A Action que captura o clique
  @Action(callbackPattern.setSalary)
  async onSalaryDefine(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = senderId(ctx);
    if (!telegramId) return;
    const valorEscolhido = parseInt(ctx.match[1] ?? '', 10);
    if (Number.isNaN(valorEscolhido)) return;

    try {
      await this.defineSalaryUseCase.execute(telegramId, valorEscolhido);

      const textoSalario =
        valorEscolhido === 0
          ? 'Qualquer valor'
          : `Acima de R$ ${valorEscolhido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      await ctx.answerCbQuery('Salário atualizado!');
      await ctx.editMessageText(
        `✅ Feito! Seu radar agora só buscará vagas com salário: *${textoSalario}*`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error(error);
      await ctx.answerCbQuery(userMessageFor(error), { show_alert: true });
    }
  }
}
