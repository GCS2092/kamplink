import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SanitizationService } from '../common/services/sanitization.service';

interface CreateMessageDto {
  canalId: string;
  auteurId: string;
  contenu: string;
  type: string;
  parentId?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private userRooms = new Map<string, Map<string, string>>(); // socketId -> {canalId -> userId}

  constructor(
    private prisma: PrismaService,
    private sanitization: SanitizationService,
  ) {}

  async canAccessCanal(userId: string, canalId: string): Promise<boolean> {
    const canal = await this.prisma.canal.findUnique({
      where: { id: canalId },
      include: { espace: true },
    });

    if (!canal) return false;

    // Public canal
    if (canal.estPublic) return true;

    // Check if user is member
    const member = await this.prisma.canalMembre.findUnique({
      where: {
        canalId_utilisateurId: {
          canalId,
          utilisateurId: userId,
        },
      },
    });

    return !!member;
  }

  async createMessage(dto: CreateMessageDto) {
    // Sanitize content to prevent XSS
    const sanitizedContent = this.sanitization.sanitizeHtml(dto.contenu);

    return this.prisma.message.create({
      data: {
        canalId: dto.canalId,
        auteurId: dto.auteurId,
        contenu: sanitizedContent,
        type: dto.type as any,
        parentId: dto.parentId,
      },
      include: {
        auteur: {
          select: {
            id: true,
            profil: {
              select: {
                prenom: true,
                nom: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async markMessagesAsRead(messageIds: string[], userId: string) {
    // Implementation depends on your read receipt logic
    this.logger.log(`Messages ${messageIds.join(', ')} marked as read by ${userId}`);
  }

  addUserToRoom(socketId: string, canalId: string, userId: string) {
    if (!this.userRooms.has(socketId)) {
      this.userRooms.set(socketId, new Map());
    }
    this.userRooms.get(socketId)!.set(canalId, userId);
  }

  removeUserFromRoom(socketId: string, canalId: string) {
    const rooms = this.userRooms.get(socketId);
    if (rooms) {
      rooms.delete(canalId);
    }
  }

  removeUserFromAllRooms(socketId: string) {
    this.userRooms.delete(socketId);
  }

  getOnlineUsersInCanal(canalId: string): string[] {
    const users: string[] = [];
    for (const [_, rooms] of this.userRooms) {
      if (rooms.has(canalId)) {
        users.push(rooms.get(canalId)!);
      }
    }
    return users;
  }
}
