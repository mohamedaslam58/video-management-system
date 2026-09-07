import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingSegment } from './recording.entity';
import { Camera } from '../cameras/camera.entity';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { StorageService } from './storage.service';
import { RecorderManagerService } from './recorder-manager.service';
import { MediaMtxModule } from '../streaming/mediamtx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingSegment, Camera]),
    MediaMtxModule,
  ],
  providers: [RecordingsService, StorageService, RecorderManagerService],
  controllers: [RecordingsController],
  exports: [RecordingsService],
})
export class RecordingsModule {}
