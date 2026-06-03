import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { DomainEvent } from '../email.types';
import { EmailService } from '../email.service';
import { TemplateService } from '../templates/template.service';

@Injectable()
export class EmailEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailEventConsumer.name);
  private readonly exchange = 'parking_events';
  private readonly queue = 'notification_email_events';
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  private readonly routingKeys = [
    'user.registered',
    'email.verification.requested',
    'password.reset.requested',
    'password.reset.successful',
    'account.activated',
    'account.deactivated',
    'account.deleted',
    'account.restored',
    'login.new_device',
    'user.role.changed',
    'parking.created',
    'parking.capacity.changed',
    'parking.almost.full',
    'car.entered',
    'car.exited',
    'overstay.violation',
    'payment.failed',
    'parking.session.expiring_soon',
    'report.daily_revenue',
    'report.weekly',
    'report.monthly',
    'activity.unusual',
    'system.maintenance',
    'system.critical_error',
    'attendant.onboarded',
  ];

  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: TemplateService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      await this.channel.assertQueue(this.queue, { durable: true });

      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queue, this.exchange, routingKey);
      }

      await this.channel.consume(this.queue, async (message) => {
        if (!message) return;

        try {
          await this.handle(JSON.parse(message.content.toString()) as DomainEvent);
          this.channel?.ack(message);
        } catch (error) {
          this.logger.error('Failed to process email event', error);
          this.channel?.nack(message, false, true);
        }
      });

      this.logger.log('Email event consumer started');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async handle(event: DomainEvent): Promise<void> {
    const eventName = event.event;
    const payload = this.extractPayload(event);
    const email = this.templateService.build(eventName, payload);

    if (!email) {
      this.logger.log(`No email sent for ${eventName}; recipient or template missing`);
      return;
    }

    await this.emailService.send(email);
  }

  private extractPayload(event: DomainEvent): Record<string, unknown> {
    if (event.payload) {
      return event.payload;
    }

    const { event: _eventName, timestamp: _timestamp, payload: _payload, ...payload } = event;
    return payload;
  }
}
