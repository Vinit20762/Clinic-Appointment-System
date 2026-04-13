-- =============================================================
-- Seed data for development & testing
-- Passwords are bcrypt hashes of "Password@123"
-- =============================================================

USE clinic_db;

-- Admin user
INSERT INTO users (name, email, password, role) VALUES
  ('Super Admin', 'admin@clinic.com', '$2a$10$NbVu9zz5gqfoCe9PfyLfie930r4i21B4q58JBETdAD1xQE2gCVH0S', 'admin');

-- Doctor users
INSERT INTO users (name, email, password, role) VALUES
  ('Dr. Sarah Johnson',  'sarah@clinic.com',  '$2a$10$NbVu9zz5gqfoCe9PfyLfie930r4i21B4q58JBETdAD1xQE2gCVH0S', 'doctor'),
  ('Dr. Michael Chen',   'michael@clinic.com', '$2a$10$NbVu9zz5gqfoCe9PfyLfie930r4i21B4q58JBETdAD1xQE2gCVH0S', 'doctor');

-- Patient users
INSERT INTO users (name, email, password, role) VALUES
  ('Alice Smith', 'alice@example.com', '$2a$10$NbVu9zz5gqfoCe9PfyLfie930r4i21B4q58JBETdAD1xQE2gCVH0S', 'patient'),
  ('Bob Wilson',  'bob@example.com',   '$2a$10$NbVu9zz5gqfoCe9PfyLfie930r4i21B4q58JBETdAD1xQE2gCVH0S', 'patient');

-- Doctor profiles (user_id matches the INSERT order above: 2, 3)
INSERT INTO doctors (user_id, specialization) VALUES
  (2, 'Cardiologist'),
  (3, 'General Physician');

-- Patient profiles (user_id 4, 5)
INSERT INTO patients (user_id, age, gender, phone) VALUES
  (4, 30, 'female', '9876543210'),
  (5, 25, 'male',   '9123456789');
