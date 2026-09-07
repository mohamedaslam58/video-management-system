import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { EventSeverity, EventType } from '../../events/event.entity';

export enum SearchKind {
  RECORDINGS = 'recordings',
  EVENTS = 'events',
}

export class SearchQueryDto {
  @ApiPropertyOptional({ enum: SearchKind, default: SearchKind.EVENTS })
  @IsOptional()
  @IsEnum(SearchKind)
  kind?: SearchKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cameraId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: EventSeverity })
  @IsOptional()
  @IsEnum(EventSeverity)
  severity?: EventSeverity;

  @ApiPropertyOptional({ example: '2026-07-25T00:00:00Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-25T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Only unacknowledged events' })
  @IsOptional()
  unacknowledgedOnly?: boolean;
}
