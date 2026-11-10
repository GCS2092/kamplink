import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove user from all rooms
    this.chatService.removeUserFromAllRooms(client.id);
  }

  @SubscribeMessage('join-canal')
  async handleJoinCanal(
    @MessageBody() data: { canalId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    
    // Verify user can access this canal
    const canAccess = await this.chatService.canAccessCanal(user.id, data.canalId);
    if (!canAccess) {
      client.emit('error', { message: 'Accès interdit à ce canal' });
      return;
    }

    client.join(`canal:${data.canalId}`);
    this.chatService.addUserToRoom(client.id, data.canalId, user.id);
    
    client.emit('joined', { canalId: data.canalId });
    
    // Notify others in canal
    client.to(`canal:${data.canalId}`).emit('user-joined', {
      userId: user.id,
      userName: user.profil?.prenom || 'Utilisateur',
    });
  }

  @SubscribeMessage('leave-canal')
  handleLeaveCanal(
    @MessageBody() data: { canalId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`canal:${data.canalId}`);
    this.chatService.removeUserFromRoom(client.id, data.canalId);
    
    client.emit('left', { canalId: data.canalId });
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() data: { canalId: string; content: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    
    try {
      // Save message to database
      const message = await this.chatService.createMessage({
        canalId: data.canalId,
        auteurId: user.id,
        contenu: data.content,
        type: data.type || 'discussion',
      });

      // Broadcast to all users in canal
      this.server.to(`canal:${data.canalId}`).emit('new-message', {
        id: message.id,
        content: message.contenu,
        author: {
          id: user.id,
          name: user.profil?.prenom || 'Utilisateur',
          avatar: user.profil?.avatarUrl,
        },
        createdAt: message.createdAt,
        type: message.type,
      });
    } catch (error) {
      client.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { canalId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    
    client.to(`canal:${data.canalId}`).emit('user-typing', {
      userId: user.id,
      userName: user.profil?.prenom || 'Utilisateur',
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @MessageBody() data: { messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    
    await this.chatService.markMessagesAsRead(data.messageIds, user.id);
    client.emit('messages-read', { messageIds: data.messageIds });
  }
}
