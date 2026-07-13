import { IsOptional, IsString, Length } from 'class-validator';

export class PricesQueryDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  region?: string;
}
