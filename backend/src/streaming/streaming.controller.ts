import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MediaMtxService } from './mediamtx.service';
import { CamerasService } from '../cameras/cameras.service';

@ApiTags('streaming')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('streaming')
export class StreamingController {
  constructor(
    private mediamtx: MediaMtxService,
    private cameras: CamerasService,
  ) {}

  @Get(':cameraId/live')
  async getLiveUrls(@Param('cameraId') cameraId: string) {
    const camera = await this.cameras.findOneOrFail(cameraId);
    const status = await this.mediamtx.getPathStatus(camera.mediaPath);
    return {
      cameraId: camera.id,
      mediaPath: camera.mediaPath,
      live: !!status?.ready,
      hlsUrl: this.mediamtx.hlsUrl(camera.mediaPath),
      webrtcUrl: this.mediamtx.webrtcUrl(camera.mediaPath),
    };
  }
}
