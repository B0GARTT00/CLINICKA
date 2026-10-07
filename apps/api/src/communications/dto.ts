import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class ClinicMessageAttachmentDto {
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @IsIn(['application/pdf', 'image/jpeg', 'image/png']) mimeType!: string;
  @IsString() contentBase64!: string;
}

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsString()
  @IsIn(['ALL', 'STUDENT', 'FACULTY_STAFF', 'CLINIC_STAFF'])
  audience!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateConversationDto {
  @IsString() patientId!: string;
  @IsString() @MinLength(3) @MaxLength(160) subject!: string;
  @IsString() @IsIn(['APPOINTMENT', 'MEDICAL_CERTIFICATE', 'MEDICAL_CLEARANCE', 'HEALTH_REQUIREMENT', 'VACCINATION_RECORD', 'MEDICINE_PICKUP', 'GENERAL_CLINIC_CONCERN']) topic!: string;
  @IsString() @MinLength(1) @MaxLength(5000) message!: string;
  @IsOptional() @IsBoolean() repliesEnabled?: boolean;
  @IsOptional() @IsString() relatedType?: string;
  @IsOptional() @IsString() relatedId?: string;
  @IsOptional() @ValidateNested() @Type(() => ClinicMessageAttachmentDto) attachment?: ClinicMessageAttachmentDto;
}

export class SendClinicMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000) content!: string;
  @IsOptional() @ValidateNested() @Type(() => ClinicMessageAttachmentDto) attachment?: ClinicMessageAttachmentDto;
}
