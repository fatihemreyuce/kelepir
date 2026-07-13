import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PriceAlertMail } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey(): string {
    return process.env.RESEND_API_KEY ?? '';
  }

  private get from(): string {
    return process.env.MAIL_FROM ?? 'Kelepir <onboarding@resend.dev>';
  }

  async sendPriceAlert(mail: PriceAlertMail): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(
        `RESEND_API_KEY yok — "${mail.gameTitle}" için mail atlandı (${mail.to})`,
      );
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: mail.to,
        subject: `${mail.gameTitle} hedef fiyatına düştü! 🎮`,
        html:
          `<p><strong>${mail.gameTitle}</strong> takip ettiğin fiyata ulaştı.</p>` +
          `<p>Hedef: ${mail.targetPrice} ${mail.currency} · ` +
          `Güncel: <strong>${mail.currentPrice} ${mail.currency}</strong></p>` +
          `<p><a href="${mail.url}">Mağazada gör</a></p>` +
          `<p>— Kelepir</p>`,
      }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Resend failed: ${res.status}`);
    }
  }
}
