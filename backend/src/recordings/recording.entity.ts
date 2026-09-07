import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Camera } from '../cameras/camera.entity';

@Entity('recording_segments')
@Unique(['cameraId', 'storageKey'])
export class RecordingSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Camera, { onDelete: 'CASCADE' })
  camera: Camera;

  @Column()
  cameraId: string;

  @Index()
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Index()
  @Column({ type: 'timestamptz' })
  endTime: Date;

  // Object key within the S3/MinIO bucket
  @Column()
  storageKey: string;

  // Key of a small JPEG keyframe thumbnail for this segment, used to render
  // a visual scrubber on the Playback timeline instead of a plain time list.
  @Column({ nullable: true })
  thumbnailKey: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ nullable: true })
  checksum: string;

  @Column({ default: 'motion' })
  trigger: 'continuous' | 'motion' | 'manual';

  @CreateDateColumn()
  createdAt: Date;
}
