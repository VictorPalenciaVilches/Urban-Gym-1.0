require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const classes = [
  {
    name: 'Yoga Matutino',
    instructor: 'Ana García',
    duration_minutes: 60,
    capacity: 20,
    description: 'Clase de yoga para comenzar el día con energía',
    category: 'flexibility',
  },
  {
    name: 'Spinning Intenso',
    instructor: 'Carlos Mendoza',
    duration_minutes: 45,
    capacity: 15,
    description: 'Ciclismo de alta intensidad para quemar calorías',
    category: 'cardio',
  },
  {
    name: 'Pilates Core',
    instructor: 'María López',
    duration_minutes: 50,
    capacity: 12,
    description: 'Fortalecimiento del core y flexibilidad',
    category: 'flexibility',
  },
  {
    name: 'Crossfit Funcional',
    instructor: 'Diego Ramírez',
    duration_minutes: 60,
    capacity: 10,
    description: 'Entrenamiento funcional de alta intensidad',
    category: 'fuerza',
  },
  {
    name: 'Zumba Tropical',
    instructor: 'Laura Sánchez',
    duration_minutes: 55,
    capacity: 25,
    description: 'Baile fitness con ritmos latinos',
    category: 'cardio',
  },
  {
    name: 'Box Fitness',
    instructor: 'Roberto Vargas',
    duration_minutes: 60,
    capacity: 16,
    description: 'Técnicas de boxeo aplicadas al fitness',
    category: 'fuerza',
  },
];

async function seedClasses() {
  console.log('Verificando si ya existen clases...');

  const { data: existing, error: checkError } = await supabase
    .from('classes')
    .select('id');

  if (checkError) {
    console.error('Error al verificar tabla:', checkError.message);
    console.log('\nPosible causa: la tabla "classes" no existe en el schema public.');
    console.log('Crea la tabla en Supabase SQL Editor con:\n');
    console.log(`CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  instructor TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 20,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);`);
    return;
  }

  if (existing && existing.length > 0) {
    console.log(`Ya existen ${existing.length} clase(s) en la base de datos.`);
    const { data, error } = await supabase.from('classes').select('id, name, instructor');
    if (!error) {
      console.log('\nClases actuales:');
      data.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} — ${c.instructor}`));
    }
    return;
  }

  console.log('Insertando 6 clases de prueba...');
  const { data, error } = await supabase
    .from('classes')
    .insert(classes)
    .select('id, name, instructor');

  if (error) {
    console.error('Error al insertar:', error.message);
    return;
  }

  console.log(`\n✅ ${data.length} clases insertadas correctamente:`);
  data.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} — ${c.instructor} (id: ${c.id})`));
  console.log('\nAhora GET /classes debería devolver los datos.');
}

seedClasses();
