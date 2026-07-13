import { Global, Module } from '@nestjs/common';
import { ItadClient } from './itad.client';
import { InMemoryCache } from '../cache/in-memory-cache';

@Global()
@Module({
  providers: [ItadClient, InMemoryCache],
  exports: [ItadClient, InMemoryCache],
})
export class ItadModule {}
