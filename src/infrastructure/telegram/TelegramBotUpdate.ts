import Stripe from 'stripe';
import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import { SignUpSubscriberUseCase } from '../../application/use-cases/SignUpSubscriberUseCase';
import { Context, Markup } from 'telegraf';
import { AddPreferenceUseCase } from '../../application/use-cases/addPreferenceUseCase';
import { RemovePreferenceUseCase } from '../../application/use-cases/removePreferenceUseCase';
import { ISubscriberRepository } from '../../domain/ports/ISubscriberRepository';

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

  // O Action que ESCUTA o clique nos botões
  // Usamos uma Expressão Regular (Regex) para pegar qualquer botão que comece com 'add_area_'
  @Action(/add_area_(.+)/)
  async onSelectedArea(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const telegramId = ctx.from.id.toString();

    // O match[1] captura exatamente o que vem depois do 'add_area_' (ex: TI, SAUDE)
    const selectedArea = ctx.match[1];

    try {
      // Executa a regra de negócio
      await this.addPreferenceUseCase.execute(telegramId, selectedArea);

      // O Telegram exige que respondamos a chamada do botão (answerCbQuery)
      // para que o ícone de "carregando" no botão do usuário desapareça
      await ctx.answerCbQuery(`Área ${selectedArea} adicionada!`);

      // Avisamos no chat que deu certo
      await ctx.reply(
        `Feito! Adicionei a área **${selectedArea}** no seu radar.\n\nSempre que um edital dessa área sair, eu te aviso aqui.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error(error);
      await ctx.answerCbQuery(
        'Erro ao adicionar preferência. Verifique se você não atingiu o limite.',
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
}
