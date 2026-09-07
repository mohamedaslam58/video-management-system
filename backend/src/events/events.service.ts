import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventSeverity } from './event.entity';
import { IngestEventDto } from './dto/ingest-event.dto';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private repo: Repository<Event>,
    private gateway: EventsGateway,
  ) {}

  async ingest(dto: IngestEventDto) {
    const event = this.repo.create({
      cameraId: dto.cameraId,
      type: dto.type,
      severity: dto.severity || EventSeverity.INFO,
      payload: dto.payload,
      occurredAt: new Date(),
    });
    const saved = await this.repo.save(event);
    this.gateway.broadcastEvent(saved);
    return saved;
  }

  findAll(cameraId?: string, limit = 100) {
    return this.repo.find({
      where: cameraId ? { cameraId } : {},
      order: { occurredAt: 'DESC' },
      take: limit,
    });
  }

  async acknowledge(id: string, userId: string) {
    const event = await this.repo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    event.acknowledged = true;
    event.acknowledgedByUserId = userId;
    event.acknowledgedAt = new Date();
    return this.repo.save(event);
  }
}
