import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EquipmentService {
  constructor(private supabaseService: SupabaseService) {}

  async findByGym(gymId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
      .select('*')
      .eq('gym_id', gymId)
      .order('name');

    if (error) throw new Error(error.message);
    return data;
  }

  async findAvailableByGym(gymId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
      .select('*')
      .eq('gym_id', gymId)
      .eq('status', 'available')
      .order('name');

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data)
      throw new NotFoundException('Equipamiento no encontrado');
    return data;
  }

  async create(dto: {
    gym_id: string;
    name: string;
    category: string;
    quantity: number;
    status?: string;
  }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
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
      category: string;
      quantity: number;
      status: string;
    }>,
  ) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Equipamiento no encontrado');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .schema('facilities')
      .from('equipment')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Equipamiento eliminado' };
  }
}
