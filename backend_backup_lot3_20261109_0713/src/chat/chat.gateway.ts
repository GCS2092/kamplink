import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

const MESSAGE_TYPES = ['annonce', 'question', 'ressource', 'discussion'];
const MAX_CONTENT = 5000;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private hits = new Map<string, number[]>();

  constructor(
    private chatService: ChatService,
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  // Authentification une seule fois, a la connexion (un socket non authentifie est refuse)
  afterInit(server: any) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const raw = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!raw) return next(new Error('Token manquant'));
        const token = String(raw).replace(/^Bearer\s+/i, '');

        const decoded = await this.firebase.verifyToken(token);
        const user = await this.prisma.utilisateur.findUnique({
          where: { firebaseUid: decoded.uid },
          include: { profil: true },
        });
        if (!user || user.estBanni || user.deletedAt) {
          return next(new Error('Authentification échouée'));
        }
        (socket as any).user = user;
        next();
      } catch {
        next(new Error('Authentification échouée'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.chatService.removeUserFromAllRooms(client.id);
    this.hits.delete(client.id);
  }

  private tooFast(id: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(id) || []).filter((t) => now - t < 10000);
    recent.push(now);
    this.hits.set(id, recent);
    return recent.length > 20;
  }

  @SubscribeMessage('join-canal')
  async handleJoinCanal(
    @MessageBody() data: { canalId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!data || typeof data.canalId !== 'string') {
      client.emit('error', { message: 'canalId invalide' });
      return;
    }

    const canAccess = await this.chatService.canAccessCanal(user.id, data.canalId);
    if (!canAccess) {
      client.emit('error', { message: 'Accès interdit à ce canal' });
      return;
    }

    client.join(`canal:${data.canalId}`);
    this.chatService.addUserToRoom(client.id, data.canalId, user.id);
    client.emit('joined', { canalId: data.canalId });
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
    if (!data || typeof data.canalId !== 'string') return;
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

    if (this.tooFast(client.id)) {
      client.emit('error', { message: 'Trop de messages, ralentissez' });
      return;
    }
    if (
      !data ||
      typeof data.canalId !== 'string' ||
      typeof data.content !== 'string' ||
      !data.content.trim() ||
      data.content.length > MAX_CONTENT
    ) {
      client.emit('error', { message: 'Message invalide' });
      return;
    }
    const type = data.type || 'discussion';
    if (!MESSAGE_TYPES.includes(type)) {
      client.emit('error', { message: 'Type de message invalide' });
      return;
    }
    // Il faut avoir rejoint le canal (acces deja verifie par join-canal)
    if (!client.rooms.has(`canal:${data.canalId}`)) {
      client.emit('error', { message: "Rejoignez le canal avant d'envoyer un message" });
      return;
    }

    try {
      const message = await this.chatService.createMessage({
        canalId: data.canalId,
        auteurId: user.id,
        contenu: data.content,
        type,
      });

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
      client.emit('error', { message: "Erreur lors de l'envoi du message" });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { canalId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!data || typeof data.canalId !== 'string') return;
    if (!client.rooms.has(`canal:${data.canalId}`)) return;

    client.to(`canal:${data.canalId}`).emit('user-typing', {
      userId: user.id,
      userName: user.profil?.prenom || 'Utilisateur',
      isTyping: !!data.isTyping,
    });
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @MessageBody() data: { messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!data || !Array.isArray(data.messageIds) || data.messageIds.length > 100) return;

    await this.chatService.markMessagesAsRead(data.messageIds, user.id);
    client.emit('messages-read', { messageIds: data.messageIds });
  }
}