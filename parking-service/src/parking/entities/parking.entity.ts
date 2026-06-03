import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('parkings')
export class ParkingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique short code that identifies a parking lot.
   * Example: "KGL-001"
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ name: 'total_spaces', type: 'int' })
  totalSpaces: number;

  @Column({ name: 'available_spaces', type: 'int' })
  availableSpaces: number;

  @Column({
    name:      'fee_per_hour',
    type:      'numeric',
    precision: 10,
    scale:     2,
    transformer: {
      to:   (v: number) => v,
      from: (v: string) => parseFloat(v),   // postgres returns numeric as string
    },
  })
  feePerHour: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}