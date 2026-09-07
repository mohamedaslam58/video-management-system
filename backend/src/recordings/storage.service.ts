import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Client;
  // Separate client used only to *sign* presigned URLs with a host the
  // browser can actually resolve. The internal `client` above talks to
  // MinIO over the Docker network (e.g. http://minio:9000); browsers can't
  // resolve that hostname, so URLs handed back to the frontend must be
  // signed against a public-facing endpoint instead (e.g. localhost:9000,
  // or your real domain/IP in a non-local deployment).
  private publicClient: Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    const endpoint = new URL(config.get('S3_ENDPOINT') || 'http://minio:9000');
    const accessKey = config.get('S3_ACCESS_KEY') || '';
    const secretKey = config.get('S3_SECRET_KEY') || '';

    const region = config.get('S3_REGION') || 'us-east-1';

    this.client = new Client({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port) || 9000,
      useSSL: endpoint.protocol === 'https:',
      accessKey,
      secretKey,
      region,
    });

    const publicEndpoint = new URL(
      config.get('S3_PUBLIC_ENDPOINT') ||
        config.get('S3_ENDPOINT') ||
        'http://localhost:9000',
    );
    this.publicClient = new Client({
      endPoint: publicEndpoint.hostname,
      port: Number(publicEndpoint.port) || 9000,
      useSSL: publicEndpoint.protocol === 'https:',
      accessKey,
      secretKey,
      region,
    });

    this.bucket = config.get('S3_BUCKET') || 'vms-recordings';
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket ${this.bucket}`);
      }
    } catch (err) {
      this.logger.warn(`Could not verify/create bucket at startup: ${err}`);
    }
  }

  async uploadFile(localPath: string, key: string) {
    await this.client.fPutObject(this.bucket, key, localPath);
  }

  async removeObject(key: string) {
    await this.client.removeObject(this.bucket, key);
  }

  /** Short-lived signed URL for direct browser playback/download. */
  async getPlaybackUrl(key: string, expirySeconds = 3600) {
    return this.publicClient.presignedGetObject(this.bucket, key, expirySeconds);
  }
}
