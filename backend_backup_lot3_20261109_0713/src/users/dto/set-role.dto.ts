import { IsIn } from 'class-validator';

export class SetRoleDto {
  @IsIn(['student', 'delegate', 'admin', 'superadmin'])
  role!: 'student' | 'delegate' | 'admin' | 'superadmin';
}