import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutsApi, membersApi, progressApi } from '../api/api';
import { Dumbbell, Flame, Clock, Activity, Cpu, Trophy, CalendarDays } from 'lucide-react';

interface Workout {
  id: string;
  machine_id: string;
  member_id: string;
  duration_minutes: number;
  calories: number;
  normalized_event: {
    machine_name: string;
    machine_type: string;
    metrics: {
      distance_km: number | null;
      avg_heart_rate: number | null;
      max_speed_kmh: number | null;
      resistance_level: number | null;
      reps: number | null;
      sets: number | null;
    };
  };
  event_type: string;
  created_at: string;
}

interface Stats {
  total_workouts: number;
  total_minutes: number;
  total_calories: number;
  weekly_workouts?: number;
  best_duration_minutes?: number;
  best_calories?: number;
  last_workout_at?: string | null;
}

interface PersonalRecords {
  best_calories_session: { calories: number; duration_minutes: number; workout_date: string } | null;
  best_duration_session: { duration_minutes: number; calories: number; workout_date: string } | null;
  best_by_machine_type: Record<string, { calories: number; duration_minutes: number; machine_type: string }>;
}

const typeColor = (type: string) => {
  if (type === 'cardio') return 'bg-blue-100 text-blue-700';
  if (type === 'pesas') return 'bg-orange-100 text-orange-700';
  return 'bg-purple-100 text-purple-700';
};

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'trainer';

  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      Promise.allSettled([workoutsApi.getAll(), membersApi.getAll()])
        .then(([wRes, mRes]) => {
          if (wRes.status === 'fulfilled') setWorkouts(wRes.value.data ?? []);
          if (mRes.status === 'fulfilled') {
            const map: Record<string, string> = {};
            (mRes.value.data ?? []).forEach((member: { id: string; name: string }) => { map[member.id] = member.name; });
            setMemberMap(map);
          }
        })
        .finally(() => setLoading(false));
    } else {
      Promise.allSettled([
        workoutsApi.getByMember(user.id),
        progressApi.getMyStats(),
        progressApi.getMyRecords(),
      ]).then(([wRes, sRes, rRes]) => {
        if (wRes.status === 'fulfilled') setWorkouts(wRes.value.data ?? []);
        if (sRes.status === 'fulfilled') setStats(sRes.value.data);
        if (rRes.status === 'fulfilled') setRecords(rRes.value.data);
      }).finally(() => setLoading(false));
    }
  }, [user, isAdmin]);

  return (
    <div className="space-y-6 max-w-5xl page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {isAdmin ? 'Monitoreo IoT' : 'Mis Entrenamientos'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isAdmin
            ? 'Todos los entrenamientos registrados por las máquinas del gimnasio.'
            : 'Historial de actividad registrada por las máquinas.'}
        </p>
      </div>

      {/* Stats globales para admin */}
      {isAdmin && workouts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-lg"><Cpu size={22} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Sesiones totales</p>
              <p className="text-2xl font-bold text-gray-800">{workouts.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg"><Clock size={22} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Minutos totales</p>
              <p className="text-2xl font-bold text-gray-800">
                {workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg"><Flame size={22} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Calorías totales</p>
              <p className="text-2xl font-bold text-gray-800">
                {workouts.reduce((s, w) => s + (w.calories || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats personales para miembros */}
      {!isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-lg"><Dumbbell size={22} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total sesiones</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_workouts}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg"><Clock size={22} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Minutos totales</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_minutes}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg"><Flame size={22} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Calorías quemadas</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total_calories}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg"><CalendarDays size={22} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Esta semana</p>
              <p className="text-2xl font-bold text-gray-800">{stats.weekly_workouts ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Récords personales */}
      {!isAdmin && records && (records.best_calories_session || records.best_duration_session) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={17} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Récords personales</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.best_calories_session && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs text-red-500 font-medium mb-1">Mejor sesión por calorías</p>
                <p className="text-2xl font-bold text-red-600">{records.best_calories_session.calories} kcal</p>
                <p className="text-xs text-gray-500 mt-1">
                  {records.best_calories_session.duration_minutes} min ·{' '}
                  {new Date(records.best_calories_session.workout_date).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {records.best_duration_session && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Sesión más larga</p>
                <p className="text-2xl font-bold text-green-700">{records.best_duration_session.duration_minutes} min</p>
                <p className="text-xs text-gray-500 mt-1">
                  {records.best_duration_session.calories} kcal ·{' '}
                  {new Date(records.best_duration_session.workout_date).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Activity size={17} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-800 text-sm">
            {isAdmin ? 'Registro de entrenamientos' : 'Historial de sesiones'}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 p-6">Cargando entrenamientos...</p>
        ) : workouts.length === 0 ? (
          <div className="p-10 text-center">
            <Dumbbell size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No hay entrenamientos registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {isAdmin && <th className="px-5 py-3 text-left">Socio</th>}
                <th className="px-5 py-3 text-left">Máquina</th>
                <th className="px-5 py-3 text-left">Tipo</th>
                <th className="px-5 py-3 text-center">Duración</th>
                <th className="px-5 py-3 text-center">Calorías</th>
                <th className="px-5 py-3 text-center">Métricas</th>
                <th className="px-5 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workouts.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-xs">
                            {(memberMap[w.member_id] || 'T').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 text-sm">
                          {memberMap[w.member_id] || 'Test User'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {w.normalized_event?.machine_name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor(w.normalized_event?.machine_type ?? '')}`}>
                      {w.normalized_event?.machine_type ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">
                    <span className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-gray-400" /> {w.duration_minutes} min
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">
                    <span className="flex items-center justify-center gap-1">
                      <Flame size={12} className="text-red-400" /> {w.calories} kcal
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-xs text-gray-500">
                    {w.normalized_event?.metrics?.distance_km && (
                      <span className="mr-2">📍 {w.normalized_event.metrics.distance_km} km</span>
                    )}
                    {w.normalized_event?.metrics?.avg_heart_rate && (
                      <span className="mr-2">❤️ {w.normalized_event.metrics.avg_heart_rate} bpm</span>
                    )}
                    {w.normalized_event?.metrics?.reps && (
                      <span>🔁 {w.normalized_event.metrics.reps} reps · {w.normalized_event.metrics.sets} sets</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">
                    {new Date(w.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
