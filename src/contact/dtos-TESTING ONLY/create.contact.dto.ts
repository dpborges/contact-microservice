import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateContactDto {

  
  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  webSiteUrl: string;

  @IsString()
  mobilePhone: string;

  @IsOptional()
  @IsString()
  sourceType: string;

  @IsOptional()
  @IsString()
  sourceName: string;

}

