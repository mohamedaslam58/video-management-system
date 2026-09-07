import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { RecordingSegment } from '../recordings/recording.entity';
import { Camera } from '../cameras/camera.entity';
import { SearchQueryDto, SearchKind } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(RecordingSegment)
    private segmentRepo: Repository<RecordingSegment>,
    @InjectRepository(Camera) private cameraRepo: Repository<Camera>,
  ) {}

  async search(q: SearchQueryDto) {
    const kind = q.kind || SearchKind.EVENTS;
    const cameraIds = await this.resolveCameraIds(q.cameraId, q.groupId);

    if (kind === SearchKind.RECORDINGS) {
      return this.searchRecordings(q, cameraIds);
    }
    return this.searchEvents(q, cameraIds);
  }

  private async resolveCameraIds(
    cameraId?: string,
    groupId?: string,
  ): Promise<string[] | undefined> {
    if (cameraId) return [cameraId];
    if (groupId) {
      const cameras = await this.cameraRepo.find({ where: { group: { id: groupId } } });
      return cameras.map((c) => c.id);
    }
    return undefined; // no camera filter
  }

  private async searchEvents(q: SearchQueryDto, cameraIds?: string[]) {
    const qb = this.eventRepo.createQueryBuilder('e').orderBy('e.occurredAt', 'DESC');

    if (cameraIds) qb.andWhere('e.cameraId IN (:...cameraIds)', { cameraIds });
    if (q.eventType) qb.andWhere('e.type = :type', { type: q.eventType });
    if (q.severity) qb.andWhere('e.severity = :severity', { severity: q.severity });
    if (q.from) qb.andWhere('e.occurredAt >= :from', { from: q.from });
    if (q.to) qb.andWhere('e.occurredAt <= :to', { to: q.to });
    if (q.unacknowledgedOnly) qb.andWhere('e.acknowledged = false');

    return qb.take(200).getMany();
  }

  private async searchRecordings(q: SearchQueryDto, cameraIds?: string[]) {
    const qb = this.segmentRepo
      .createQueryBuilder('seg')
      .orderBy('seg.startTime', 'DESC');

    if (cameraIds) qb.andWhere('seg.cameraId IN (:...cameraIds)', { cameraIds });
    if (q.from) qb.andWhere('seg.endTime >= :from', { from: q.from });
    if (q.to) qb.andWhere('seg.startTime <= :to', { to: q.to });

    return qb.take(200).getMany();
  }
}
