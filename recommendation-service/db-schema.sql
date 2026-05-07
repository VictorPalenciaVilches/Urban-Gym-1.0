-- Crea el schema
CREATE SCHEMA IF NOT EXISTS recommendations;

-- Otorga permisos basicos
GRANT USAGE ON SCHEMA recommendations TO postgres, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS recommendations.member_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE,
    weight_kg DECIMAL(5,2) NOT NULL,
    height_cm INT NOT NULL,
    bmi DECIMAL(4,2),
    goal VARCHAR(50) NOT NULL, -- 'lose_weight', 'gain_mass', 'maintain'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabla de catálogo de planes
CREATE TABLE IF NOT EXISTS recommendations.fitness_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal VARCHAR(50) NOT NULL UNIQUE, -- 'lose_weight', 'gain_mass', 'maintain'
    name VARCHAR(100) NOT NULL,
    workout_plan TEXT NOT NULL,
    nutrition_plan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insertar planes por defecto
INSERT INTO recommendations.fitness_plans (goal, name, workout_plan, nutrition_plan)
VALUES 
    ('lose_weight', 'Plan Reducción de Porcentaje Graso', 
     '• 4 días a la semana de HIIT (Alta intensidad)
• 2 días de entrenamiento de fuerza moderada
• 1 día de descanso activo (caminar 10k pasos)', 
     '• Déficit calórico de 300-500 kcal
• Alta ingesta de proteínas (1.8g - 2.2g por kg de peso)
• Reducción de carbohidratos simples, optar por complejos
• Alta ingesta de vegetales fibrosos'),

    ('gain_mass', 'Plan Hipertrofia y Aumento de Masa', 
     '• 5 días de entrenamiento de fuerza (rutina dividida o Push/Pull/Legs)
• Enfoque en sobrecarga progresiva (subir pesos semanalmente)
• Cardio moderado 2 veces por semana (20 mins máximo)', 
     '• Superávit calórico de 200-400 kcal
• Alta ingesta de carbohidratos para energía
• Proteína moderada-alta (1.6g - 2g por kg de peso)
• Consumo de grasas saludables (aguacate, nueces)'),

    ('maintain', 'Plan Salud y Mantenimiento Integral', 
     '• 3 días de entrenamiento de fuerza completa (Full Body)
• 2 días de cardio LISS (Baja intensidad constante)
• Enfoque en rango completo de movimiento y técnica', 
     '• Calorías de mantenimiento (TDEE exacto)
• Macronutrientes balanceados (40% carbo, 30% pro, 30% grasa)
• Dieta flexible 80/20 (80% alimentos enteros, 20% antojos adaptados)
• Hidratación constante de 2.5L a 3L diarios')
ON CONFLICT (goal) DO UPDATE 
SET name = EXCLUDED.name, 
    workout_plan = EXCLUDED.workout_plan, 
    nutrition_plan = EXCLUDED.nutrition_plan;

-- Otorgar TODOS los permisos a las tablas recién creadas!
GRANT ALL ON ALL TABLES IN SCHEMA recommendations TO postgres, anon, authenticated, service_role;
