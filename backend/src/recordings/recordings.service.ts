import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecordingSegment } from './recording.entity';
import { Camera, RecordingMode } from '../cameras/camera.entity';
import { StorageService } from './storage.service';
import { RecorderManagerService } from './recorder-manager.service';

@Injectable()
export class RecordingsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(RecordingSegment) private repo: Repository<RecordingSegment>,
    @InjectRepository(Camera) private cameraRepo: Repository<Camera>,
    private storage: StorageService,
    private recorder: RecorderManagerService,
  ) {}

  /** Segments that overlap a requested [from, to] playback window, in order. */
  async findForPlayback(cameraId: string, from: Date, to: Date) {
    return this.repo
      .createQueryBuilder('seg')
      .where('seg.cameraId = :cameraId', { cameraId })
      .andWhere('seg.startTime < :to', { to })
      .andWhere('seg.endTime > :from', { from })
      .orderBy('seg.startTime', 'ASC')
      .getMany();
  }

  async getPlaybackUrls(cameraId: string, from: Date, to: Date) {
    const segments = await this.findForPlayback(cameraId, from, to);
    return Promise.all(
      segments.map(async (s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        trigger: s.trigger,
        url: await this.storage.getPlaybackUrl(s.storageKey),
        thumbnailUrl: s.thumbnailKey
          ? await this.storage.getPlaybackUrl(s.thumbnailKey, 3600)
          : null,
      })),
    );
  }

  async onApplicationBootstrap() {
    // Bring recorders up to match camera config as soon as the app starts.
    await this.syncRecorders();
  }

  /**
   * Reconciles running ffmpeg recorders against each camera's configured
   * recording mode. Runs on startup and every 5 minutes so config changes
   * made via the API (enable/disable, mode changes) are picked up without
   * requiring a restart.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncRecorders() {
    const cameras = await this.cameraRepo.find();
    for (const camera of cameras) {
      const shouldRecord =
        camera.enabled && camera.recordingMode !== RecordingMode.DISABLED;
      if (shouldRecord && !this.recorder.isRecording(camera.id)) {
        this.recorder.start(camera);
      } else if (!shouldRecord && this.recorder.isRecording(camera.id)) {
        this.recorder.stop(camera.id);
      }
    }
  }

  /** Nightly retention purge: delete segments older than each camera's policy. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredSegments() {
    const cameras = await this.cameraRepo.find();
    for (const camera of cameras) {
      const cutoff = new Date(
        Date.now() - camera.retentionDays * 24 * 60 * 60 * 1000,
      );
      const expired = await this.repo.find({
        where: { cameraId: camera.id, endTime: LessThan(cutoff) },
      });
      for (const seg of expired) {
        try {
          await this.storage.removeObject(seg.storageKey);
          if (seg.thumbnailKey) await this.storage.removeObject(seg.thumbnailKey);
          await this.repo.delete(seg.id);
        } catch (err) {
          this.logger.error(`Failed to purge segment ${seg.id}: ${err}`);
        }
      }
      if (expired.length) {
        this.logger.log(
          `Purged ${expired.length} expired segment(s) for camera ${camera.name}`,
        );
      }
    }
  }
}
