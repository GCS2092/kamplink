import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto/device-token.dto';

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

  // Enregistrer l'appareil pour recevoir les notifications push
  @Post('device-token')
  registerDeviceToken(@Request() req, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(req.user.id, dto.token, dto.plateforme);
  }

  // A declarer AVANT @Delete(':id'), sinon "device-token" serait pris pour un id
  @Delete('device-token')
  unregisterDeviceToken(@Request() req, @Body() dto: UnregisterDeviceTokenDto) {
    return this.notificationsService.unregisterDeviceToken(req.user.id, dto.token);
  }

  @Post('read-all')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Post(':id/read')
  markAsRead(@Param('id') notificationId: string, @Request() req) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
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