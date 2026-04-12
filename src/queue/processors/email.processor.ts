import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

@Processor('emails')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleEmail(job: Job<{
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }>) {
    const { to, subject, template, context } = job.data;

    try {
      this.logger.log(`Sending email to ${to}:`);
      this.logger.log(`  Subject: ${subject}`);
      this.logger.log(`  Template: ${template}`);
      this.logger.log(`  Context: ${JSON.stringify(context)}`);
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Process('generate')
  async handleExport(job: Job<{
    userId: string;
    type: string;
    filters?: Record<string, any>;
    format: string;
  }>) {
    const { userId, type } = job.data;

    try {
      this.logger.log(`Starting export job for user ${userId}: ${type}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.logger.log(`Export completed for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Export failed for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}