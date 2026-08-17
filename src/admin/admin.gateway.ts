import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { setupSockets } from './socket.legacy';

@WebSocketGateway({ cors: { origin: '*' } })
export class AdminGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // We reuse the exact socket logic from the Express admin backend
    setupSockets(server);
  }
}
