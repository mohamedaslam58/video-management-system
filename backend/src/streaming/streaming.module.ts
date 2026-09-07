import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { MediaMtxModule } from './mediamtx.module';
import { CamerasModule } from '../cameras/cameras.module';

@Module({
  imports: [MediaMtxModule, CamerasModule],
  controllers: [StreamingController],
})
export class StreamingModule {}
