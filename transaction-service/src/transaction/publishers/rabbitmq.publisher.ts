import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

type DomainEvent = {
  event: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = 'parking_events';

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const event: DomainEvent = {
      event: routingKey,
      timestamp: new Date().toISOString(),
      payload,
    };
    const legacyCompatibleEvent = { ...event, ...payload };

    try {
      if (!this.channel) {
        await this.connect();
      }

      this.channel?.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(legacyCompatibleEvent)),
        { persistent: true },
      );
    } catch (error) {
      this.logger.error(`Failed to publish ${routingKey}`, error);
    }
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
      const url = process.env.RABBITMQ_URL || 'amqp://localhost';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.channel = null;
      this.connection = null;
      this.logger.error('Failed to connect to RabbitMQ', error);
    }
  }
}
