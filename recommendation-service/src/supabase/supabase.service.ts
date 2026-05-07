import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient(): SupabaseClient<any> {
    return this.client;
  }
}
