import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CamerasService } from './cameras.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { CreateCameraGroupDto } from './dto/create-camera-group.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('cameras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cameras')
export class CamerasController {
  constructor(private cameras: CamerasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  async findAll(@CurrentUser() user: any) {
    const all = await this.cameras.findAll();
    // Scope Viewer/Operator to their assigned camera groups, if any are set.
    if (user.role !== Role.ADMIN && user.cameraGroupIds?.length) {
      return all.filter(
        (c) => c.group && user.cameraGroupIds.includes(c.group.id),
      );
    }
    return all;
  }

  @Get('groups')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  findAllGroups() {
    return this.cameras.findAllGroups();
  }

  @Post('groups')
  @Roles(Role.ADMIN)
  createGroup(@Body() dto: CreateCameraGroupDto) {
    return this.cameras.createGroup(dto.name, dto.description);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.cameras.findOneOrFail(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCameraDto) {
    return this.cameras.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.cameras.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.cameras.remove(id);
  }
}
