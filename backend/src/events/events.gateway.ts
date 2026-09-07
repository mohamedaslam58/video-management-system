import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Event } from './event.entity';

@WebSocketGateway({ namespace: 'events', cors: true })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwt: JwtService, private config: ConfigService) {}

  handleConnection(client: Socket) {
    // Clients authenticate by passing their JWT access token as a query param
    // or in the `Authorization` handshake header, e.g. `?token=<accessToken>`.
    const token =
      (client.handshake.query.token as string) ||
      client.handshake.headers.authorization?.replace('Bearer ', '');
    try {
      const payload: any = this.jwt.verify(token || '', {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      client.data.user = payload;
    } catch {
      this.logger.warn(`Rejected unauthenticated WS connection ${client.id}`);
      client.emit('error', 'unauthenticated');
      client.disconnect(true);
      return;
    }
  }

  broadcastEvent(event: Event) {
    this.server.emit('event', event);
  }
}
