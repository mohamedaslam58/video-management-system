import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { RecordingSegment } from '../recordings/recording.entity';
import { Camera } from '../cameras/camera.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, RecordingSegment, Camera])],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
