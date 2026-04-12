import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post(':id/read')
  markAsRead(@Param('id') notificationId: string, @Request() req) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
  }

  @Post('read-all')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  deleteNotification(@Param('id') notificationId: string, @Request() req) {
    return this.notificationsService.deleteNotification(req.user.id, notificationId);
  }

  @Delete()
  deleteAllNotifications(@Request() req) {
    return this.notificationsService.deleteAllNotifications(req.user.id);
  }
}
