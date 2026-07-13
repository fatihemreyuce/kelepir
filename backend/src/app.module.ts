import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ItadModule } from './itad/itad.module';
import { GamesModule } from './games/games.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ItadModule,
    GamesModule,
    FavoritesModule,
    AlertsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
