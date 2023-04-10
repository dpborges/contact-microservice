import { IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create.contact.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {

  @IsNumber()
  accountId: number;

}

