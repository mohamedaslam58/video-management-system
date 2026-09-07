import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Camera } from '../cameras/camera.entity';

export enum EventType {
  MOTION = 'motion',
  TAMPER = 'tamper',
  CAMERA_OFFLINE = 'camera_offline',
  CAMERA_ONLINE = 'camera_online',
  DISK_FULL = 'disk_full',
  MANUAL_BOOKMARK = 'manual_bookmark',
}

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Camera, { nullable: true, onDelete: 'CASCADE' })
  camera: Camera;

  @Column({ nullable: true })
  cameraId: string;

  @Index()
  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @Index()
  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ nullable: true })
  acknowledgedByUserId: string;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
