-- ==========================================
-- SCHEMAS Y PERMISOS
-- ==========================================
CREATE SCHEMA IF NOT EXISTS iot;
CREATE SCHEMA IF NOT EXISTS progress;

GRANT USAGE ON SCHEMA iot TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA progress TO postgres, anon, authenticated, service_role;

-- ==========================================
-- IOT SERVICE TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS iot.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    gym_id UUID,
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS iot.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    machine_id UUID REFERENCES iot.machines(id) ON DELETE SET NULL,
    event_type VARCHAR(50) DEFAULT 'workout.completed',
    raw_data JSONB,
    normalized_event JSONB,
    duration_minutes INT,
    calories INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ==========================================
-- PROGRESS SERVICE TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS progress.workout_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    source VARCHAR(50) DEFAULT 'iot',
    machine_id UUID,
    machine_name TEXT,
    machine_type TEXT,
    duration_minutes INT,
    calories INT,
    metrics JSONB,
    workout_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS progress.progress_metrics (
    member_id UUID PRIMARY KEY,
    total_workouts INT DEFAULT 0,
    total_minutes INT DEFAULT 0,
    total_calories INT DEFAULT 0,
    weekly_workouts INT DEFAULT 0,
    best_duration_minutes INT DEFAULT 0,
    best_calories INT DEFAULT 0,
    last_workout_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- PERMISOS PARA LAS TABLAS RECIÉN CREADAS
GRANT ALL ON ALL TABLES IN SCHEMA iot TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA progress TO postgres, anon, authenticated, service_role;

-- ==========================================
-- DATOS DUMMY (ENTRENAMIENTOS FALSOS)
-- ==========================================

-- INSERTANDO MÁQUINAS EN IOT
INSERT INTO iot.machines (id, name, type, status)
VALUES 
('f1000000-0000-0000-0000-000000000001', 'Bicicleta Estática #1', 'Cardio', 'available'),
('f1000000-0000-0000-0000-000000000002', 'Cinta Cardio #1', 'Cardio', 'available'),
('f1000000-0000-0000-0000-000000000003', 'Máquina de Pesas #1', 'Pesas', 'available'),
('f1000000-0000-0000-0000-000000000004', 'Eliptica #1', 'Cardio', 'available')
ON CONFLICT (id) DO NOTHING;

-- INSERTANDO ALGUNOS WORKOUTS EN "CRUDO" EN IOT (LOGS)
INSERT INTO iot.workouts (member_id, machine_id, duration_minutes, calories, event_type, raw_data, normalized_event, created_at)
VALUES 
-- LUIS MIGUEL
('897c746e-2030-43ae-9d93-f9779f03a770', 'f1000000-0000-0000-0000-000000000001', 45, 410, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Bicicleta Estática #1", "machine_type": "Cardio"}'::jsonb, NOW() - INTERVAL '3 days'),
('897c746e-2030-43ae-9d93-f9779f03a770', 'f1000000-0000-0000-0000-000000000003', 60, 280, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Máquina de Pesas #1", "machine_type": "Pesas"}'::jsonb, NOW() - INTERVAL '2 days'),

-- LEONARDO
('a206bbf5-9278-43db-bad9-000000000002', 'f1000000-0000-0000-0000-000000000001', 45, 400, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Bicicleta Estática #1", "machine_type": "Cardio"}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000002', 'f1000000-0000-0000-0000-000000000003', 60, 340, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Máquina de Pesas #1", "machine_type": "Pesas"}'::jsonb, NOW() - INTERVAL '1 day'),

-- ANDRES
('a206bbf5-9278-43db-bad9-000000000003', 'f1000000-0000-0000-0000-000000000004', 50, 420, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Eliptica #1", "machine_type": "Cardio"}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000003', 'f1000000-0000-0000-0000-000000000002', 30, 290, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Cinta Cardio #1", "machine_type": "Cardio"}'::jsonb, NOW() - INTERVAL '1 day'),

-- MAURICIO
('a206bbf5-9278-43db-bad9-000000000004', 'f1000000-0000-0000-0000-000000000004', 55, 310, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Eliptica #1", "machine_type": "Cardio"}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000004', 'f1000000-0000-0000-0000-000000000003', 40, 360, 'workout.completed', '{"event": "finish"}'::jsonb, '{"machine_name": "Máquina de Pesas #1", "machine_type": "Pesas"}'::jsonb, NOW() - INTERVAL '1 day');


-- Usuarios de prueba (UUIDs generados al azar)
-- Test User: a206bbf5-9278-43db-bad9-000000000001
-- Leonardo: a206bbf5-9278-43db-bad9-000000000002
-- Andres: a206bbf5-9278-43db-bad9-000000000003
-- Mauricio: a206bbf5-9278-43db-bad9-000000000004
-- Luis Miguel (Este podrías reemplazarlo por tu UUID real en un futuro, o simplemente se creará este por ahora)
-- Luis Miguel: c0b13cf3-2a62-4217-849c-c5108a3f81e3 

-- INSERTANDO WORKOUTS SIMULADOS DIRECTAMENTE A PROGRESS PARA QUE APAREZCAN
INSERT INTO progress.workout_records (member_id, machine_name, machine_type, duration_minutes, calories, metrics, workout_date)
VALUES 
-- Entrenamientos Generales
('a206bbf5-9278-43db-bad9-000000000001', 'Máquina Genérica', 'General', 25, 210, '{}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000002', 'Cinta Cardio #2', 'Cardio', 45, 400, '{"distance": 6.2}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000002', 'Pesas #3', 'Fuerza', 60, 340, '{"sets": 4, "reps": 12}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000001', 'Bicicleta Estática', 'Cardio', 35, 260, '{"distance": 10.4}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000003', 'Máquina Multifuerza', 'Fuerza', 50, 420, '{"sets": 5, "reps": 10}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000003', 'Escaladora', 'Cardio', 30, 290, '{"floors": 45}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000004', 'Eliptica', 'Cardio', 55, 310, '{"distance": 4.5}'::jsonb, NOW() - INTERVAL '1 day'),
('a206bbf5-9278-43db-bad9-000000000004', 'Prensa de Piernas', 'Fuerza', 40, 360, '{"sets": 4, "reps": 8}'::jsonb, NOW() - INTERVAL '1 day'),

-- LUIS MIGUEL (Varios entrenamientos para que aparezca bien en el Dashboard de Socio)
('897c746e-2030-43ae-9d93-f9779f03a770', 'Máquina de Pesas #1', 'Pesas', 60, 280, '{"sets": 4, "reps": 12}'::jsonb, NOW() - INTERVAL '2 days'),
('897c746e-2030-43ae-9d93-f9779f03a770', 'Bicicleta Estática #1', 'Cardio', 45, 410, '{"distance": 8.1, "bpm": 155}'::jsonb, NOW() - INTERVAL '3 days'),
('897c746e-2030-43ae-9d93-f9779f03a770', 'Cinta Cardio #1', 'Cardio', 35, 320, '{"distance": 5.2, "bpm": 142}'::jsonb, NOW() - INTERVAL '4 days');


-- Actualizar las métricas generales de todos los usuarios
INSERT INTO progress.progress_metrics (member_id, total_workouts, total_minutes, total_calories, weekly_workouts, best_duration_minutes, best_calories, last_workout_at)
SELECT 
    member_id,
    COUNT(id) as total_workouts,
    SUM(duration_minutes) as total_minutes,
    SUM(calories) as total_calories,
    COUNT(id) as weekly_workouts,
    MAX(duration_minutes) as best_duration_minutes,
    MAX(calories) as best_calories,
    MAX(workout_date) as last_workout_at
FROM progress.workout_records
GROUP BY member_id
ON CONFLICT (member_id) DO UPDATE SET
    total_workouts = EXCLUDED.total_workouts,
    total_minutes = EXCLUDED.total_minutes,
    total_calories = EXCLUDED.total_calories,
    weekly_workouts = EXCLUDED.weekly_workouts,
    best_duration_minutes = EXCLUDED.best_duration_minutes,
    best_calories = EXCLUDED.best_calories,
    last_workout_at = EXCLUDED.last_workout_at,
    updated_at = NOW();
