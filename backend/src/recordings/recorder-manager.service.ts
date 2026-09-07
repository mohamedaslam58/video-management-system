import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import { Camera, RecordingMode } from '../cameras/camera.entity';
import { RecordingSegment } from './recording.entity';
import { StorageService } from './storage.service';
import { MediaMtxService } from '../streaming/mediamtx.service';

const SEGMENT_SECONDS = 300; // 5 minutes

/**
 * Spawns one `ffmpeg -f segment` process per camera that has recording enabled,
 * pulling from the camera's MediaMTX-relayed RTSP stream (loopback, so
 * ffmpeg never has to juggle multiple direct camera connections). Completed
 * segment files are watched, uploaded to object storage, and indexed in
 * Postgres, then removed from local disk.
 *
 * This is a reference implementation of the recording pipeline; a production
 * deployment would typically run one recorder container/process per camera
 * group, supervised (e.g. via systemd or a process manager) for restarts.
 */
@Injectable()
export class RecorderManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(RecorderManagerService.name);
  private processes = new Map<string, ChildProcess>();
  private watchers = new Map<string, chokidar.FSWatcher>();
  private tmpRoot = path.join(os.tmpdir(), 'vms-recordings');

  constructor(
    private config: ConfigService,
    private mediamtx: MediaMtxService,
    private storage: StorageService,
    @InjectRepository(RecordingSegment)
    private segmentRepo: Repository<RecordingSegment>,
  ) {
    fs.mkdirSync(this.tmpRoot, { recursive: true });
  }

  isRecording(cameraId: string) {
    return this.processes.has(cameraId);
  }

  start(camera: Camera) {
    if (camera.recordingMode === RecordingMode.DISABLED) return;
    if (this.processes.has(camera.id)) return; // already running

    const camDir = path.join(this.tmpRoot, camera.id);
    fs.mkdirSync(camDir, { recursive: true });

    // Safety net: a watcher should never still exist here (it's cleaned up
    // on process exit), but if one somehow does, close it before starting
    // a fresh one so we never end up double-finalizing segments.
    const existingWatcher = this.watchers.get(camera.id);
    if (existingWatcher) {
      existingWatcher.close();
      this.watchers.delete(camera.id);
    }

    // Read from the RTSP relay MediaMTX exposes for this path (rtsp://mediamtx:8554/<path>)
    const rtspRelay = `rtsp://mediamtx:8554/${camera.mediaPath}`;
    const outputPattern = path.join(camDir, 'seg-%Y%m%dT%H%M%S.mp4');

    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspRelay,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_time', String(SEGMENT_SECONDS),
      '-segment_atclocktime', '1',
      '-reset_timestamps', '1',
      '-strftime', '1',
      outputPattern,
    ];

    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('exit', (code) => {
      this.logger.warn(`ffmpeg recorder for camera ${camera.id} exited (${code})`);
      this.processes.delete(camera.id);
      // Prevent the classic leaked-watcher bug: if we don't close the old
      // watcher here, the next sync cycle spawns a *second* watcher on the
      // same directory, and every future segment then gets finalized twice
      // (duplicate DB rows, one with a thumbnail race and one without).
      const staleWatcher = this.watchers.get(camera.id);
      if (staleWatcher) {
        staleWatcher.close();
        this.watchers.delete(camera.id);
      }
    });
    this.processes.set(camera.id, proc);
    this.watchCompletedSegments(camera, camDir);
    this.logger.log(`Started recorder for camera ${camera.name} (${camera.id})`);
  }

  stop(cameraId: string) {
    const proc = this.processes.get(cameraId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(cameraId);
    }
    const watcher = this.watchers.get(cameraId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(cameraId);
    }
  }

  private watchCompletedSegments(camera: Camera, camDir: string) {
    // ffmpeg writes the *current* segment continuously; only pick up files
    // once ffmpeg has rolled over to the next one (i.e. file stopped growing).
    const watcher = chokidar.watch(camDir, { ignoreInitial: true, depth: 0 });
    let lastFile: string | null = null;

    watcher.on('add', async (filePath) => {
      if (lastFile && lastFile !== filePath) {
        await this.finalizeSegment(camera, lastFile);
      }
      lastFile = filePath;
    });

    this.watchers.set(camera.id, watcher);
  }

  private async finalizeSegment(camera: Camera, filePath: string) {
    try {
      const stat = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const key = `${camera.id}/${fileName}`;
      await this.storage.uploadFile(filePath, key);

      const thumbnailKey = await this.extractAndUploadThumbnail(
        camera,
        filePath,
        fileName,
      );

      const startTime = this.parseStartTime(fileName) || new Date();
      const endTime = new Date(startTime.getTime() + SEGMENT_SECONDS * 1000);

      await this.segmentRepo.save(
        this.segmentRepo.create({
          camera,
          cameraId: camera.id,
          startTime,
          endTime,
          storageKey: key,
          thumbnailKey,
          sizeBytes: stat.size,
          trigger:
            camera.recordingMode === RecordingMode.MOTION ? 'motion' : 'continuous',
        }),
      );
      fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.error(`Failed to finalize segment ${filePath}: ${err}`);
    }
  }

  /**
   * Grabs a single keyframe (1 second in, so it's past any black-frame
   * startup) from the finished segment as a small JPEG, uploads it to
   * object storage, and returns its storage key — or undefined if
   * extraction fails, so a missing thumbnail never blocks recording.
   */
  private async extractAndUploadThumbnail(
    camera: Camera,
    segmentPath: string,
    segmentFileName: string,
  ): Promise<string | undefined> {
    const thumbPath = segmentPath.replace(/\.mp4$/, '.jpg');
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', [
          '-y',
          '-ss', '1',
          '-i', segmentPath,
          '-frames:v', '1',
          '-vf', 'scale=320:-1',
          '-q:v', '4',
          thumbPath,
        ]);
        proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg thumbnail exit ${code}`))));
        proc.on('error', reject);
      });

      const thumbName = segmentFileName.replace(/\.mp4$/, '.jpg');
      const key = `${camera.id}/thumbnails/${thumbName}`;
      await this.storage.uploadFile(thumbPath, key);
      fs.unlinkSync(thumbPath);
      return key;
    } catch (err) {
      this.logger.warn(`Thumbnail extraction failed for ${segmentPath}: ${err}`);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      return undefined;
    }
  }

  private parseStartTime(fileName: string): Date | null {
    // seg-20260725T143000.mp4
    const match = fileName.match(/seg-(\d{8}T\d{6})/);
    if (!match) return null;
    const [, ts] = match;
    const iso = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(
      9,
      11,
    )}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
    return new Date(iso);
  }

  onModuleDestroy() {
    for (const cameraId of this.processes.keys()) this.stop(cameraId);
  }
}
