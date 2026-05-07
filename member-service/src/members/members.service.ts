import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('members')
      .from('members')
      .select(
        'id, name, email, phone, subscription_plan, subscription_status, created_at, role_id, roles(name)',
      );

    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('members')
      .from('members')
      .select(
        'id, name, email, phone, subscription_plan, subscription_status, created_at, role_id, roles(name)',
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Socio no encontrado');
    return data;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('members')
      .from('members')
      .update({ ...updateMemberDto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, phone, subscription_plan, subscription_status')
      .single();

    if (error || !data) throw new NotFoundException('Socio no encontrado');

    // Si el admin cambió el plan, sincronizar con billing-service (sin cobrar)
    if (updateMemberDto.subscription_plan) {
      this.notifyBillingSync(id, updateMemberDto.subscription_plan);
    }

    return data;
  }

  private notifyBillingSync(memberId: string, plan: string) {
    const billingUrl =
      process.env.BILLING_SERVICE_URL ?? 'http://localhost:3006';
    const internalSecret =
      process.env.INTERNAL_SECRET ?? 'urbangym_internal_secret_2024';

    fetch(`${billingUrl}/billing/admin/${memberId}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalSecret,
      },
      body: JSON.stringify({ plan }),
    }).catch(() => {
      console.warn('No se pudo sincronizar plan con billing-service');
    });
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .schema('members')
      .from('members')
      .delete()
      .eq('id', id);

    if (error) throw new NotFoundException('Socio no encontrado');
    return { message: 'Socio eliminado correctamente' };
  }

  async updateSubscriptionStatus(memberId: string, event: string) {
    const newStatus = event === 'payment.succeeded' ? 'active' : 'suspended';

    const { error } = await this.supabaseService
      .getClient()
      .schema('members')
      .from('members')
      .update({ subscription_status: newStatus })
      .eq('id', memberId);

    if (error) throw new NotFoundException('Socio no encontrado');
    return { message: `Estado actualizado a ${newStatus}`, event };
  }
}
