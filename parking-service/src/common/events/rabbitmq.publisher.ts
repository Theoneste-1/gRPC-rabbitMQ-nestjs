import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private readonly exchange = 'parking_events';
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const event = {
      event: routingKey,
      timestamp: new Date().toISOString(),
      payload,
      ...payload,
    };

    try {
      if (!this.channel) {
        await this.connect();
      }

      this.channel?.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(event)),
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
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    } catch (error) {
      this.connection = null;
      this.channel = null;
      this.logger.error('Failed to connect to RabbitMQ', error);
    }
  }
}
