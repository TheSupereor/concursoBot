import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { AppConfig } from '../shared/config/app.config';
import { APP_CONFIG, NOTIFICATION_SERVICE } from '../shared/tokens';
import { TelegramNotificationService } from '../infrastructure/telegram/telegram-notification.service';

/** The single Telegraf client and the adapter that implements the notification port. */
@Module({
  imports: [
    TelegrafModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        token: config.telegram.botToken,
        // Lets tests and local development point the bot at a fake Bot API server.
        options: config.telegram.apiRoot
          ? { telegram: { apiRoot: config.telegram.apiRoot } }
          : {},
      }),
    }),
  ],
  providers: [
    { provide: NOTIFICATION_SERVICE, useClass: TelegramNotificationService },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class TelegramModule {}
