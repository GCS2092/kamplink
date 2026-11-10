import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telephone?: string;
}
