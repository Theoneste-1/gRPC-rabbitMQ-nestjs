import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('parking_transactions')
@Index(['parkingCode'])
@Index(['plateNumber'])
@Index(['entryTime'])
@Index(['exitTime'])
export class ParkingTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  transactionId: string;

  @Column({ type: 'varchar', length: 20 })
  plateNumber: string;

  @Column({ type: 'varchar', length: 20 })
  parkingCode: string;

  @Column({ type: 'varchar', length: 100 })
  parkingName: string;

  @Column({ type: 'timestamp' })
  entryTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  exitTime: Date | null;

  @Column({ type: 'double precision', nullable: true })
  durationHours: number | null;

  @Column({ type: 'double precision', nullable: true })
  chargedAmount: number | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active', 'completed', 'cancelled'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
