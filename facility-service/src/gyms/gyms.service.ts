import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class GymsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return data;
  }

  async findOpen() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .select('*')
      .eq('is_open', true)
      .order('name');

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .select('*, equipment(*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Sede no encontrada');
    return data;
  }

  async create(dto: {
    name: string;
    address: string;
    capacity: number;
    open_time: string;
    close_time: string;
    is_open?: boolean;
  }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      address: string;
      capacity: number;
      open_time: string;
      close_time: string;
      is_open: boolean;
    }>,
  ) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Sede no encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('gyms')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Sede eliminada' };
  }
}
