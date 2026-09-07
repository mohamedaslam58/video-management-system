import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Event } from './event.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), JwtModule.register({})],
  providers: [EventsService, EventsGateway],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
