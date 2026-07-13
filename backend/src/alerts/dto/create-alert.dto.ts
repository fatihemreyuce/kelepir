import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  itadId: string;

  @IsNumber()
  @IsPositive()
  targetPrice: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  region?: string;
}
