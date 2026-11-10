import { IsIn } from 'class-validator';

export class SetCanalMemberRoleDto {
  @IsIn(['admin', 'moderateur', 'membre', 'invite'])
  role!: 'admin' | 'moderateur' | 'membre' | 'invite';
}