import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCameraGroupDto {
  @ApiProperty({ example: 'Building A' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Front entrance cameras' })
  @IsOptional()
  @IsString()
  description?: string;
}
