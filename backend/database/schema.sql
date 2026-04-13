-- =============================================================
-- Clinic Appointment & Token Management System - Database Schema
-- =============================================================

CREATE DATABASE IF NOT EXISTS clinic_db;
USE clinic_db;

-- -------------------------------------------------------------
-- Table: users
-- Stores all users regardless of role. Role determines which
-- profile table (doctors / patients) has a linked record.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(100)  NOT NULL,
  password    VARCHAR(255)  NOT NULL,   -- bcrypt hash, never plain text
  role        ENUM('admin', 'doctor', 'patient') NOT NULL DEFAULT 'patient',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email)
);

-- -------------------------------------------------------------
-- Table: doctors
-- One-to-one extension of users for doctor-specific data.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  id              INT           NOT NULL AUTO_INCREMENT,
  user_id         INT           NOT NULL,
  specialization  VARCHAR(100)  NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_id (user_id),
  CONSTRAINT fk_doctor_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_doctors_user_id (user_id)
);

-- -------------------------------------------------------------
-- Table: patients
-- One-to-one extension of users for patient-specific data.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id          INT                          NOT NULL AUTO_INCREMENT,
  user_id     INT                          NOT NULL,
  age         TINYINT UNSIGNED                      DEFAULT NULL,
  gender      ENUM('male', 'female', 'other')       DEFAULT NULL,
  phone       VARCHAR(20)                           DEFAULT NULL,
  created_at  TIMESTAMP                    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_user (user_id),
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_patients_user_id (user_id)
);

-- -------------------------------------------------------------
-- Table: availability
-- A doctor can define multiple date/time windows. Patients can
-- only book slots that fall within an availability window.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability (
  id          INT   NOT NULL AUTO_INCREMENT,
  doctor_id   INT   NOT NULL,
  date        DATE  NOT NULL,
  start_time  TIME  NOT NULL,
  end_time    TIME  NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_avail_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_avail_doctor_date (doctor_id, date)
);

-- -------------------------------------------------------------
-- Table: appointments
-- Core booking record. token_number is the queue position
-- for that doctor on that date.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id            INT                                           NOT NULL AUTO_INCREMENT,
  patient_id    INT                                           NOT NULL,
  doctor_id     INT                                           NOT NULL,
  date          DATE                                          NOT NULL,
  time          TIME                                          NOT NULL,
  status        ENUM('booked','completed','cancelled','rescheduled') NOT NULL DEFAULT 'booked',
  token_number  INT UNSIGNED                                  NOT NULL,
  notes         VARCHAR(500)                                          DEFAULT NULL,
  created_at    TIMESTAMP                                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- No two active bookings for the same patient+doctor+date
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
    REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)
    REFERENCES doctors(id)  ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_appt_doctor_date  (doctor_id, date),
  INDEX idx_appt_patient      (patient_id),
  INDEX idx_appt_token        (doctor_id, date, token_number)
);

-- -------------------------------------------------------------
-- Table: tokens
-- Tracks the CURRENT token being served for a doctor on a date.
-- Incremented by the doctor when calling the next patient.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens (
  id             INT       NOT NULL AUTO_INCREMENT,
  doctor_id      INT       NOT NULL,
  date           DATE      NOT NULL,
  current_token  INT       NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- One row per doctor per date
  UNIQUE KEY uq_token_doctor_date (doctor_id, date),
  CONSTRAINT fk_token_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================
-- End of schema
-- =============================================================
