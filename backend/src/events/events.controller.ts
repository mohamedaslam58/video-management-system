import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Post('ingest')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({
    summary:
      'Ingest an event (from MediaMTX webhook, analytics sidecar, or manual bookmark)',
  })
  ingest(@Body() dto: IngestEventDto) {
    return this.events.ingest(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  findAll(@Query('cameraId') cameraId?: string, @Query('limit') limit?: string) {
    return this.events.findAll(cameraId, limit ? parseInt(limit, 10) : undefined);
  }

  @Patch(':id/acknowledge')
  @Roles(Role.ADMIN, Role.OPERATOR)
  acknowledge(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.events.acknowledge(id, userId);
  }
}
