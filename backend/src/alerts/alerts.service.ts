import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveGameId(itadId: string): Promise<string> {
    const game = await this.prisma.game.findUnique({ where: { itadId } });
    if (!game) {
      throw new NotFoundException('Oyun bulunamadı');
    }
    return game.id;
  }

  async add(userId: string, dto: CreateAlertDto) {
    const gameId = await this.resolveGameId(dto.itadId);
    return this.prisma.priceAlert.create({
      data: {
        userId,
        gameId,
        targetPrice: dto.targetPrice,
        region: dto.region ?? 'TR',
      },
      include: { game: true },
    });
  }

  async list(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, alertId: string): Promise<{ success: true }> {
    const result = await this.prisma.priceAlert.deleteMany({
      where: { id: alertId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Alarm bulunamadı');
    }
    return { success: true };
  }
}
