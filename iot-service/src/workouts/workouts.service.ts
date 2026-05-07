import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';

export interface RawWorkoutData {
  member_id: string;
  duration_minutes: number;
  calories?: number;
  distance_km?: number;
  avg_heart_rate?: number;
  max_speed_kmh?: number;
  resistance_level?: number;
  reps?: number;
  sets?: number;
}

export interface NormalizedWorkout {
  event_type: string;
  machine_id: string;
  machine_name: string;
  machine_type: string;
  member_id: string;
  duration_minutes: number;
  calories: number;
  metrics: Record<string, any>;
  published_at: string;
}

@Injectable()
export class WorkoutsService {
  constructor(
    private supabaseService: SupabaseService,
    private eventEmitter: EventEmitter2,
    private redisService: RedisService,
  ) {}

  normalize(machine: any, raw: RawWorkoutData): NormalizedWorkout {
    return {
      event_type: 'workout.completed',
      machine_id: machine.id,
      machine_name: machine.name,
      machine_type: machine.type,
      member_id: raw.member_id,
      duration_minutes: raw.duration_minutes,
      calories: raw.calories ?? 0,
      metrics: {
        distance_km: raw.distance_km ?? null,
        avg_heart_rate: raw.avg_heart_rate ?? null,
        max_speed_kmh: raw.max_speed_kmh ?? null,
        resistance_level: raw.resistance_level ?? null,
        reps: raw.reps ?? null,
        sets: raw.sets ?? null,
      },
      published_at: new Date().toISOString(),
    };
  }

  async recordWorkout(machine: any, raw: RawWorkoutData) {
    const normalized = this.normalize(machine, raw);

    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('workouts')
      .insert({
        machine_id: machine.id,
        member_id: raw.member_id,
        duration_minutes: raw.duration_minutes,
        calories: normalized.calories,
        raw_data: raw,
        normalized_event: normalized,
        event_type: 'workout.completed',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Publicar evento interno (in-process)
    this.eventEmitter.emit('workout.completed', normalized);

    // Publicar evento en Redis para otros servicios suscritos
    this.redisService.publish('workout.completed', normalized).catch(() => {});

    // Notificar al Workout & Progress Service (HTTP fallback)
    this.notifyProgressService(normalized).catch(() => {
      console.warn('No se pudo notificar al progress service via HTTP');
    });

    return {
      message: 'Entrenamiento registrado',
      workout: data,
      event: normalized,
    };
  }

  private async notifyProgressService(normalized: NormalizedWorkout) {
    const progressUrl =
      process.env.PROGRESS_SERVICE_URL ?? 'http://localhost:3005';
    const internalSecret =
      process.env.INTERNAL_SECRET ?? 'urbangym_internal_secret_2024';

    await fetch(`${progressUrl}/progress/workout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalSecret,
      },
      body: JSON.stringify({
        member_id: normalized.member_id,
        machine_id: normalized.machine_id,
        machine_name: normalized.machine_name,
        machine_type: normalized.machine_type,
        duration_minutes: normalized.duration_minutes,
        calories: normalized.calories,
        metrics: normalized.metrics,
        source: 'iot',
      }),
    });
  }

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findByMember(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('workouts')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getStats(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('iot')
      .from('workouts')
      .select('duration_minutes, calories, created_at')
      .eq('member_id', memberId);

    if (error) throw new Error(error.message);

    const total_workouts = data.length;
    const total_minutes = data.reduce(
      (sum, w) => sum + (w.duration_minutes || 0),
      0,
    );
    const total_calories = data.reduce((sum, w) => sum + (w.calories || 0), 0);

    return { total_workouts, total_minutes, total_calories };
  }
}
