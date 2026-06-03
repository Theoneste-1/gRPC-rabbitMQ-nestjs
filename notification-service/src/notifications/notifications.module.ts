import { Module } from '@nestjs/common';
import { EmailEventConsumer } from './consumers/email-event.consumer';
import { EmailService } from './email.service';
import { TemplateService } from './templates/template.service';

@Module({
  providers: [EmailEventConsumer, EmailService, TemplateService],
})
export class NotificationsModule {}
