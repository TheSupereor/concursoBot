import { Module } from '@nestjs/common';
import { DlqMonitorService } from '../infrastructure/monitoring/dlq-monitor.service';

/** Operational alerts, such as dead-letter queue growth. */
@Module({ providers: [DlqMonitorService] })
export class MonitoringModule {}
