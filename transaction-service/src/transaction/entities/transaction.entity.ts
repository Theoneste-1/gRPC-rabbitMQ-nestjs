import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('transactions')
@Index(['ticketId'], { unique: true })
@Index(['plateNumber'])
@Index(['parkingCode'])
@Index(['status'])
@Index(['entryTime'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  ticketId: string;

  @Column({ type: 'varchar', length: 20 })
  plateNumber: string;

  @Column({ type: 'varchar', length: 50 })
  parkingCode: string;

  @Column({ type: 'varchar', length: 150 })
  parkingName: string;

  @Column({ type: 'timestamp' })
  entryTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  exitTime: Date | null;

  @Column({ type: 'double precision', nullable: true })
  durationHours: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  feePerHour: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
  chargedAmount: number | null;

  @Column({ type: 'varchar', length: 20, default: TransactionStatus.ACTIVE })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  attendantEntryId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  attendantExitId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
