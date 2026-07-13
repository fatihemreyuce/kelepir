import { Controller, Get, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.games.search(query.q);
  }
}
