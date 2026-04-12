import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectQueue('emails') private emailQueue: Queue,
    @InjectQueue('exports') private exportQueue: Queue,
  ) {}

  // ─────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────

  async addNotificationJob(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    await this.notificationQueue.add('send', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    
    this.logger.log(`Notification job added for user ${data.userId}`);
  }

  async addBulkNotifications(data: Array<{
    userId: string;
    type: string;
    title: string;
    body: string;
  }>): Promise<void> {
    const jobs = data.map(item => ({
      name: 'send',
      data: item,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    await this.notificationQueue.addBulk(jobs);
    this.logger.log(`Bulk notification jobs added: ${data.length}`);
  }

  // ─────────────────────────────────────────
  // EMAILS
  // ─────────────────────────────────────────

  async addEmailJob(data: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<void> {
    await this.emailQueue.add('send', data, {
      attempts: 5,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
      delay: 0, // Can be set for scheduled emails
    });
    
    this.logger.log(`Email job added for ${data.to}`);
  }

  // ─────────────────────────────────────────
  // EXPORTS / REPORTS
  // ─────────────────────────────────────────

  async addExportJob(data: {
    userId: string;
    type: 'users' | 'documents' | 'messages' | 'stats';
    filters?: Record<string, any>;
    format: 'csv' | 'pdf' | 'excel';
  }): Promise<string> {
    const job = await this.exportQueue.add('generate', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
      timeout: 300000, // 5 minutes
    });
    
    this.logger.log(`Export job added: ${job.id} for user ${data.userId}`);
    return job.id.toString();
  }

  // ─────────────────────────────────────────
  // MONITORING
  // ─────────────────────────────────────────

  async getQueueStatus(): Promise<{
    notifications: { waiting: number; active: number; completed: number; failed: number };
    emails: { waiting: number; active: number; completed: number; failed: number };
    exports: { waiting: number; active: number; completed: number; failed: number };
  }> {
    const [notificationStats, emailStats, exportStats] = await Promise.all([
      this.getQueueStats(this.notificationQueue),
      this.getQueueStats(this.emailQueue),
      this.getQueueStats(this.exportQueue),
    ]);

    return {
      notifications: notificationStats,
      emails: emailStats,
      exports: exportStats,
    };
  }

  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
