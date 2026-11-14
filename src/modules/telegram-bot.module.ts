import { Module } from '@nestjs/common';
import { TelegramBotUpdate } from '../infrastructure/telegram/telegram-bot.update';
import { BillingModule } from './billing.module';
import { PersistenceModule } from './persistence.module';
import { SubscribersModule } from './subscribers.module';

/** Entry point for Telegram commands and button callbacks. */
@Module({
  imports: [PersistenceModule, SubscribersModule, BillingModule],
  providers: [TelegramBotUpdate],
})
export class TelegramBotModule {}
