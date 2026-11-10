import { IsIn } from 'class-validator';

export class SetRoleDto {
  @IsIn(['student', 'delegate', 'content_admin', 'company', 'admin', 'superadmin'])
  role!: 'student' | 'delegate' | 'content_admin' | 'company' | 'admin' | 'superadmin';
}