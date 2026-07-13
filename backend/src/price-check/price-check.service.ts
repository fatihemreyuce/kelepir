import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ItadClient } from '../itad/itad.client';
import { ItadDeal } from '../itad/itad.types';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PriceCheckService {
  private readonly logger = new Logger(PriceCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly itad: ItadClient,
    private readonly mail: MailService,
  ) {}

  @Cron('0 9,21 * * *')
  async handleCron(): Promise<void> {
    try {
      const { checked, triggered } = await this.checkAllAlerts();
      this.logger.log(`Fiyat kontrolü: ${checked} alarm tarandı, ${triggered} tetiklendi`);
    } catch (err) {
      this.logger.error(`Fiyat kontrolü cron hatası: ${(err as Error).message}`);
    }
  }

  async checkAllAlerts(): Promise<{ checked: number; triggered: number }> {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { isActive: true },
      include: { game: true, user: true },
    });
    if (alerts.length === 0) {
      return { checked: 0, triggered: 0 };
    }

    // (region -> distinct itadId set) ve (itadId -> gameId) haritaları
    const idsByRegion = new Map<string, Set<string>>();
    const gameIdByItad = new Map<string, string>();
    for (const a of alerts) {
      if (!idsByRegion.has(a.region)) {
        idsByRegion.set(a.region, new Set());
      }
      idsByRegion.get(a.region)!.add(a.game.itadId);
      gameIdByItad.set(a.game.itadId, a.gameId);
    }

    // region başına tek ITAD çağrısı; `${itadId}:${region}` -> deals
    const dealsByKey = new Map<string, ItadDeal[]>();
    for (const [region, ids] of idsByRegion) {
      const map = await this.itad.getPrices([...ids], region);
      for (const [itadId, deals] of map) {
        dealsByKey.set(`${itadId}:${region}`, deals);
      }
    }

    // fiyat geçmişi: her taranan (oyun, region) için snapshot biriktir
    for (const [key, deals] of dealsByKey) {
      const [itadId, region] = key.split(':');
      const gameId = gameIdByItad.get(itadId);
      if (!gameId || deals.length === 0) {
        continue;
      }
      await this.prisma.priceSnapshot.createMany({
        data: deals.map((d) => ({
          gameId,
          store: d.shopName,
          price: d.price,
          discount: d.cut,
          region,
          url: d.url,
        })),
      });
    }

    // tetikleme
    let triggered = 0;
    for (const a of alerts) {
      const deals = dealsByKey.get(`${a.game.itadId}:${a.region}`) ?? [];
      if (deals.length === 0) {
        continue;
      }
      const cheapest = deals.reduce((min, d) => (d.price < min.price ? d : min));
      if (cheapest.price <= Number(a.targetPrice)) {
        try {
          await this.mail.sendPriceAlert({
            to: a.user.email,
            gameTitle: a.game.title,
            targetPrice: Number(a.targetPrice),
            currentPrice: cheapest.price,
            currency: cheapest.currency,
            url: cheapest.url,
          });
          await this.prisma.priceAlert.update({
            where: { id: a.id },
            data: { triggeredAt: new Date(), isActive: false },
          });
          triggered++;
        } catch (err) {
          // mail hatası: alarmı aktif bırak (retry), cron'u bozma
          this.logger.error(
            `Alarm ${a.id} maili gönderilemedi: ${(err as Error).message}`,
          );
        }
      }
    }

    return { checked: alerts.length, triggered };
  }
}
