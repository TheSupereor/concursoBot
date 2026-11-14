import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './shared/config/app-config.module';
import { BillingModule } from './modules/billing.module';
import { MonitoringModule } from './modules/monitoring.module';
import { NotificationsModule } from './modules/notifications.module';
import { PersistenceModule } from './modules/persistence.module';
import { ScrapingModule } from './modules/scraping.module';
import { SubscribersModule } from './modules/subscribers.module';
import { TelegramBotModule } from './modules/telegram-bot.module';
import { TelegramModule } from './modules/telegram.module';

/** Composition root: it only wires the feature modules together. */
@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    PersistenceModule,
    TelegramModule,
    SubscribersModule,
    BillingModule,
    TelegramBotModule,
    NotificationsModule,
    ScrapingModule,
    MonitoringModule,
  ],
})
export class AppModule {}
