import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MachinesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('machines')
      .select('id, name, type, gym_id, status, created_at, api_key')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('machines')
      .select('id, name, type, gym_id, status, created_at, api_key')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Máquina no encontrada');
    return data;
  }

  async register(dto: { name: string; type: string; gym_id: string }) {
    const apiKey = `iot_${uuidv4().replace(/-/g, '')}`;

    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('machines')
      .insert({ ...dto, api_key: apiKey, status: 'active' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateStatus(id: string, status: 'active' | 'inactive') {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('machines')
      .update({ status })
      .eq('id', id)
      .select('id, name, type, status')
      .single();

    if (error) throw new NotFoundException('Máquina no encontrada');
    return data;
  }
}
