import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), SupabaseModule],
  providers: [JwtStrategy, ApiKeyGuard],
  exports: [JwtStrategy, ApiKeyGuard],
})
export class AuthModule {}
