import React, { useEffect, useState } from 'react';
import { membersApi, classesApi, schedulesApi, bookingsApi, billingApi } from '../api/api';
import { AdminPageSkeleton } from '../components/PageSkeletons';
import {
  Users, CheckCircle, Dumbbell, CalendarDays, Loader2, TrendingUp,
  ChevronDown, Shield, UserCheck, Crown, ToggleLeft, ToggleRight, Trash2,
  Plus, X, Clock, DollarSign, Receipt, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  role_id: string;
  roles: { name: string };
}

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  available_spots: number;
  classes: { name: string; instructor: string; capacity: number; duration_minutes: number };
}

interface Class {
  id: string;
  name: string;
  instructor: string;
  capacity: number;
}

const ROLE_IDS = {
  admin: '43d2f389-e7fd-4080-a85e-2ac9bec7702e',
  trainer: '74b2fd8a-11ad-400a-9361-77ac5c5fab9d',
  member: 'fcc28f0b-8000-4ecd-8b25-341a3955b2f5',
};

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: <Crown size={12} /> },
  trainer: { label: 'Entrenador', color: 'bg-blue-100 text-blue-700', icon: <UserCheck size={12} /> },
  member: { label: 'Socio', color: 'bg-gray-100 text-gray-700', icon: <Shield size={12} /> },
};

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ class_id: '', date: '', start_time: '', available_spots: 15 });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [scheduleBookings, setScheduleBookings] = useState<Record<string, { id: string; member_id: string; status: string }[]>>({});
  const [markingAttend, setMarkingAttend] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<{
    total_revenue_cop: string;
    active_subscriptions: number;
    by_plan: Record<string, number>;
    total_payments: number;
  } | null>(null);
  const [recentPayments, setRecentPayments] = useState<{ id: string; invoice_number: string; created_at?: string; payment_date?: string; amount: number; status: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = () => {
    Promise.all([
      membersApi.getAll(),
      schedulesApi.getAll(),
      classesApi.getAll(),
      billingApi.getRevenue().catch(() => ({ data: null })),
      billingApi.getAllPayments().catch(() => ({ data: [] })),
    ]).then(([m, s, c, rev, pay]) => {
        setMembers(m.data);
        setSchedules(s.data);
        setClasses(c.data);
        if (rev.data) setRevenue(rev.data);
        if (pay.data) setRecentPayments(pay.data.slice(0, 8));
      })
      .finally(() => setLoading(false));
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const updateMember = async (id: string, payload: object, successMsg: string) => {
    setUpdating(id);
    setOpenMenu(null);
    try {
      await membersApi.update(id, payload);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...payload } : m))
      );
      // Recargar para obtener roles actualizados
      const res = await membersApi.getAll();
      setMembers(res.data);
      showToast(successMsg);
    } catch {
      showToast('Error al actualizar el socio', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;
    setUpdating(id);
    try {
      await membersApi.remove(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      showToast(`"${name}" eliminado correctamente`);
    } catch {
      showToast('Error al eliminar el socio', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const createSchedule = async () => {
    if (!scheduleForm.class_id || !scheduleForm.date || !scheduleForm.start_time) return;
    setSavingSchedule(true);
    try {
      await schedulesApi.create({
        ...scheduleForm,
        available_spots: Number(scheduleForm.available_spots),
      });
      const res = await schedulesApi.getAll();
      setSchedules(res.data);
      setScheduleForm({ class_id: '', date: '', start_time: '', available_spots: 15 });
      setShowScheduleForm(false);
      showToast('Horario creado correctamente');
    } catch {
      showToast('Error al crear el horario', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    try {
      await schedulesApi.remove(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      showToast('Horario eliminado');
    } catch {
      showToast('Error al eliminar el horario', 'error');
    }
  };

  const toggleScheduleBookings = async (scheduleId: string) => {
    if (expandedSchedule === scheduleId) {
      setExpandedSchedule(null);
      return;
    }
    setExpandedSchedule(scheduleId);
    if (!scheduleBookings[scheduleId]) {
      try {
        const { data } = await schedulesApi.getBookings(scheduleId);
        setScheduleBookings((prev) => ({ ...prev, [scheduleId]: data }));
      } catch {
        showToast('Error al cargar reservas', 'error');
      }
    }
  };

  const markAttendance = async (bookingId: string, scheduleId: string) => {
    setMarkingAttend(bookingId);
    try {
      await bookingsApi.attend(bookingId);
      setScheduleBookings((prev) => ({
        ...prev,
        [scheduleId]: prev[scheduleId].map((b) =>
          b.id === bookingId ? { ...b, status: 'attended' } : b,
        ),
      }));
      showToast('Asistencia registrada');
    } catch {
      showToast('Error al registrar asistencia', 'error');
    } finally {
      setMarkingAttend(null);
    }
  };

  if (loading) {
    return <AdminPageSkeleton />;
  }

  const activeMembers = members.filter((m) => m.subscription_status === 'active');
  const inactiveMembers = members.filter((m) => m.subscription_status !== 'active');
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const occupancyData = classes.map((cls) => {
    const classSchedules = schedules.filter((s) => s.classes?.name === cls.name);
    const totalCapacity = classSchedules.reduce((acc, _s) => acc + (cls.capacity || 10), 0);
    const occupiedSpots = classSchedules.reduce((acc, s) => acc + ((cls.capacity || 10) - s.available_spots), 0);
    const occupancy = totalCapacity > 0 ? Math.round((occupiedSpots / totalCapacity) * 100) : 0;
    return { name: cls.name, ocupacion: occupancy, disponibles: classSchedules.length };
  });

  const formatCOP = (cents: number) =>
    `$ ${(cents / 100).toLocaleString('es-CO')} COP`;

  const totalRevenueCOP = revenue
    ? formatCOP(parseFloat(revenue.total_revenue_cop) * 100)
    : '$ 0 COP';

  const kpis = [
    { label: 'Total Socios', value: members.length, icon: <Users size={22} />, color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Socios Activos', value: activeMembers.length, icon: <CheckCircle size={22} />, color: 'bg-green-100 text-green-600' },
    { label: 'Socios Inactivos', value: inactiveMembers.length, icon: <TrendingUp size={22} />, color: 'bg-red-100 text-red-600' },
    { label: 'Clases Ofertadas', value: classes.length, icon: <Dumbbell size={22} />, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Horarios Activos', value: schedules.length, icon: <CalendarDays size={22} />, color: 'bg-blue-100 text-blue-600' },
    { label: 'Suscripciones Activas', value: revenue?.active_subscriptions ?? 0, icon: <CreditCard size={22} />, color: 'bg-purple-100 text-purple-600' },
    { label: 'Pagos Procesados', value: revenue?.total_payments ?? 0, icon: <Receipt size={22} />, color: 'bg-pink-100 text-pink-600' },
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const evolutionData = (() => {
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const key = new Date(m.created_at).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([mes, nuevos]) => ({ mes, nuevos }));
  })();

  return (
    <div className="space-y-8 page-enter" onClick={() => setOpenMenu(null)}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed z-50 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold toast-enter-mobile flex items-center gap-2 left-3 right-3 top-[4.5rem] sm:left-auto sm:right-5 sm:top-5 sm:max-w-md sm:ml-auto ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">Visión global de la plataforma UrbanGym</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 stagger">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 card-hover animate-fade-up cursor-default">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${kpi.color}`}>{kpi.icon}</div>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Ocupación por Clase</h2>
          <p className="text-sm text-gray-500 mb-4">Porcentaje de cupos ocupados</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={occupancyData} barSize={36}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Ocupación']} />
              <Bar dataKey="ocupacion" radius={[6, 6, 0, 0]}>
                {occupancyData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Evolución de Socios</h2>
          <p className="text-sm text-gray-500 mb-4">Nuevos registros por mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value} socios`, 'Nuevos']} />
              <Legend />
              <Line type="monotone" dataKey="nuevos" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Nuevos socios" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gestión de horarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800">Gestión de Horarios</h2>
            <p className="text-xs text-gray-400 mt-0.5">Crea y elimina horarios de clases</p>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            {showScheduleForm ? <X size={16} /> : <Plus size={16} />}
            {showScheduleForm ? 'Cancelar' : 'Nuevo horario'}
          </button>
        </div>

        {/* Formulario nuevo horario */}
        {showScheduleForm && (
          <div className="px-6 py-5 border-b border-gray-100 bg-indigo-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clase</label>
                <select
                  value={scheduleForm.class_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, class_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seleccionar clase...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.instructor}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cupos disponibles</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={scheduleForm.available_spots}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, available_spots: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
            <button
              onClick={createSchedule}
              disabled={savingSchedule || !scheduleForm.class_id || !scheduleForm.date || !scheduleForm.start_time}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {savingSchedule ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {savingSchedule ? 'Creando...' : 'Crear horario'}
            </button>
          </div>
        )}

        {/* Lista de horarios */}
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {schedules.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No hay horarios registrados.</p>
          ) : (
            schedules.map((s) => (
              <div key={s.id}>
                <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                      <Clock size={16} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{s.classes?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.classes?.instructor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-sm text-gray-500 flex-wrap">
                    <span className="text-xs">{new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="font-medium text-xs">{s.start_time?.slice(0, 5)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.available_spots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.available_spots} cupos
                    </span>
                    <button
                      onClick={() => toggleScheduleBookings(s.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Users size={12} /> Asistencia
                    </button>
                    <button
                      onClick={() => deleteSchedule(s.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar horario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Panel de asistencia expandido */}
                {expandedSchedule === s.id && (
                  <div className="bg-indigo-50 px-8 py-3 border-t border-indigo-100">
                    {!scheduleBookings[s.id] ? (
                      <p className="text-xs text-gray-400">Cargando reservas...</p>
                    ) : scheduleBookings[s.id].length === 0 ? (
                      <p className="text-xs text-gray-400">No hay reservas para este horario.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {scheduleBookings[s.id].map((b) => (
                          <div key={b.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow-sm">
                            <span className="text-xs text-gray-600 font-medium">{b.member_id.slice(0, 8)}…</span>
                            {b.status === 'attended' ? (
                              <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                                <CheckCircle size={12} /> Asistió
                              </span>
                            ) : (
                              <button
                                onClick={() => markAttendance(b.id, s.id)}
                                disabled={markingAttend === b.id}
                                className="text-xs text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                              >
                                {markingAttend === b.id ? '...' : 'Marcar asistencia'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabla de socios con acciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Gestión de Usuarios</h2>
            <p className="text-xs text-gray-400 mt-0.5">Administra roles, planes y estados de cada socio</p>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto table-shell">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Rol</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Registro</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMembers.map((member) => {
                const roleName = member.roles?.name || 'member';
                const roleInfo = ROLE_LABELS[roleName] || ROLE_LABELS.member;
                const isUpdating = updating === member.id;

                return (
                  <tr key={member.id} className={`hover:bg-gray-50 transition-colors ${isUpdating ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-xs">{member.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-gray-800">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{member.email}</td>

                    {/* Rol con dropdown */}
                    <td className="px-6 py-4">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenu(openMenu === `role-${member.id}` ? null : `role-${member.id}`)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${roleInfo.color}`}
                          disabled={isUpdating}
                        >
                          {roleInfo.icon}
                          {roleInfo.label}
                          <ChevronDown size={11} />
                        </button>
                        {openMenu === `role-${member.id}` && (
                          <div className="absolute left-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                            {(Object.entries(ROLE_IDS) as [string, string][]).map(([role, roleId]) => (
                              <button
                                key={role}
                                onClick={() => updateMember(member.id, { role_id: roleId }, `Rol actualizado a ${ROLE_LABELS[role].label}`)}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${roleName === role ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
                              >
                                {ROLE_LABELS[role].icon}
                                {ROLE_LABELS[role].label}
                                {roleName === role && <span className="ml-auto text-indigo-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Plan con dropdown */}
                    <td className="px-6 py-4">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenu(openMenu === `plan-${member.id}` ? null : `plan-${member.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 cursor-pointer hover:opacity-80 capitalize"
                          disabled={isUpdating}
                        >
                          {member.subscription_plan || 'basic'}
                          <ChevronDown size={11} />
                        </button>
                        {openMenu === `plan-${member.id}` && (
                          <div className="absolute left-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[120px]">
                            {['basic', 'premium', 'vip'].map((plan) => (
                              <button
                                key={plan}
                                onClick={() => updateMember(member.id, { subscription_plan: plan }, `Plan actualizado a ${plan}`)}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 capitalize flex items-center justify-between ${member.subscription_plan === plan ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
                              >
                                {plan}
                                {member.subscription_plan === plan && <span className="text-indigo-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Toggle estado */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => updateMember(
                          member.id,
                          { subscription_status: member.subscription_status === 'active' ? 'inactive' : 'active' },
                          `Socio ${member.subscription_status === 'active' ? 'desactivado' : 'activado'}`
                        )}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-75 transition-opacity"
                      >
                        {member.subscription_status === 'active' ? (
                          <>
                            <ToggleRight size={20} className="text-green-500" />
                            <span className="text-green-600">Activo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={20} className="text-gray-400" />
                            <span className="text-gray-400">Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(member.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Eliminar */}
                    <td className="px-6 py-4 text-center">
                      {isUpdating ? (
                        <Loader2 size={16} className="animate-spin text-indigo-400 mx-auto" />
                      ) : (
                        <button
                          onClick={() => deleteMember(member.id, member.name)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar socio"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-400">No se encontraron socios.</div>
          )}
        </div>
      </div>

      {/* Ingresos y Facturación */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <DollarSign size={20} className="text-indigo-500" />
            Ingresos y Facturación
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Resumen financiero del gimnasio</p>
        </div>

        {/* Tarjetas de ingresos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <p className="text-sm font-medium text-indigo-200 mb-1">Ingresos Totales</p>
            <p className="text-2xl font-bold">{totalRevenueCOP}</p>
            <p className="text-xs text-indigo-200 mt-1">{revenue?.total_payments ?? 0} pagos procesados</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Suscripciones Activas</p>
            <p className="text-3xl font-bold text-gray-800">{revenue?.active_subscriptions ?? 0}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(revenue?.by_plan ?? {}).map(([plan, count]) => (
                <span key={plan} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold capitalize">
                  {plan}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Ingreso Mensual Proyectado</p>
            <p className="text-3xl font-bold text-gray-800">
              {formatCOP(
                ((revenue?.by_plan?.basic ?? 0) * 8000000) +
                ((revenue?.by_plan?.premium ?? 0) * 15000000) +
                ((revenue?.by_plan?.vip ?? 0) * 25000000)
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">Basado en suscripciones activas</p>
          </div>
        </div>

        {/* Historial de pagos recientes */}
        {recentPayments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Receipt size={16} className="text-indigo-500" />
                Pagos Recientes
              </h3>
            </div>
            <div className="overflow-x-auto table-shell">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-6 py-3 font-medium">Factura</th>
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-6 py-3 font-medium">Monto</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.invoice_number || '—'}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                          : p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-800">{formatCOP(p.amount ?? 0)}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                          p.status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {p.status === 'succeeded' ? 'Pagado' : p.status === 'failed' ? 'Fallido' : p.status}
                        </span>
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
