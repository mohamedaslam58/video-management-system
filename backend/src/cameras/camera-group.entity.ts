import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Camera } from './camera.entity';

@Entity('camera_groups')
export class CameraGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Camera, (camera) => camera.group)
  cameras: Camera[];
}
