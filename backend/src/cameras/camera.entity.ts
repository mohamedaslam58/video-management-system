import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CameraGroup } from './camera-group.entity';

export enum CameraStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export enum RecordingMode {
  CONTINUOUS = 'continuous',
  MOTION = 'motion',
  SCHEDULED = 'scheduled',
  DISABLED = 'disabled',
}

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;

  // e.g. rtsp://host:554/stream1 - credentials stored separately, encrypted
  @Column()
  rtspUrl: string;

  @Column({ nullable: true })
  rtspUsernameEnc?: string;

  @Column({ nullable: true })
  rtspPasswordEnc?: string;

  @Column({ nullable: true })
  onvifUrl: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'enum', enum: CameraStatus, default: CameraStatus.UNKNOWN })
  status: CameraStatus;

  @Column({ type: 'enum', enum: RecordingMode, default: RecordingMode.CONTINUOUS })
  recordingMode: RecordingMode;

  @Column({ default: 30 })
  retentionDays: number;

  @Column({ nullable: true })
  lastHeartbeatAt: Date;

  // "mediaPath" is the identifier MediaMTX uses for this camera's stream
  @Column({ unique: true })
  mediaPath: string;

  @ManyToOne(() => CameraGroup, (group) => group.cameras, { nullable: true })
  group: CameraGroup;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
