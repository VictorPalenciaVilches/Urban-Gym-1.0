import { useEffect, useState } from 'react';
import { gymsApi, equipmentApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Building2, Dumbbell, Clock, Users, CheckCircle, XCircle, ChevronRight, Plus, X, Loader2 } from 'lucide-react';

interface Gym {
  id: string;
  name: string;
  address: string;
  capacity: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: 'available' | 'maintenance' | 'out_of_service';
}

const emptyGymForm = { name: '', address: '', capacity: '', open_time: '06:00', close_time: '22:00' };
const emptyEquipForm = { name: '', category: 'cardio', quantity: '1', status: 'available' };

export default function FacilitiesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selected, setSelected] = useState<Gym | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEquip, setLoadingEquip] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyGymForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showEquipModal, setShowEquipModal] = useState(false);
  const [equipForm, setEquipForm] = useState(emptyEquipForm);
  const [savingEquip, setSavingEquip] = useState(false);
  const [equipError, setEquipError] = useState('');

  useEffect(() => {
    gymsApi.getAll()
      .then(({ data }) => setGyms(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelectGym = async (gym: Gym) => {
    setSelected(gym);
    setLoadingEquip(true);
    try {
      const { data } = await equipmentApi.getByGym(gym.id);
      setEquipment(data);
    } catch {
      setEquipment([]);
    } finally {
      setLoadingEquip(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.address || !form.capacity) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await gymsApi.create({
        name: form.name,
        address: form.address,
        capacity: Number(form.capacity),
        open_time: form.open_time,
        close_time: form.close_time,
        is_open: true,
      });
      setGyms((prev) => [...prev, data]);
      setShowModal(false);
      setForm(emptyGymForm);
    } catch {
      setError('Error al crear la sede. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEquip = async () => {
    if (!equipForm.name || !selected) return;
    setSavingEquip(true);
    setEquipError('');
    try {
      const { data } = await equipmentApi.create({
        gym_id: selected.id,
        name: equipForm.name,
        category: equipForm.category,
        quantity: Number(equipForm.quantity),
        status: equipForm.status,
      });
      setEquipment((prev) => [...prev, data]);
      setShowEquipModal(false);
      setEquipForm(emptyEquipForm);
    } catch {
      setEquipError('Error al agregar el equipo. Intenta de nuevo.');
    } finally {
      setSavingEquip(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'available') return 'bg-green-100 text-green-700';
    if (status === 'maintenance') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-600';
  };

  const statusLabel = (status: string) => {
    if (status === 'available') return 'Disponible';
    if (status === 'maintenance') return 'Mantenimiento';
    return 'Fuera de servicio';
  };

  return (
    <div className="space-y-6 max-w-5xl page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Instalaciones</h1>
          <p className="text-gray-500 mt-1">Consulta las sedes abiertas y el equipamiento disponible.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowModal(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} /> Agregar sede
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lista de sedes */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Building2 size={17} className="text-indigo-500" /> Sedes
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando sedes...</p>
          ) : gyms.length === 0 ? (
            <p className="text-sm text-gray-400">No hay sedes registradas.</p>
          ) : (
            gyms.map((gym) => (
              <button
                key={gym.id}
                onClick={() => handleSelectGym(gym)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected?.id === gym.id
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-100 bg-white hover:border-indigo-200'
                } shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{gym.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{gym.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gym.is_open ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={11} /> Abierto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle size={11} /> Cerrado
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {gym.open_time?.slice(0, 5)} – {gym.close_time?.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={11} /> Cap. {gym.capacity}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Equipamiento */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Dumbbell size={17} className="text-indigo-500" />
              {selected ? `Equipamiento — ${selected.name}` : 'Selecciona una sede'}
            </h2>
            {isAdmin && selected && (
              <button
                onClick={() => { setShowEquipModal(true); setEquipError(''); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={13} /> Agregar equipo
              </button>
            )}
          </div>

          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <Dumbbell size={36} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Haz clic en una sede para ver su equipamiento</p>
            </div>
          ) : loadingEquip ? (
            <p className="text-sm text-gray-400">Cargando equipamiento...</p>
          ) : equipment.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-400">Sin equipamiento registrado.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Equipo</th>
                    <th className="px-4 py-2 text-left">Categoría</th>
                    <th className="px-4 py-2 text-center">Cant.</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {equipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{eq.name}</td>
                      <td className="px-4 py-2 text-gray-500 capitalize">{eq.category}</td>
                      <td className="px-4 py-2 text-center text-gray-700">{eq.quantity}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(eq.status)}`}>
                          {statusLabel(eq.status)}
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

      {/* Modal agregar equipamiento */}
      {showEquipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Nuevo equipo — {selected?.name}</h2>
              <button onClick={() => setShowEquipModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {equipError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{equipError}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={equipForm.name}
                  onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
                  placeholder="Cinta de correr #3"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={equipForm.category}
                    onChange={(e) => setEquipForm({ ...equipForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cardio">Cardio</option>
                    <option value="pesas">Pesas</option>
                    <option value="funcional">Funcional</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={equipForm.quantity}
                    onChange={(e) => setEquipForm({ ...equipForm, quantity: e.target.value })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={equipForm.status}
                  onChange={(e) => setEquipForm({ ...equipForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="available">Disponible</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="out_of_service">Fuera de servicio</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEquipModal(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEquip}
                disabled={savingEquip}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingEquip ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar sede */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Nueva sede</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="UrbanGym Sur"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Calle 10 # 5-30"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad *</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="50"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apertura</label>
                  <input
                    type="time"
                    value={form.open_time}
                    onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cierre</label>
                  <input
                    type="time"
                    value={form.close_time}
                    onChange={(e) => setForm({ ...form, close_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Crear sede'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
