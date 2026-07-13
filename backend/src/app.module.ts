import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ItadModule } from './itad/itad.module';
import { GamesModule } from './games/games.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AlertsModule } from './alerts/alerts.module';
import { MailModule } from './mail/mail.module';
import { PriceCheckModule } from './price-check/price-check.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ItadModule,
    PrismaModule,
    AuthModule,
    GamesModule,
    FavoritesModule,
    AlertsModule,
    MailModule,
    PriceCheckModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
