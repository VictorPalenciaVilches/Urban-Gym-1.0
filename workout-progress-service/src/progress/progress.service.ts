import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RecordWorkoutDto } from './dto/record-workout.dto';

@Injectable()
export class ProgressService {
  constructor(private supabaseService: SupabaseService) {}

  async recordWorkout(dto: RecordWorkoutDto) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .schema('progress')
      .from('workout_records')
      .insert({
        member_id: dto.member_id,
        source: dto.source ?? 'iot',
        machine_id: dto.machine_id ?? null,
        machine_name: dto.machine_name ?? null,
        machine_type: dto.machine_type ?? null,
        duration_minutes: dto.duration_minutes,
        calories: dto.calories ?? 0,
        metrics: dto.metrics ?? {},
        workout_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.recalculateMetrics(dto.member_id);

    return { message: 'Entrenamiento registrado en progreso', record: data };
  }

  async getHistory(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('progress')
      .from('workout_records')
      .select('*')
      .eq('member_id', memberId)
      .order('workout_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getStats(memberId: string) {
    const metrics = await this.getOrCreateMetrics(memberId);
    return metrics;
  }

  async getPersonalRecords(memberId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .schema('progress')
      .from('workout_records')
      .select('duration_minutes, calories, machine_type, workout_date')
      .eq('member_id', memberId)
      .order('calories', { ascending: false });

    if (error) throw new Error(error.message);

    const bestByType: Record<string, any> = {};
    for (const w of data ?? []) {
      const tipo = w.machine_type ?? 'general';
      if (!bestByType[tipo] || w.calories > bestByType[tipo].calories) {
        bestByType[tipo] = w;
      }
    }

    const bestCalories = data?.[0] ?? null;
    const bestDuration = [...(data ?? [])].sort(
      (a, b) => b.duration_minutes - a.duration_minutes,
    )[0] ?? null;

    return {
      best_calories_session: bestCalories,
      best_duration_session: bestDuration,
      best_by_machine_type: bestByType,
    };
  }

  private async recalculateMetrics(memberId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .schema('progress')
      .from('workout_records')
      .select('duration_minutes, calories, workout_date')
      .eq('member_id', memberId);

    if (error || !data) return;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const total_workouts = data.length;
    const total_minutes = data.reduce((s, w) => s + (w.duration_minutes ?? 0), 0);
    const total_calories = data.reduce((s, w) => s + (w.calories ?? 0), 0);
    const weekly_workouts = data.filter(
      (w) => new Date(w.workout_date) >= weekAgo,
    ).length;
    const best_duration_minutes = Math.max(...data.map((w) => w.duration_minutes ?? 0), 0);
    const best_calories = Math.max(...data.map((w) => w.calories ?? 0), 0);
    const last_workout_at = data.sort(
      (a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime(),
    )[0]?.workout_date ?? null;

    await client
      .schema('progress')
      .from('progress_metrics')
      .upsert(
        {
          member_id: memberId,
          total_workouts,
          total_minutes,
          total_calories,
          weekly_workouts,
          best_duration_minutes,
          best_calories,
          last_workout_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id' },
      );
  }

  private async getOrCreateMetrics(memberId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .schema('progress')
      .from('progress_metrics')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No existe aún, devolver vacío
      return {
        member_id: memberId,
        total_workouts: 0,
        total_minutes: 0,
        total_calories: 0,
        weekly_workouts: 0,
        best_duration_minutes: 0,
        best_calories: 0,
        last_workout_at: null,
      };
    }

    if (error) throw new Error(error.message);
    return data;
  }

  async migrateFromIot() {
    const client = this.supabaseService.getClient();

    // Leer todos los workouts del IoT service
    const { data: iotWorkouts, error } = await client
      .schema('iot')
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!iotWorkouts || iotWorkouts.length === 0) {
      return { message: 'No hay workouts en IoT para migrar', migrated: 0 };
    }

    // Limpiar registros previos para evitar duplicados
    await client.schema('progress').from('workout_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insertar todos en progress.workout_records
    const records = iotWorkouts.map((w: any) => ({
      member_id: w.member_id,
      source: 'iot',
      machine_id: w.machine_id ?? null,
      machine_name: w.normalized_event?.machine_name ?? null,
      machine_type: w.normalized_event?.machine_type ?? null,
      duration_minutes: w.duration_minutes ?? 0,
      calories: w.calories ?? 0,
      metrics: w.normalized_event?.metrics ?? {},
      workout_date: w.created_at,
    }));

    const { error: insertError } = await client
      .schema('progress')
      .from('workout_records')
      .insert(records);

    if (insertError) throw new Error(insertError.message);

    // Recalcular métricas para cada miembro único
    const memberIds = [...new Set(iotWorkouts.map((w: any) => w.member_id as string))];
    for (const memberId of memberIds) {
      await this.recalculateMetrics(memberId);
    }

    return { message: 'Migración completada', migrated: records.length };
  }
}
