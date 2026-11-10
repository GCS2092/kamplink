import { IsIn } from 'class-validator';

export class VoteMessageDto {
  @IsIn(['up', 'down'])
  vote!: 'up' | 'down';
}
