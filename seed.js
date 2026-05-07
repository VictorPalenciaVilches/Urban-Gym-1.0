/**
 * ============================================================
 * URBANGYM — Script de Seed (Datos de demostración)
 * ============================================================
 * Ejecutar UNA VEZ después de configurar los .env:
 *   node seed.js
 *
 * Crea:
 *   - Usuarios: 1 admin, 2 trainers, 5 socios
 *   - Sedes: 2 gimnasios
 *   - Equipamiento: 4 máquinas por sede
 *   - Clases: 6 tipos de clases
 *   - Horarios: 10 horarios próximos
 * ============================================================
 */

require('dotenv').config({ path: './member-service/.env' });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// ─── Credenciales de Supabase por servicio ─────────────────────────────────
const SUPABASE_CONFIGS = {
  members: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  booking: {
    url: process.env.BOOKING_SUPABASE_URL || 'https://cxhjmilbamlhujirjpec.supabase.co',
    key: process.env.BOOKING_SUPABASE_KEY || '',
  },
  facility: {
    url: process.env.FACILITY_SUPABASE_URL || 'https://gevtehywzklljfepspwh.supabase.co',
    key: process.env.FACILITY_SUPABASE_KEY || '',
  },
};

async function seedMembers() {
  const client = createClient(SUPABASE_CONFIGS.members.url, SUPABASE_CONFIGS.members.key);

  console.log('\n📋 Leyendo roles existentes...');
  const { data: roles } = await client.schema('members').from('roles').select('id, name');
  const adminRoleId   = roles?.find(r => r.name === 'admin')?.id;
  const trainerRoleId = roles?.find(r => r.name === 'trainer')?.id;
  const memberRoleId  = roles?.find(r => r.name === 'member')?.id;

  if (!adminRoleId || !trainerRoleId || !memberRoleId) {
    console.error('❌ No se encontraron los roles en la BD. Verifica que la tabla members.roles existe.');
    return;
  }

  console.log('👤 Creando usuarios de prueba...');

  const users = [
    { name: 'Admin UrbanGYM',   email: 'admin@urbangym.com',    password: 'admin123',    role_id: adminRoleId,   subscription_status: 'active' },
    { name: 'Carlos Trainer',   email: 'trainer1@urbangym.com', password: 'Trainer123!', role_id: trainerRoleId, subscription_status: 'active' },
    { name: 'Laura Fitness',    email: 'trainer2@urbangym.com', password: 'Trainer123!', role_id: trainerRoleId, subscription_status: 'active' },
    { name: 'Juan Pérez',       email: 'juan@demo.com',         password: 'Member123!',  role_id: memberRoleId,  subscription_status: 'active' },
    { name: 'María García',     email: 'maria@demo.com',        password: 'Member123!',  role_id: memberRoleId,  subscription_status: 'active' },
    { name: 'Pedro López',      email: 'pedro@demo.com',        password: 'Member123!',  role_id: memberRoleId,  subscription_status: 'pending' },
    { name: 'Ana Martínez',     email: 'ana@demo.com',          password: 'Member123!',  role_id: memberRoleId,  subscription_status: 'active' },
    { name: 'Luis Rodríguez',   email: 'luis@demo.com',         password: 'Member123!',  role_id: memberRoleId,  subscription_status: 'active' },
  ];

  for (const user of users) {
    const { data: existing } = await client.schema('members').from('members').select('id').eq('email', user.email).single();
    if (existing) {
      // Solo actualizar rol y estado
      await client.schema('members').from('members').update({ role_id: user.role_id, subscription_status: user.subscription_status }).eq('email', user.email);
      console.log(`  ✅ Actualizado: ${user.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const { error } = await client.schema('members').from('members').insert({
      name: user.name,
      email: user.email,
      password: hashedPassword,
      role_id: user.role_id,
      subscription_status: user.subscription_status,
    });

    if (error) console.error(`  ❌ Error creando ${user.email}:`, error.message);
    else console.log(`  ✅ Creado: ${user.email}`);
  }
}

async function seedFacility() {
  // Leer credenciales desde .env de facility-service
  require('dotenv').config({ path: './facility-service/.env', override: true });
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  console.log('\n🏋️  Creando sedes...');
  const gyms = [
    { name: 'UrbanGYM Centro',   address: 'Calle 10 #5-30, Bogotá',    city: 'Bogotá',    phone: '601-123-4567', capacity: 150 },
    { name: 'UrbanGYM Norte',    address: 'Av. 19 #127-45, Bogotá',     city: 'Bogotá',    phone: '601-765-4321', capacity: 120 },
  ];

  const gymIds = [];
  for (const gym of gyms) {
    const { data: existing } = await client.schema('facilities').from('gyms').select('id').eq('name', gym.name).single();
    if (existing) { gymIds.push(existing.id); console.log(`  ✅ Ya existe: ${gym.name}`); continue; }
    const { data, error } = await client.schema('facilities').from('gyms').insert(gym).select('id').single();
    if (error) { console.error(`  ❌ Error: ${error.message}`); continue; }
    gymIds.push(data.id);
    console.log(`  ✅ Creado: ${gym.name}`);
  }

  if (gymIds.length === 0) return;

  console.log('🏃 Creando equipamiento...');
  const equipment = [
    { name: 'Cinta Cardio Pro 3000',  type: 'Cardio',  status: 'operational' },
    { name: 'Bicicleta Estática X1',  type: 'Cardio',  status: 'operational' },
    { name: 'Máquina de Pesas Multi', type: 'Fuerza',  status: 'operational' },
    { name: 'Elíptica LE-200',        type: 'Cardio',  status: 'operational' },
    { name: 'Press de Banca',         type: 'Fuerza',  status: 'operational' },
    { name: 'Remo Indoor',            type: 'Cardio',  status: 'maintenance' },
  ];

  for (const gymId of gymIds.slice(0, 1)) {
    for (const eq of equipment) {
      const { error } = await client.schema('facilities').from('equipment').insert({ ...eq, gym_id: gymId });
      if (!error) console.log(`  ✅ Equipamiento: ${eq.name}`);
    }
  }
}

async function seedBookings() {
  // Leer credenciales desde .env de booking-service
  require('dotenv').config({ path: './booking-service/.env', override: true });
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  console.log('\n📅 Creando clases...');
  const classes = [
    { name: 'Spinning Intenso',      instructor: 'Carlos Trainer',  duration_minutes: 45, capacity: 20, category: 'Cardio' },
    { name: 'Yoga Relajante',        instructor: 'Laura Fitness',   duration_minutes: 60, capacity: 15, category: 'Bienestar' },
    { name: 'Crossfit Avanzado',     instructor: 'Carlos Trainer',  duration_minutes: 50, capacity: 12, category: 'Fuerza' },
    { name: 'Zumba Fitness',         instructor: 'Laura Fitness',   duration_minutes: 55, capacity: 25, category: 'Cardio' },
    { name: 'Pilates Core',          instructor: 'Laura Fitness',   duration_minutes: 45, capacity: 10, category: 'Bienestar' },
    { name: 'HIIT Total Body',       instructor: 'Carlos Trainer',  duration_minutes: 40, capacity: 18, category: 'Cardio' },
  ];

  const classIds = [];
  for (const cls of classes) {
    const { data: existing } = await client.from('classes').select('id').eq('name', cls.name).single();
    if (existing) { classIds.push(existing.id); console.log(`  ✅ Ya existe: ${cls.name}`); continue; }
    const { data, error } = await client.from('classes').insert(cls).select('id').single();
    if (error) { console.error(`  ❌ Error: ${error.message}`); continue; }
    classIds.push(data.id);
    console.log(`  ✅ Clase creada: ${cls.name}`);
  }

  if (classIds.length === 0) return;

  console.log('🗓️  Creando horarios para los próximos 7 días...');
  const times = ['07:00', '09:00', '11:00', '17:00', '19:00'];
  const today = new Date();

  let scheduleCount = 0;
  for (let day = 1; day <= 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    for (let i = 0; i < Math.min(3, classIds.length); i++) {
      const classId = classIds[i % classIds.length];
      const time = times[i % times.length];
      const { error } = await client.from('schedules').insert({
        class_id: classId,
        date: dateStr,
        start_time: time,
        available_spots: 15,
        gym_id: null,
      });
      if (!error) scheduleCount++;
    }
  }
  console.log(`  ✅ ${scheduleCount} horarios creados`);
}

async function main() {
  console.log('🌱 UrbanGYM — Iniciando seed de datos de demostración...\n');

  try {
    await seedMembers();
    await seedFacility();
    await seedBookings();

    console.log('\n✅ Seed completado exitosamente!\n');
    console.log('─'.repeat(50));
    console.log('👤 Credenciales de acceso:');
    console.log('  Admin:   admin@urbangym.com     / admin123');
    console.log('  Trainer: trainer1@urbangym.com  / Trainer123!');
    console.log('  Trainer: trainer2@urbangym.com  / Trainer123!');
    console.log('  Socio:   juan@demo.com           / Member123!');
    console.log('  Socio:   maria@demo.com          / Member123!');
    console.log('─'.repeat(50));
  } catch (err) {
    console.error('❌ Error en el seed:', err.message);
    process.exit(1);
  }
}

main();
