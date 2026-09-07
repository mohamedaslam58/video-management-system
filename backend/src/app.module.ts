import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CamerasModule } from './cameras/cameras.module';
import { StreamingModule } from './streaming/streaming.module';
import { RecordingsModule } from './recordings/recordings.module';
import { EventsModule } from './events/events.module';
import { SearchModule } from './search/search.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      // NOTE: synchronize is convenient for this reference implementation.
      // In production, replace with TypeORM migrations.
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    CamerasModule,
    StreamingModule,
    RecordingsModule,
    EventsModule,
    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
