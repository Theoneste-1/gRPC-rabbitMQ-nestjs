import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailMessage } from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: this.getAuth(),
    });
  }

  async send(message: EmailMessage): Promise<void> {
    const from = this.configService.get<string>(
      'EMAIL_FROM',
      'Parking System <no-reply@parking.local>',
    );

    try {
      await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        priority: message.priority === 'critical' || message.priority === 'high' ? 'high' : 'normal',
      });
      this.logger.log(`Email sent | subject="${message.subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email | subject="${message.subject}"`, error);
      throw error;
    }
  }

  private getAuth() {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      return undefined;
    }

    return { user, pass };
  }
}
