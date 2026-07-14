import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PricesQueryDto } from './dto/prices-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.games.search(query.q);
  }

  @Get(':itadId/prices')
  prices(@Param('itadId') itadId: string, @Query() query: PricesQueryDto) {
    return this.games.getGamePrices(itadId, query.region);
  }

  @Get(':itadId/history')
  history(@Param('itadId') itadId: string, @Query() query: PricesQueryDto) {
    return this.games.getGameHistory(itadId, query.region);
  }
}
