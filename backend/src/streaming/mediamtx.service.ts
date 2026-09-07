import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client around MediaMTX's control API (https://github.com/bluenviron/mediamtx).
 * MediaMTX exposes a REST API (default :9997) to add/remove/query RTSP source
 * "paths" at runtime — this is how the VMS tells the media server which cameras
 * to pull from, without restarting anything.
 */
@Injectable()
export class MediaMtxService {
  private readonly logger = new Logger(MediaMtxService.name);
  private readonly apiUrl: string;
  private readonly hlsBase: string;
  private readonly webrtcBase: string;

  constructor(private config: ConfigService) {
    this.apiUrl = config.get('MEDIAMTX_API_URL') || 'http://mediamtx:9997';
    this.hlsBase = config.get('MEDIAMTX_HLS_BASE_URL') || 'http://localhost:8888';
    this.webrtcBase =
      config.get('MEDIAMTX_WEBRTC_BASE_URL') || 'http://localhost:8889';
  }

  /** Registers/updates a pull-source path so MediaMTX starts relaying this camera. */
  async upsertPath(
    mediaPath: string,
    rtspSourceUrl: string,
  ): Promise<void> {
    try {
      const res = await fetch(
        `${this.apiUrl}/v3/config/paths/replace/${encodeURIComponent(mediaPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: rtspSourceUrl,
            sourceOnDemand: false,
            sourceProtocol: 'tcp',
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(
          `MediaMTX upsertPath(${mediaPath}) returned ${res.status}`,
        );
      }
    } catch (err) {
      this.logger.warn(`MediaMTX unreachable while upserting ${mediaPath}: ${err}`);
    }
  }

  async removePath(mediaPath: string): Promise<void> {
    try {
      await fetch(
        `${this.apiUrl}/v3/config/paths/delete/${encodeURIComponent(mediaPath)}`,
        { method: 'POST' },
      );
    } catch (err) {
      this.logger.warn(`MediaMTX unreachable while removing ${mediaPath}: ${err}`);
    }
  }

  /** Live status: whether MediaMTX currently has an active source for the path. */
  async getPathStatus(mediaPath: string): Promise<{ ready: boolean } | null> {
    try {
      const res = await fetch(
        `${this.apiUrl}/v3/paths/get/${encodeURIComponent(mediaPath)}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return { ready: !!data.ready };
    } catch {
      return null;
    }
  }

  hlsUrl(mediaPath: string): string {
    return `${this.hlsBase}/${mediaPath}/index.m3u8`;
  }

  webrtcUrl(mediaPath: string): string {
    return `${this.webrtcBase}/${mediaPath}/whep`;
  }
}
