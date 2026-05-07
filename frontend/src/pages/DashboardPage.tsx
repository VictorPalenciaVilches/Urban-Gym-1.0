import { useEffect, useState } from 'react';
import { schedulesApi, bookingsApi, waitlistApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Clock, CheckCircle, XCircle, Loader2, ListOrdered, CalendarOff, Ticket } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { DashboardSchedulesSkeleton, DashboardBookingsSkeleton } from '../components/PageSkeletons';

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  available_spots: number;
  classes: {
    name: string;
    instructor: string;
    duration_minutes: number;
  };
}

interface Booking {
  id: string;
  status: string;
  created_at: string;
  schedules: {
    date: string;
    start_time: string;
    classes: {
      name: string;
      instructor: string;
      duration_minutes: number;
    };
  };
}

interface WaitlistEntry {
  id: string;
  schedule_id: string;
  schedules: { date: string; start_time: string; classes: { name: string; instructor: string } };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<any[]>([]);

  const fetchSchedules = async () => {
    try {
      const { data } = await schedulesApi.getAll();
      setSchedules(data);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await bookingsApi.getMy();
      setBookings(data);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchWaitlist = async () => {
    try {
      const { data } = await waitlistApi.getMy();
      setWaitlist(data);
    } catch (_e) {
      // Ignorar error de waitlist silenciosamente
    }
  };

  const fetchRecommendations = async () => {
    if (!user?.id) return;
    try {
      // Import recommendationsApi at the top level
      const { recommendationsApi } = await import('../api/api');
      const { data } = await recommendationsApi.getMemberRecommendations(user.id);
      setRecommendations(data);
    } catch (err) {
      console.warn('Error fetching recommendations', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchBookings();
    fetchWaitlist();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [user?.id]);

  const handleBook = async (scheduleId: string) => {
    setBookingId(scheduleId);
    try {
      await bookingsApi.create(scheduleId);
      await Promise.all([fetchSchedules(), fetchBookings(), fetchWaitlist(), fetchRecommendations()]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Error al reservar');
    } finally {
      setBookingId(null);
    }
  };

  const handleJoinWaitlist = async (scheduleId: string) => {
    setWaitlistId(scheduleId);
    try {
      await waitlistApi.join(scheduleId);
      await fetchWaitlist();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Error al unirse a la lista de espera');
    } finally {
      setWaitlistId(null);
    }
  };

  const handleLeaveWaitlist = async (id: string) => {
    try {
      await waitlistApi.leave(id);
      await fetchWaitlist();
    } catch {
      alert('Error al salir de la lista de espera');
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
      await bookingsApi.cancel(bookingId);
      await Promise.all([fetchSchedules(), fetchBookings(), fetchRecommendations()]);
    } catch {
      alert('Error al cancelar la reserva');
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const confirmedScheduleIds = new Set(activeBookings.map((b) => b.schedules?.date + b.schedules?.start_time));
  const waitlistScheduleIds = new Set(waitlist.map((w) => w.schedule_id));

  const classColors: Record<string, string> = {
    Yoga: 'bg-purple-100 text-purple-700',
    Spinning: 'bg-yellow-100 text-yellow-700',
    CrossFit: 'bg-red-100 text-red-700',
    Boxeo: 'bg-orange-100 text-orange-700',
    Pilates: 'bg-green-100 text-green-700',
  };

  const renderScheduleCard = (schedule: Schedule, isRecommendation = false, reason = '') => {
    const alreadyBooked = confirmedScheduleIds.has(schedule.date + schedule.start_time);
    const colorClass = classColors[schedule.classes?.name] || 'bg-gray-100 text-gray-700';
    return (
      <div
        key={schedule.id}
        className={`group bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-3 relative transition-shadow duration-200 hover:shadow-md ${
          isRecommendation ? 'border-indigo-200/90 ring-1 ring-indigo-100/80' : 'border-slate-200/90'
        }`}
      >
        {isRecommendation && (
          <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {reason}
          </div>
        )}
        <div className="flex items-start justify-between mt-1">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {schedule.classes?.name}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${schedule.available_spots > 5 ? 'bg-green-100 text-green-700' : schedule.available_spots > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {schedule.available_spots} cupos
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-800">{schedule.classes?.instructor}</p>
          <p className="text-sm text-gray-500">{schedule.classes?.duration_minutes} minutos</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays size={14} />
            {new Date(schedule.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {schedule.start_time.slice(0, 5)}
          </span>
        </div>
        {schedule.available_spots > 0 ? (
          <button
            onClick={() => handleBook(schedule.id)}
            disabled={alreadyBooked || bookingId === schedule.id}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              alreadyBooked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {bookingId === schedule.id && <Loader2 size={14} className="animate-spin" />}
            {alreadyBooked ? 'Ya reservado' : 'Reservar'}
          </button>
        ) : (
          <button
            onClick={() => handleJoinWaitlist(schedule.id)}
            disabled={waitlistScheduleIds.has(schedule.id) || waitlistId === schedule.id}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              waitlistScheduleIds.has(schedule.id) ? 'bg-orange-50 text-orange-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
            }`}
          >
            {waitlistId === schedule.id && <Loader2 size={14} className="animate-spin" />}
            <ListOrdered size={14} />
            {waitlistScheduleIds.has(schedule.id) ? 'En lista de espera' : 'Lista de espera'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Hola, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">Aquí puedes ver las clases disponibles y gestionar tus reservas.</p>
      </div>

      {/* Alerta de pago si no está activo */}
      {user?.role === 'member' && user?.subscription_status !== 'active' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="p-2 bg-amber-100 rounded-full h-fit">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Suscripción pendiente o inactiva</h3>
              <p className="text-sm text-amber-700 mt-0.5">
                Para poder reservar clases y acceder a todas las instalaciones, debes completar el pago de tu plan.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/perfil'}
            className="whitespace-nowrap px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors shadow-sm"
          >
            Completar pago ahora
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 card-hover animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <CalendarDays size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{activeBookings.length}</p>
              <p className="text-sm text-gray-500">Reservas Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 card-hover animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{schedules.length}</p>
              <p className="text-sm text-gray-500">Clases Disponibles</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 card-hover animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <ListOrdered size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{waitlist.length}</p>
              <p className="text-sm text-gray-500">En Lista de Espera</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">⭐ Recomendado para ti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => renderScheduleCard(rec, true, rec.recommendation_reason))}
          </div>
        </div>
      )}

      {/* Clases disponibles */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Clases Disponibles</h2>
        {loadingSchedules ? (
          <DashboardSchedulesSkeleton />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No hay horarios publicados"
            description="Cuando el equipo cargue nuevas sesiones, podrás reservar o unirte a la lista de espera desde aquí."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => renderScheduleCard(schedule, false))}
          </div>
        )}
      </div>

      {/* Lista de espera */}
      {waitlist.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Mi Lista de Espera</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100/90 overflow-hidden">
            <div className="sm:hidden divide-y divide-slate-50">
              {waitlist.map((entry) => (
                <div key={entry.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800">{entry.schedules?.classes?.name}</span>
                    <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">Lista de espera</span>
                  </div>
                  <p className="text-sm text-slate-600">{entry.schedules?.classes?.instructor}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.schedules?.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {entry.schedules?.start_time?.slice(0, 5)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLeaveWaitlist(entry.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 w-full justify-center py-2 rounded-xl border border-red-100 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={16} /> Salir de la lista
                  </button>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto table-shell">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-orange-50 border-b border-orange-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-orange-700">Clase</th>
                    <th className="px-6 py-3 text-left font-medium text-orange-700">Instructor</th>
                    <th className="px-6 py-3 text-left font-medium text-orange-700">Fecha</th>
                    <th className="px-6 py-3 text-left font-medium text-orange-700">Hora</th>
                    <th className="px-6 py-3 text-left font-medium text-orange-700">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {waitlist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{entry.schedules?.classes?.name}</td>
                      <td className="px-6 py-4 text-gray-600">{entry.schedules?.classes?.instructor}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(entry.schedules?.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{entry.schedules?.start_time?.slice(0, 5)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleLeaveWaitlist(entry.id)} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                          <XCircle size={13} /> Salir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mis Reservas */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Mis Reservas</h2>
        {loadingBookings ? (
          <DashboardBookingsSkeleton />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Aún no tienes reservas"
            description="Elige una clase arriba y confirma tu cupo. Las reservas confirmadas aparecerán aquí con fecha y hora."
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
            <div className="sm:hidden divide-y divide-slate-50">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800">{booking.schedules?.classes?.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {booking.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{booking.schedules?.classes?.instructor}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(booking.schedules?.date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {booking.schedules?.start_time?.slice(0, 5)}
                  </p>
                  {booking.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(booking.id)}
                      className="mt-2 w-full py-2 text-sm font-medium text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle size={16} /> Cancelar reserva
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto table-shell">
              <table className="w-full text-sm min-w-[540px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Clase</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Instructor</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Fecha</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Hora</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Estado</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{booking.schedules?.classes?.name}</td>
                      <td className="px-6 py-4 text-gray-600">{booking.schedules?.classes?.instructor}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(booking.schedules?.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{booking.schedules?.start_time?.slice(0, 5)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {booking.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            <XCircle size={14} />
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
