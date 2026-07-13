import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveGameId(itadId: string): Promise<string> {
    const game = await this.prisma.game.findUnique({ where: { itadId } });
    if (!game) {
      throw new NotFoundException('Oyun bulunamadı');
    }
    return game.id;
  }

  async add(userId: string, itadId: string) {
    const gameId = await this.resolveGameId(itadId);
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (existing) {
      throw new ConflictException('Bu oyun zaten favorilerde');
    }
    return this.prisma.favorite.create({
      data: { userId, gameId },
      include: { game: true },
    });
  }

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, favoriteId: string): Promise<{ success: true }> {
    const result = await this.prisma.favorite.deleteMany({
      where: { id: favoriteId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Favori bulunamadı');
    }
    return { success: true };
  }
}
