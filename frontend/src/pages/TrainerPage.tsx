import { useEffect, useState } from 'react';
import { membersApi, schedulesApi, workoutsApi, authApi } from '../api/api';
import { TrainerPageSkeleton } from '../components/PageSkeletons';
import {
  User, Mail, Phone, CheckCircle, XCircle, CalendarDays, Loader2,
  Search, Dumbbell, Flame, Clock, QrCode, ShieldCheck, ShieldX
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  roles: { name: string };
}

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  available_spots: number;
  classes: { name: string; instructor: string; duration_minutes: number };
}

interface Workout {
  id: string;
  duration_minutes: number;
  calories: number;
  created_at: string;
  raw_data: {
    member_id: string;
    duration_minutes: number;
    calories?: number;
    reps?: number;
    sets?: number;
    resistance_level?: number;
    distance_km?: number;
  };
  normalized_event: { machine_name: string; machine_type: string };
}

interface QRResult {
  valid: boolean;
  reason?: string;
  member?: {
    name: string;
    email: string;
    subscription_plan: string;
    subscription_status: string;
    role: string;
  };
}

export default function TrainerPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'workouts' | 'qr'>('perfil');
  const [qrToken, setQrToken] = useState('');
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [validatingQR, setValidatingQR] = useState(false);

  useEffect(() => {
    Promise.allSettled([membersApi.getAll(), schedulesApi.getAll()])
      .then(([m, s]) => {
        if (m.status === 'fulfilled') setMembers(m.value.data);
        if (s.status === 'fulfilled') setSchedules(s.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectMember = async (member: Member) => {
    setSelected(member);
    setActiveTab('perfil');
    setQrResult(null);
    setLoadingWorkouts(true);
    try {
      const res = await workoutsApi.getByMember(member.id);
      setWorkouts(res.data);
    } catch {
      setWorkouts([]);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const validateQR = async () => {
    if (!qrToken.trim()) return;
    setValidatingQR(true);
    setQrResult(null);
    try {
      const res = await authApi.validateQR(qrToken.trim());
      setQrResult(res.data);
    } catch {
      setQrResult({ valid: false, reason: 'Error al validar el token' });
    } finally {
      setValidatingQR(false);
    }
  };

  if (loading) {
    return <TrainerPageSkeleton />;
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalMinutes = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const totalCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Panel del Entrenador</h1>
        <p className="text-gray-500 mt-1">Monitorea socios, revisa entrenamientos y valida accesos por QR.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de socios */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar socio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {filtered.map((member) => (
                <button
                  key={member.id}
                  onClick={() => selectMember(member)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${selected?.id === member.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                >
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-semibold text-sm">{member.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${member.subscription_status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">No se encontraron socios.</p>
              )}
            </div>
          </div>

          {/* Validar QR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <QrCode size={18} className="text-indigo-500" />
              Validar Acceso QR
            </h3>
            <textarea
              rows={3}
              value={qrToken}
              onChange={(e) => { setQrToken(e.target.value); setQrResult(null); }}
              placeholder="Pega aquí el token QR del socio..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              onClick={validateQR}
              disabled={!qrToken.trim() || validatingQR}
              className="mt-2 w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {validatingQR ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {validatingQR ? 'Validando...' : 'Validar QR'}
            </button>

            {qrResult && (
              <div className={`mt-3 p-3 rounded-xl border ${qrResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {qrResult.valid
                    ? <ShieldCheck size={18} className="text-green-600" />
                    : <ShieldX size={18} className="text-red-500" />}
                  <span className={`font-semibold text-sm ${qrResult.valid ? 'text-green-700' : 'text-red-600'}`}>
                    {qrResult.valid ? 'Acceso permitido' : 'Acceso denegado'}
                  </span>
                </div>
                {qrResult.valid && qrResult.member && (
                  <div className="text-xs text-green-700 space-y-0.5 mt-1">
                    <p className="font-medium">{qrResult.member.name}</p>
                    <p>{qrResult.member.email}</p>
                    <p className="capitalize">Plan: {qrResult.member.subscription_plan}</p>
                  </div>
                )}
                {!qrResult.valid && (
                  <p className="text-xs text-red-600 mt-1">{qrResult.reason}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto overscroll-x-contain">
                {(['perfil', 'workouts', 'qr'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`min-w-[calc(33.333%-0.25rem)] sm:min-w-0 sm:flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab === 'workouts' ? 'Entrenamientos' : tab === 'qr' ? 'Generar QR' : 'Perfil'}
                  </button>
                ))}
              </div>

              {/* Tab: Perfil */}
              {activeTab === 'perfil' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-indigo-700">{selected.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 capitalize">
                            {selected.roles?.name || 'member'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selected.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selected.subscription_status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 bg-gray-100 rounded-lg"><Mail size={16} className="text-gray-600" /></div>
                        <div><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{selected.email}</p></div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 bg-gray-100 rounded-lg"><Phone size={16} className="text-gray-600" /></div>
                        <div><p className="text-xs text-gray-400">Teléfono</p><p className="font-medium text-gray-800">{selected.phone || 'No registrado'}</p></div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 bg-gray-100 rounded-lg"><User size={16} className="text-gray-600" /></div>
                        <div><p className="text-xs text-gray-400">Plan</p><p className="font-medium text-gray-800 capitalize">{selected.subscription_plan || 'Básico'}</p></div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 bg-gray-100 rounded-lg"><CalendarDays size={16} className="text-gray-600" /></div>
                        <div><p className="text-xs text-gray-400">Miembro desde</p><p className="font-medium text-gray-800">{new Date(selected.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Estado del Socio</h3>
                    <div className="flex items-center gap-3">
                      {selected.subscription_status === 'active'
                        ? <CheckCircle size={40} className="text-green-500" />
                        : <XCircle size={40} className="text-red-400" />}
                      <div>
                        <p className="font-semibold text-gray-800">
                          {selected.subscription_status === 'active' ? 'Suscripción Activa' : 'Suscripción Inactiva'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selected.subscription_status === 'active'
                            ? 'El socio tiene acceso completo a las instalaciones.'
                            : 'El socio no tiene acceso activo. Verificar pago.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Clases Disponibles</h3>
                    <div className="space-y-2">
                      {schedules.length === 0 ? (
                        <p className="text-sm text-gray-400">No hay clases disponibles.</p>
                      ) : (
                        schedules.slice(0, 5).map((s) => (
                          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg text-sm gap-2">
                            <div>
                              <span className="font-medium text-gray-800">{s.classes?.name}</span>
                              <span className="text-gray-400 ml-2 text-xs">· {s.classes?.instructor}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-gray-500 flex-wrap">
                              <span className="text-xs">{new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                              <span className="text-xs">{s.start_time?.slice(0, 5)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.available_spots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {s.available_spots} cupos
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Entrenamientos */}
              {activeTab === 'workouts' && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 text-center hover:shadow-md transition-shadow">
                      <div className="inline-flex p-1.5 sm:p-2 bg-indigo-100 rounded-lg mb-1.5 sm:mb-2"><Dumbbell size={16} className="text-indigo-600" /></div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800">{workouts.length}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Entrenamientos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 text-center hover:shadow-md transition-shadow">
                      <div className="inline-flex p-1.5 sm:p-2 bg-blue-100 rounded-lg mb-1.5 sm:mb-2"><Clock size={16} className="text-blue-600" /></div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800">{totalMinutes}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Min. totales</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 text-center hover:shadow-md transition-shadow">
                      <div className="inline-flex p-1.5 sm:p-2 bg-orange-100 rounded-lg mb-1.5 sm:mb-2"><Flame size={16} className="text-orange-500" /></div>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800">{totalCalories}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Calorías</p>
                    </div>
                  </div>

                  {/* Historial */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">Historial de entrenamientos</h3>
                    </div>
                    {loadingWorkouts ? (
                      <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
                    ) : workouts.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <Dumbbell size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Sin entrenamientos registrados aún.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {workouts.map((w) => (
                          <div
                            key={w.id}
                            className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                <Dumbbell size={16} className="text-indigo-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-800 text-sm truncate">
                                  {w.normalized_event?.machine_name || 'Máquina'}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">
                                  {w.normalized_event?.machine_type || 'general'} · {new Date(w.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 text-sm pl-[3.25rem] sm:pl-0 shrink-0">
                              <div className="text-center">
                                <p className="font-semibold text-gray-800">{w.duration_minutes} min</p>
                                <p className="text-xs text-gray-400">Duración</p>
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-orange-500">{w.calories} kcal</p>
                                <p className="text-xs text-gray-400">Calorías</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: QR */}
              {activeTab === 'qr' && (
                <MemberQR member={selected} />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center h-full">
              <User size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">Selecciona un socio</p>
              <p className="text-gray-300 text-sm mt-1">Haz clic en un socio para ver su perfil y entrenamientos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberQR({ member }: { member: { id: string; name: string; email: string } }) {
  const [qrData, setQrData] = useState<{ qrCode: string; expiresAt: string; qrToken: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await authApi.getQR();
      setQrData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <QrCode size={40} className="text-indigo-400 mx-auto mb-3" />
      <h3 className="font-bold text-gray-800 text-lg">Código QR de Acceso</h3>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Genera el QR de acceso para <span className="font-medium text-gray-700">{member.name}</span>
      </p>

      {qrData ? (
        <div className="space-y-4">
          <img src={qrData.qrCode} alt="QR Code" className="mx-auto rounded-xl border border-gray-100 shadow-sm" />
          <p className="text-xs text-gray-400">
            Válido hasta: {new Date(qrData.expiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-left">
            <p className="text-xs text-gray-400 mb-1 font-medium">Token (para pruebas):</p>
            <p className="text-xs font-mono text-gray-600 break-all">{qrData.qrToken.slice(0, 80)}...</p>
          </div>
          <button
            onClick={generateQR}
            className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
          >
            Regenerar QR
          </button>
        </div>
      ) : (
        <button
          onClick={generateQR}
          disabled={loading}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
          {loading ? 'Generando...' : 'Generar QR'}
        </button>
      )}
    </div>
  );
}
