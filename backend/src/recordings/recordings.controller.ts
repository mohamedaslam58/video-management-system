import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecordingsService } from './recordings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/role.enum';

@ApiTags('recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recordings')
export class RecordingsController {
  constructor(private recordings: RecordingsService) {}

  @Get(':cameraId/playback')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiQuery({ name: 'from', example: '2026-07-25T08:00:00Z' })
  @ApiQuery({ name: 'to', example: '2026-07-25T09:00:00Z' })
  getPlayback(
    @Param('cameraId') cameraId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.recordings.getPlaybackUrls(cameraId, new Date(from), new Date(to));
  }
}
