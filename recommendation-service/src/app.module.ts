import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SupabaseModule, RecommendationsModule],
})
export class AppModule {}
