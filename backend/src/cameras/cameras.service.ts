import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Camera, CameraStatus } from './camera.entity';
import { CameraGroup } from './camera-group.entity';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { encryptSecret, decryptSecret } from './camera-crypto.util';
import { MediaMtxService } from '../streaming/mediamtx.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CamerasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CamerasService.name);

  constructor(
    @InjectRepository(Camera) private repo: Repository<Camera>,
    @InjectRepository(CameraGroup) private groupRepo: Repository<CameraGroup>,
    private mediamtx: MediaMtxService,
  ) {}

  async onApplicationBootstrap() {
    // MediaMTX keeps registered paths in memory only, so any time it (or the
    // whole stack) restarts, previously-registered cameras are forgotten.
    // Re-push every enabled camera's path on every backend startup so the
    // two stay in sync without requiring a manual edit/save in the UI.
    // A short delay + one retry guards against mediamtx's API not being
    // fully up yet at the exact moment the backend container starts.
    setTimeout(() => this.resyncAll(), 3000);
    setTimeout(() => this.resyncAll(), 15000);
  }

  async resyncAll() {
    const cameras = await this.repo.find({ where: { enabled: true } });
    for (const camera of cameras) {
      await this.mediamtx.upsertPath(camera.mediaPath, this.buildSourceUrl(camera));
    }
    this.logger.log(`Re-registered ${cameras.length} camera path(s) with MediaMTX`);
  }

  async findAll() {
    return this.repo.find({ relations: ['group'] });
  }

  async findOneOrFail(id: string) {
    const camera = await this.repo.findOne({ where: { id }, relations: ['group'] });
    if (!camera) throw new NotFoundException('Camera not found');
    return camera;
  }

  /** Builds the full authenticated RTSP URL MediaMTX should pull from. */
  private buildSourceUrl(camera: Camera): string {
    const username = decryptSecret(camera.rtspUsernameEnc);
    const password = decryptSecret(camera.rtspPasswordEnc);
    if (!username) return camera.rtspUrl;
    try {
      const url = new URL(camera.rtspUrl);
      url.username = username;
      url.password = password || '';
      return url.toString();
    } catch {
      return camera.rtspUrl;
    }
  }

  async create(dto: CreateCameraDto) {
    let group: CameraGroup | null = null;
    if (dto.groupId) {
      group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    }

    const camera = this.repo.create({
      name: dto.name,
      location: dto.location,
      rtspUrl: dto.rtspUrl,
      rtspUsernameEnc: encryptSecret(dto.rtspUsername),
      rtspPasswordEnc: encryptSecret(dto.rtspPassword),
      onvifUrl: dto.onvifUrl,
      recordingMode: dto.recordingMode,
      retentionDays: dto.retentionDays ?? 30,
      mediaPath: `cam-${uuid().slice(0, 8)}`,
      status: CameraStatus.UNKNOWN,
      group: group || undefined,
    });
    const saved = await this.repo.save(camera);
    await this.mediamtx.upsertPath(saved.mediaPath, this.buildSourceUrl(saved));
    return saved;
  }

  async update(id: string, dto: UpdateCameraDto) {
    const camera = await this.findOneOrFail(id);

    if (dto.groupId !== undefined) {
      // camera.group = dto.groupId
      //   ? await this.groupRepo.findOne({ where: { id: dto.groupId } })
      //   : null;

      if (dto.groupId != "") {
          camera.group = await this.groupRepo.findOneOrFail({ where: { id: dto.groupId } });
        }
    }
    if (dto.rtspUsername !== undefined) {
      camera.rtspUsernameEnc = encryptSecret(dto.rtspUsername);
    }
    if (dto.rtspPassword !== undefined) {
      camera.rtspPasswordEnc = encryptSecret(dto.rtspPassword);
    }

    Object.assign(camera, {
      name: dto.name ?? camera.name,
      location: dto.location ?? camera.location,
      rtspUrl: dto.rtspUrl ?? camera.rtspUrl,
      onvifUrl: dto.onvifUrl ?? camera.onvifUrl,
      recordingMode: dto.recordingMode ?? camera.recordingMode,
      retentionDays: dto.retentionDays ?? camera.retentionDays,
      enabled: dto.enabled ?? camera.enabled,
    });

    const saved = await this.repo.save(camera);
    if (saved.enabled) {
      await this.mediamtx.upsertPath(saved.mediaPath, this.buildSourceUrl(saved));
    } else {
      await this.mediamtx.removePath(saved.mediaPath);
    }
    return saved;
  }

  async remove(id: string) {
    const camera = await this.findOneOrFail(id);
    await this.mediamtx.removePath(camera.mediaPath);
    await this.repo.delete(id);
    return { success: true };
  }

  async markHeartbeat(id: string, status: CameraStatus) {
    await this.repo.update(id, { status, lastHeartbeatAt: new Date() });
  }

  // --- camera groups ---

  findAllGroups() {
    return this.groupRepo.find();
  }

  createGroup(name: string, description?: string) {
    return this.groupRepo.save(this.groupRepo.create({ name, description }));
  }
}
