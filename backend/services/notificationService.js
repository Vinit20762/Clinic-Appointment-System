/**
 * Notification Service — Mock Implementation
 * -------------------------------------------
 * In production this would integrate with an email service (SendGrid,
 * Nodemailer, etc.) or an SMS gateway. For now it logs to the console
 * so you can see exactly when and what would be sent.
 */

const log = (type, payload) => {
  console.log(`[NOTIFICATION] ${type}:`, JSON.stringify(payload, null, 2));
};

const sendRegistrationConfirmation = ({ name, email }) => {
  log('REGISTRATION', {
    to:      email,
    subject: 'Welcome to the Clinic!',
    body:    `Hello ${name}, your account has been created successfully.`,
  });
};

const sendBookingConfirmation = ({ patientName, patientEmail, doctorName, date, time, tokenNumber }) => {
  log('BOOKING_CONFIRMED', {
    to:      patientEmail,
    subject: 'Appointment Confirmed',
    body:    `Hi ${patientName}, your appointment with ${doctorName} on ${date} at ${time} is confirmed. Your token number is #${tokenNumber}.`,
  });
};

const sendCancellationNotice = ({ patientEmail, patientName, date }) => {
  log('APPOINTMENT_CANCELLED', {
    to:      patientEmail,
    subject: 'Appointment Cancelled',
    body:    `Hi ${patientName}, your appointment on ${date} has been cancelled.`,
  });
};

const sendRescheduleNotice = ({ patientEmail, patientName, newDate, newTime, tokenNumber }) => {
  log('APPOINTMENT_RESCHEDULED', {
    to:      patientEmail,
    subject: 'Appointment Rescheduled',
    body:    `Hi ${patientName}, your appointment has been rescheduled to ${newDate} at ${newTime}. New token: #${tokenNumber}.`,
  });
};

module.exports = {
  sendRegistrationConfirmation,
  sendBookingConfirmation,
  sendCancellationNotice,
  sendRescheduleNotice,
};
