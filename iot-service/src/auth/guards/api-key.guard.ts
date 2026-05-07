import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) throw new UnauthorizedException('API Key requerida');

    const { data: machine } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('machines')
      .select('id, name, type, status')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .single();

    if (!machine)
      throw new UnauthorizedException('API Key inválida o máquina inactiva');

    request.machine = machine;
    return true;
  }
}
