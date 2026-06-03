import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingTransactionEntity } from '../entities/parking-transaction.entity';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQConsumer {
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(ParkingTransactionEntity)
    private readonly transactionRepo: Repository<ParkingTransactionEntity>,
  ) {}

  async connect(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.consumeCarEntered();
      await this.consumeCarExited();

      this.logger.log('Connected to RabbitMQ and consumers started');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      // Retry after delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async consumeCarEntered(): Promise<void> {
    if (!this.channel) return;

    const exchange = 'parking_events';
    const queue = 'reporting_car_entered';
    const routingKey = 'car.entered';

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        await this.handleCarEntered(event);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error('Error processing car.entered event', error);
        this.channel?.nack(msg, false, true);
      }
    });
  }

  private async consumeCarExited(): Promise<void> {
    if (!this.channel) return;

    const exchange = 'parking_events';
    const queue = 'reporting_car_exited';
    const routingKey = 'car.exited';

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        await this.handleCarExited(event);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error('Error processing car.exited event', error);
        this.channel?.nack(msg, false, true);
      }
    });
  }

  private async handleCarEntered(event: any): Promise<void> {
    const { transactionId, plateNumber, parkingCode, parkingName, entryTime } =
      event;

    const transaction = this.transactionRepo.create({
      transactionId,
      plateNumber,
      parkingCode,
      parkingName,
      entryTime: new Date(entryTime),
      status: 'active',
    });

    await this.transactionRepo.save(transaction);
    this.logger.log(`Recorded car entry: ${plateNumber} at ${parkingCode}`);
  }

  private async handleCarExited(event: any): Promise<void> {
    const {
      transactionId,
      plateNumber,
      parkingCode,
      exitTime,
      durationHours,
      chargedAmount,
    } = event;

    const transaction = await this.transactionRepo.findOne({
      where: { transactionId },
    });

    if (transaction) {
      transaction.exitTime = new Date(exitTime);
      transaction.durationHours = durationHours;
      transaction.chargedAmount = chargedAmount;
      transaction.status = 'completed';
      await this.transactionRepo.save(transaction);
      this.logger.log(`Recorded car exit: ${plateNumber} from ${parkingCode}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.log('Disconnected from RabbitMQ');
  }
}
