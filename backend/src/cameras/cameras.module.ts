import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camera } from './camera.entity';
import { CameraGroup } from './camera-group.entity';
import { CamerasService } from './cameras.service';
import { CamerasController } from './cameras.controller';
import { MediaMtxModule } from '../streaming/mediamtx.module';

@Module({
  imports: [TypeOrmModule.forFeature([Camera, CameraGroup]), MediaMtxModule],
  providers: [CamerasService],
  controllers: [CamerasController],
  exports: [CamerasService],
})
export class CamerasModule {}
