import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  @Process('send')
  async handleNotification(job: Job<{
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>) {
    const { userId, type, title, body, data } = job.data;

    try {
      // 1. Create notification in database
      await this.prisma.notification.create({
        data: {
          utilisateurId: userId,
          type: type as any,
          titre: title,
          corps: body,
          donnees: data || {},
        },
      });

      // 2. Get user's device tokens
      const tokens = await this.prisma.tokenAppareil.findMany({
        where: {
          utilisateurId: userId,
          estActif: true,
        },
        select: { token: true },
      });

      // 3. Send push notification if tokens exist
      if (tokens.length > 0) {
        const tokenList = tokens.map(t => t.token);
        
        if (tokenList.length === 1) {
          await this.firebase.sendPushNotification({
            token: tokenList[0],
            title,
            body,
            data,
          });
        } else {
          await this.firebase.sendMulticast({
            tokens: tokenList,
            title,
            body,
            data,
          });
        }
      }

      this.logger.log(`Notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-queue the job
    }
  }
}
