import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RecommendationsService {
  constructor(private supabaseService: SupabaseService) {}
  
  async getRecommendedClasses(memberId: string, authHeader: string) {
    const bookingUrl = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3002';
    const progressUrl = process.env.PROGRESS_SERVICE_URL ?? 'http://localhost:3005';

    // 1. Obtener historial de clases del usuario (Booking Service)
    let userBookings = [];
    try {
      const res = await fetch(`${bookingUrl}/bookings/my`, {
        headers: { 'Authorization': authHeader || '' }
      });
      if (res.ok) userBookings = await res.json();
    } catch (e) {
      console.error('Error fetching bookings', e);
    }

    // Filtramos solo las asistidas o confirmadas pasadas (para recomendaciones, usar todas sirve)
    const attendedClasses = userBookings;

    // 2. Obtener historial de rutinas/IoT del usuario (Progress Service)
    let userWorkouts = [];
    try {
      const res = await fetch(`${progressUrl}/progress/me`, {
        headers: { 'Authorization': authHeader || '' }
      });
      if (res.ok) userWorkouts = await res.json();
    } catch (e) {
      console.error('Error fetching progress', e);
    }

    // 3. Obtener clases futuras con cupos disponibles (Booking Service)
    let availableSchedules = [];
    try {
      const res = await fetch(`${bookingUrl}/schedules`, {
        headers: { 'Authorization': authHeader || '' }
      });
      if (res.ok) {
        const schedules = await res.json();
        availableSchedules = schedules.filter((s: any) => s.available_spots > 0);
      }
    } catch (e) {
      console.error('Error fetching schedules', e);
    }

    // SI NO HAY HISTORIAL, recomendamos las clases más populares (las que tienen menos cupos porque se están llenando rápido)
    if (attendedClasses.length === 0 && userWorkouts.length === 0) {
      return this.recommendPopularClasses(availableSchedules);
    }

    // 4. Analizar preferencias
    // Extraer nombres/categorías de clases atendidas
    const likedClassTypes = new Set<string>();
    attendedClasses.forEach((b: any) => {
      const cls = b.schedules?.classes;
      if (cls?.name) likedClassTypes.add(cls.name.toLowerCase());
      if (cls?.category) likedClassTypes.add(cls.category.toLowerCase());
    });

    // Extraer tipos de máquinas usadas
    userWorkouts.forEach((w: any) => {
      if (w.machine_type) likedClassTypes.add(w.machine_type.toLowerCase());
      if (w.machine_name) {
        if (w.machine_name.toLowerCase().includes('cinta') || w.machine_name.toLowerCase().includes('run')) likedClassTypes.add('cardio');
        if (w.machine_name.toLowerCase().includes('pesa') || w.machine_name.toLowerCase().includes('fuerza')) likedClassTypes.add('fuerza');
      }
    });

    // 5. Filtrar/Scorear clases futuras según coincidencias
    const scoredSchedules = availableSchedules.map((schedule: any) => {
      let score = 0;
      const cls = schedule.classes;
      if (cls) {
        if (cls.name && likedClassTypes.has(cls.name.toLowerCase())) score += 3;
        if (cls.category && likedClassTypes.has(cls.category.toLowerCase())) score += 2;
        
        // Relación cruzada: Si hace mucho cardio en IoT, recomendar Spinning/Zumba
        if (likedClassTypes.has('cardio') && (cls.name.toLowerCase().includes('spin') || cls.name.toLowerCase().includes('zumba'))) score += 2;
        
        // Relación cruzada: Si hace mucha fuerza, recomendar Crossfit/Pesas
        if (likedClassTypes.has('fuerza') && (cls.name.toLowerCase().includes('cross') || cls.name.toLowerCase().includes('fuerz'))) score += 2;
      }
      return { schedule, score };
    });

    // Ordenar por score descendente y luego por las que llenan más rápido
    scoredSchedules.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Desempate: clases más concurridas (menos cupos)
      return a.schedule.available_spots - b.schedule.available_spots;
    });

    return scoredSchedules
      .filter((s) => s.score > 0) // Solo retornar las que tengan algún nivel de recomendación
      .slice(0, 5) // Top 5
      .map((s) => ({
        ...s.schedule,
        recommendation_reason: this.getReason(s.score),
      }));
  }

  private recommendPopularClasses(schedules: any[]) {
    return schedules
      .sort((a, b) => a.available_spots - b.available_spots)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        recommendation_reason: 'Clase popular',
      }));
  }

  private getReason(score: number): string {
    if (score >= 4) return 'Altamente recomendada por tu actividad';
    if (score >= 2) return 'Recomendada para ti';
    return 'Podría interesarte';
  }

  // --- NUEVAS FUNCIONES PARA BMI Y PLANES ---

  async saveMetrics(memberId: string, data: { weight_kg: number; height_cm: number; goal: string }) {
    const client = this.supabaseService.getClient();
    
    // Calcular IMC (BMI = kg / m^2)
    const height_m = data.height_cm / 100;
    const bmi = parseFloat((data.weight_kg / (height_m * height_m)).toFixed(2));

    const { data: result, error } = await client
      .schema('recommendations')
      .from('member_metrics')
      .upsert(
        {
          member_id: memberId,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          bmi,
          goal: data.goal,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'member_id' }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  }

  async getFitnessPlan(memberId: string) {
    const client = this.supabaseService.getClient();

    // 1. Obtener las métricas del usuario para saber su goal
    const { data: metrics, error: metricsErr } = await client
      .schema('recommendations')
      .from('member_metrics')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (metricsErr || !metrics) {
      return { status: 'no_metrics_found', message: 'Por favor, registra tu peso y altura primero para obtener un plan.' };
    }

    // 2. Obtener el plan basado en el goal
    const { data: plan, error: planErr } = await client
      .schema('recommendations')
      .from('fitness_plans')
      .select('*')
      .eq('goal', metrics.goal)
      .single();

    if (planErr || !plan) {
      throw new NotFoundException('No se encontró un plan para este objetivo');
    }

    return {
      metrics,
      plan
    };
  }
}

