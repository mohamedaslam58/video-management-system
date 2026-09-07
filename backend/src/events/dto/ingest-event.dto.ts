import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EventType, EventSeverity } from '../event.entity';

export class IngestEventDto {
  @ApiPropertyOptional({ description: 'Camera id this event relates to' })
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @ApiPropertyOptional({ enum: EventSeverity, default: EventSeverity.INFO })
  @IsOptional()
  @IsEnum(EventSeverity)
  severity?: EventSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
