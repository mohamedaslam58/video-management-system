import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { RecordingMode } from '../camera.entity';

export class CreateCameraDto {
  @ApiProperty({ example: 'Front Gate' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Building A / Entrance' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'rtsp://192.168.1.50:554/stream1' })
  @IsString()
  rtspUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rtspUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rtspPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  onvifUrl?: string;

  @ApiPropertyOptional({ enum: RecordingMode, default: RecordingMode.CONTINUOUS })
  @IsOptional()
  @IsEnum(RecordingMode)
  recordingMode?: RecordingMode;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Camera group id' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
