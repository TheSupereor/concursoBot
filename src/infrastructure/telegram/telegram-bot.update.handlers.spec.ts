import { Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { SubscriberNotFoundError } from '../../application/errors/subscriber-not-found.error';
import { AddPreferenceUseCase } from '../../application/use-cases/add-preference.use-case';
import { DefineSalaryUseCase } from '../../application/use-cases/define-salary.use-case';
import {
  GetSubscriberStatusUseCase,
  SubscriberStatus,
} from '../../application/use-cases/get-subscriber-status.use-case';
import { RemovePreferenceUseCase } from '../../application/use-cases/remove-preference.use-case';
import { SignUpSubscriberUseCase } from '../../application/use-cases/sign-up-subscriber.use-case';
import { Subscriber } from '../../domain/entities/subscriber';
import {
  DuplicatePreferenceError,
  NoPreferencesError,
} from '../../domain/errors/domain.error';
import { ISubscriberRepository } from '../../domain/ports/subscriber-repository.port';
import { AREAS } from '../../domain/value-objects/area';
import { Preference } from '../../domain/value-objects/preference';
import { REGIONS } from '../../domain/value-objects/region';
import { Salary } from '../../domain/value-objects/salary';
import { AppConfig } from '../../shared/config/app.config';
import { callbackPattern, SALARY_OPTIONS } from './callback-data';
import { TelegramBotUpdate } from './telegram-bot.update';

interface FakeContext {
  from?: { id: number; first_name: string };
  match?: RegExpExecArray;
  reply: jest.Mock;
  answerCbQuery: jest.Mock;
  editMessageText: jest.Mock;
}

const fakeContext = (
  options: { id?: number | null; firstName?: string; match?: string[] } = {},
): FakeContext => ({
  from:
    options.id === null
      ? undefined
      : { id: options.id ?? 42, first_name: options.firstName ?? 'Ana' },
  match: options.match as RegExpExecArray | undefined,
  reply: jest.fn().mockResolvedValue(undefined),
  answerCbQuery: jest.fn().mockResolvedValue(undefined),
  editMessageText: jest.fn().mockResolvedValue(undefined),
});

const asContext = (ctx: FakeContext) =>
  ctx as unknown as Context & { match: RegExpExecArray };

/** The callback data of every button in a reply that carries an inline keyboard. */
const callbackButtons = (ctx: FakeContext): string[] => {
  const extra = ctx.reply.mock.calls[0]?.[1] as {
    reply_markup: { inline_keyboard: { callback_data: string }[][] };
  };
  return extra.reply_markup.inline_keyboard
    .flat()
    .map((button) => button.callback_data);
};

const textOf = (mock: jest.Mock, call = 0): string =>
  String(mock.mock.calls[call]?.[0]);

describe('TelegramBotUpdate handlers', () => {
  let signUp: { execute: jest.Mock };
  let addPreference: { execute: jest.Mock };
  let removePreference: { execute: jest.Mock };
  let defineSalary: { execute: jest.Mock };
  let getStatus: { execute: jest.Mock };
  let searchByTelegramId: jest.Mock;
  let createCheckout: jest.Mock;
  let error: jest.SpyInstance;
  let bot: TelegramBotUpdate;

  beforeEach(() => {
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    signUp = { execute: jest.fn().mockResolvedValue(undefined) };
    addPreference = { execute: jest.fn().mockResolvedValue(undefined) };
    removePreference = { execute: jest.fn().mockResolvedValue(undefined) };
    defineSalary = { execute: jest.fn().mockResolvedValue(undefined) };
    getStatus = { execute: jest.fn() };
    searchByTelegramId = jest.fn();
    createCheckout = jest.fn().mockResolvedValue({ url: 'https://pay.test/s' });

    bot = new TelegramBotUpdate(
      signUp as unknown as SignUpSubscriberUseCase,
      addPreference as unknown as AddPreferenceUseCase,
      { searchByTelegramId } as unknown as ISubscriberRepository,
      removePreference as unknown as RemovePreferenceUseCase,
      defineSalary as unknown as DefineSalaryUseCase,
      getStatus as unknown as GetSubscriberStatusUseCase,
      { checkout: { sessions: { create: createCheckout } } } as never,
      {
        stripe: {
          priceId: 'price_1',
          successUrl: 'https://example.test/ok',
          cancelUrl: 'https://example.test/cancel',
        },
      } as AppConfig,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('/start', () => {
    it('registers the user and greets them by name, pointing at a command that exists', async () => {
      const ctx = fakeContext({ firstName: 'Ana' });

      await bot.onStart(asContext(ctx));

      expect(signUp.execute).toHaveBeenCalledWith('42');
      expect(textOf(ctx.reply)).toContain('Ana');
      // The message once told users to type /filtros, a command that does not exist.
      expect(textOf(ctx.reply)).toContain('/areas');
      expect(textOf(ctx.reply)).not.toContain('/filtros');
    });

    it('apologises instead of crashing when something fails', async () => {
      signUp.execute.mockRejectedValue(new Error('database down'));
      const ctx = fakeContext();

      await bot.onStart(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('problema interno');
      expect(error).toHaveBeenCalled();
    });

    it('ignores an update that has no sender', async () => {
      const ctx = fakeContext({ id: null });

      await bot.onStart(asContext(ctx));

      expect(signUp.execute).not.toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });
  });

  describe('/status', () => {
    const status = (
      overrides: Partial<SubscriberStatus>,
    ): SubscriberStatus => ({
      exists: true,
      isActive: true,
      preferences: [],
      ...overrides,
    });

    it('sends an unknown user to /start', async () => {
      getStatus.execute.mockResolvedValue(status({ exists: false }));
      const ctx = fakeContext();

      await bot.onStatus(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('/start');
    });

    it('shows the subscription, the areas, the region and the salary filter', async () => {
      getStatus.execute.mockResolvedValue(
        status({
          preferences: [
            { area: 'TI', region: 'BR', minimumSalary: 5000 },
            { area: 'SAUDE', region: 'SP', minimumSalary: 0 },
          ],
        }),
      );
      const ctx = fakeContext();

      await bot.onStatus(asContext(ctx));

      const text = textOf(ctx.reply);
      expect(text).toContain('Ativa');
      expect(text).toContain('TI');
      expect(text).toContain('Nacional');
      expect(text).toContain('R$ 5.000+');
      expect(text).toContain('qualquer salário');
      expect(text).toContain('2/5');
    });

    it('shows an inactive subscription', async () => {
      getStatus.execute.mockResolvedValue(status({ isActive: false }));
      const ctx = fakeContext();

      await bot.onStatus(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('Inativa');
      expect(textOf(ctx.reply)).toContain('Nenhuma área');
    });

    it('apologises when the status cannot be loaded', async () => {
      getStatus.execute.mockRejectedValue(new Error('database down'));
      const ctx = fakeContext();

      await bot.onStatus(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('Não consegui');
    });
  });

  describe('/areas and the area buttons', () => {
    it('offers the areas people can follow, each with data the bot accepts back', async () => {
      const ctx = fakeContext();

      await bot.onFilters(asContext(ctx));

      const buttons = callbackButtons(ctx);
      expect(buttons.length).toBeGreaterThanOrEqual(5);
      for (const data of buttons) {
        expect(callbackPattern.addArea.test(data)).toBe(true);
      }
    });

    it('asks for the region after an area is chosen, with data the bot accepts back', async () => {
      const ctx = fakeContext({ match: ['add_area_TI', 'TI'] });

      await bot.onSelectedArea(asContext(ctx));

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      const buttons = callbackButtons(ctx);
      expect(buttons).toContain('pick_region:TI:BR');
      for (const data of buttons) {
        expect(callbackPattern.pickRegion.test(data)).toBe(true);
      }
    });
  });

  describe('choosing a region', () => {
    it('adds the preference and confirms', async () => {
      const ctx = fakeContext({ match: ['x', 'TI', 'BR'] });

      await bot.onRegionSelected(asContext(ctx));

      expect(addPreference.execute).toHaveBeenCalledWith('42', 'TI', 'BR');
      expect(textOf(ctx.editMessageText)).toContain('Nacional');
    });

    it('shows a state by its code', async () => {
      const ctx = fakeContext({ match: ['x', 'SAUDE', 'SP'] });

      await bot.onRegionSelected(asContext(ctx));

      expect(textOf(ctx.editMessageText)).toContain('SP');
    });

    it('explains a business error to the user as an alert', async () => {
      addPreference.execute.mockRejectedValue(
        new DuplicatePreferenceError('TI', 'BR'),
      );
      const ctx = fakeContext({ match: ['x', 'TI', 'BR'] });

      await bot.onRegionSelected(asContext(ctx));

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.stringContaining('já monitora'),
        { show_alert: true },
      );
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });

    it('never leaks an unexpected error message to the user', async () => {
      addPreference.execute.mockRejectedValue(
        new Error('ECONNREFUSED 10.0.0.5:3306'),
      );
      const ctx = fakeContext({ match: ['x', 'TI', 'BR'] });

      await bot.onRegionSelected(asContext(ctx));

      const shown = String(ctx.answerCbQuery.mock.calls[0]?.[0]);
      expect(shown).not.toContain('ECONNREFUSED');
    });

    it('ignores an update that has no sender', async () => {
      const ctx = fakeContext({ id: null, match: ['x', 'TI', 'BR'] });

      await bot.onRegionSelected(asContext(ctx));

      expect(addPreference.execute).not.toHaveBeenCalled();
    });
  });

  describe('/minhas_areas and removing', () => {
    it('tells a user with no areas how to add one', async () => {
      searchByTelegramId.mockResolvedValue(new Subscriber('42', true));
      const ctx = fakeContext();

      await bot.onMinhasAreas(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('/areas');
    });

    it('tells an unknown user the same', async () => {
      searchByTelegramId.mockResolvedValue(null);
      const ctx = fakeContext();

      await bot.onMinhasAreas(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('/areas');
    });

    it('offers one removal button per area and region, with data the bot accepts back', async () => {
      const subscriber = new Subscriber('42', true);
      subscriber.addPreference(new Preference('TI', 'SP', new Salary(0)));
      subscriber.addPreference(new Preference('TI', 'RJ', new Salary(0)));
      searchByTelegramId.mockResolvedValue(subscriber);
      const ctx = fakeContext();

      await bot.onMinhasAreas(asContext(ctx));

      const buttons = callbackButtons(ctx);
      expect(buttons).toEqual(['del_pref:TI:SP', 'del_pref:TI:RJ']);
      for (const data of buttons) {
        expect(callbackPattern.removePreference.test(data)).toBe(true);
      }
    });

    it('removes only the chosen area and region and confirms', async () => {
      const ctx = fakeContext({ match: ['x', 'TI', 'SP'] });

      await bot.onAreaRemovida(asContext(ctx));

      expect(removePreference.execute).toHaveBeenCalledWith('42', 'TI', 'SP');
      expect(textOf(ctx.editMessageText)).toContain('TI — SP');
    });

    it('explains a failure to remove', async () => {
      removePreference.execute.mockRejectedValue(
        new SubscriberNotFoundError('42'),
      );
      const ctx = fakeContext({ match: ['x', 'TI', 'SP'] });

      await bot.onAreaRemovida(asContext(ctx));

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.stringContaining('/start'),
        { show_alert: true },
      );
    });
  });

  describe('/assinar', () => {
    it('creates a checkout for this user and sends the payment link', async () => {
      const ctx = fakeContext();

      await bot.onAssinar(asContext(ctx));

      const params = createCheckout.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(params.client_reference_id).toBe('42');
      expect(params.line_items).toEqual([{ price: 'price_1', quantity: 1 }]);
      expect(params.success_url).toBe('https://example.test/ok');
      expect(textOf(ctx.reply)).toContain('https://pay.test/s');
    });

    it('apologises, without a link, when Stripe fails', async () => {
      createCheckout.mockRejectedValue(new Error('stripe is down'));
      const ctx = fakeContext();

      await bot.onAssinar(asContext(ctx));

      expect(textOf(ctx.reply)).toContain('não consegui gerar');
      expect(textOf(ctx.reply)).not.toContain('http');
    });
  });

  describe('/salario and the salary buttons', () => {
    it('offers exactly the amounts the bot accepts back', async () => {
      const ctx = fakeContext();

      await bot.onSalary(asContext(ctx));

      const buttons = callbackButtons(ctx);
      expect(buttons).toHaveLength(SALARY_OPTIONS.length);
      for (const data of buttons) {
        expect(callbackPattern.setSalary.test(data)).toBe(true);
      }
    });

    it('applies the chosen minimum and confirms it in Brazilian format', async () => {
      const ctx = fakeContext({ match: ['x', '5000'] });

      await bot.onSalaryDefine(asContext(ctx));

      expect(defineSalary.execute).toHaveBeenCalledWith('42', 5000);
      const text = textOf(ctx.editMessageText);
      expect(text).toContain('R$ 5.000,00');
      // Legacy Markdown bold uses a single asterisk; a double one is not valid markup.
      expect(text).not.toContain('**');
    });

    it('says "any value" for zero', async () => {
      const ctx = fakeContext({ match: ['x', '0'] });

      await bot.onSalaryDefine(asContext(ctx));

      expect(textOf(ctx.editMessageText)).toContain('Qualquer valor');
    });

    it('asks the user to add an area first when there is none', async () => {
      defineSalary.execute.mockRejectedValue(new NoPreferencesError());
      const ctx = fakeContext({ match: ['x', '5000'] });

      await bot.onSalaryDefine(asContext(ctx));

      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.stringContaining('pelo menos uma área'),
        { show_alert: true },
      );
    });

    it('ignores data that is not a number', async () => {
      const ctx = fakeContext({ match: ['x', undefined as unknown as string] });

      await bot.onSalaryDefine(asContext(ctx));

      expect(defineSalary.execute).not.toHaveBeenCalled();
    });
  });

  it('offers every region the keyboard promises as a valid one', () => {
    // The region keyboard lists states by hand; each must be a real region.
    const offered = [
      'BR',
      'SP',
      'RJ',
      'MG',
      'RS',
      'PR',
      'BA',
      'DF',
      'CE',
      'GO',
    ];
    for (const region of offered) {
      expect(REGIONS).toContain(region);
    }
    expect(AREAS.length).toBeGreaterThan(0);
  });
});
