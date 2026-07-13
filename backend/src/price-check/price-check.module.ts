import { Module } from '@nestjs/common';
import { PriceCheckService } from './price-check.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [PriceCheckService],
})
export class PriceCheckModule {}
