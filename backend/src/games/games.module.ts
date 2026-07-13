import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { ItadClient } from '../itad/itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';

@Module({
  controllers: [GamesController],
  providers: [GamesService, ItadClient, InMemoryCache],
})
export class GamesModule {}
