import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [ProgressController],
  providers: [ProgressService, RolesGuard],
})
export class ProgressModule {}
