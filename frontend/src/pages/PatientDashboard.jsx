import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge     from '../components/StatusBadge';
import LoadingSpinner  from '../components/LoadingSpinner';
import { patientAPI, appointmentAPI, tokenAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ----------------------------------------------------------------
// Overview (home tab)
// ----------------------------------------------------------------
const Overview = () => {
  const { user }              = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientAPI.getMyAppointments()
      .then(({ data }) => setAppointments(data.appointments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:    appointments.length,
    active:   appointments.filter((a) => a.status === 'booked').length,
    done:     appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  return (
    <div>
      <p className="text-gray-500 mb-6">Welcome back, <span className="font-semibold text-gray-800">{user?.name}</span></p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card text-center animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2" />
              <div className="w-12 h-8 bg-gray-200 rounded mx-auto mb-2" />
              <div className="w-16 h-4 bg-gray-200 rounded mx-auto" />
            </div>
          ))
        ) : (
          [
            { label: 'Total Appointments',     value: stats.total,     color: 'bg-blue-50   text-blue-700',    icon: '📋' },
            { label: 'Upcoming Appointments',  value: stats.active,    color: 'bg-emerald-50 text-emerald-700', icon: '📅' },
            { label: 'Completed Appointments', value: stats.done,      color: 'bg-purple-50 text-purple-700',  icon: '✅' },
            { label: 'Cancelled Appointments', value: stats.cancelled, color: 'bg-red-50    text-red-700',     icon: '❌' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`card text-center ${color}`}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm font-medium mt-1">{label}</div>
            </div>
          ))
        )}
      </div>

      {/* Recent appointments */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Appointments</h3>
        {loading ? (
          <LoadingSpinner />
        ) : appointments.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No appointments yet. Book one!</p>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 text-sm">Dr. {a.doctor_name}</p>
                  <p className="text-xs text-gray-500">{a.specialization} · {a.date} at {a.time}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">#{a.token_number}</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Book Appointment
// ----------------------------------------------------------------
const BookAppointment = () => {
  const [doctors,    setDoctors]    = useState([]);
  const [avail,      setAvail]      = useState([]);
  const [form,       setForm]       = useState({ doctor_id: '', date: '', time: '', notes: '' });
  const [loading,    setLoading]    = useState(false);
  const [fetchingAvail, setFetchingAvail] = useState(false);
  const [success,    setSuccess]    = useState('');
  const [error,      setError]      = useState('');
  const navigate     = useNavigate();

  useEffect(() => {
    patientAPI.getDoctors()
      .then(({ data }) => setDoctors(data.doctors))
      .catch(console.error);
  }, []);

  // When doctor+date change, fetch availability
  useEffect(() => {
    if (form.doctor_id && form.date) {
      setFetchingAvail(true);
      patientAPI.getDoctorAvailability(form.doctor_id, form.date)
        .then(({ data }) => setAvail(data.availability))
        .catch(() => setAvail([]))
        .finally(() => setFetchingAvail(false));
    } else {
      setAvail([]);
    }
  }, [form.doctor_id, form.date]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctor_id || !form.date || !form.time) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await appointmentAPI.book({
        doctor_id: parseInt(form.doctor_id),
        date:      form.date,
        time:      form.time,
        notes:     form.notes,
      });
      setSuccess(`Appointment booked! Your token number is #${data.appointment.token_number}`);
      setForm({ doctor_id: '', date: '', time: '', notes: '' });
      setTimeout(() => navigate('/patient/appointments'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  // Build time slots from availability window in 30-min intervals
  const getTimeSlots = () => {
    if (!avail.length) return [];
    const [slot] = avail; // use first availability block for the date
    const slots   = [];
    let [h, m]    = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    while (h < eh || (h === eh && m < em)) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      m += 30;
      if (m >= 60) { h += 1; m -= 60; }
    }
    return slots;
  };

  return (
    <div className="max-w-lg">
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-5 text-lg">Book an Appointment</h3>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Select Doctor *</label>
            <select name="doctor_id" value={form.doctor_id} onChange={handleChange} className="form-input" required>
              <option value="">— Choose a doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Date *</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="form-input"
              required
            />
          </div>

          {fetchingAvail && <LoadingSpinner size="sm" text="Checking availability…" />}

          {form.doctor_id && form.date && !fetchingAvail && (
            avail.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ Doctor is not available on this date.
              </p>
            ) : (
              <div>
                <label className="form-label">Time Slot *</label>
                <select name="time" value={form.time} onChange={handleChange} className="form-input" required>
                  <option value="">— Select time —</option>
                  {getTimeSlots().map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Available: {avail[0].start_time} – {avail[0].end_time}
                </p>
              </div>
            )
          )}

          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Describe symptoms or reason for visit…"
              className="form-input resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.doctor_id || !form.date || !form.time}
            className="btn-primary w-full"
          >
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// My Appointments
// ----------------------------------------------------------------
const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [cancelling,   setCancelling]   = useState(null);
  const [message,      setMessage]      = useState('');

  const load = () => {
    setLoading(true);
    patientAPI.getMyAppointments()
      .then(({ data }) => setAppointments(data.appointments))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setCancelling(id);
    try {
      await appointmentAPI.cancel(id);
      setMessage('Appointment cancelled.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not cancel.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div>
      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {message}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading appointments…" />
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">Dr. {a.doctor_name}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-gray-500">{a.specialization}</p>
                <p className="text-sm text-gray-600 mt-1">
                  📅 {a.date} &nbsp;⏰ {a.time} &nbsp;🔢 Token #{a.token_number}
                </p>
                {a.current_token > 0 && a.status === 'booked' && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Currently serving token #{a.current_token}
                    {a.token_number - a.current_token > 0
                      ? ` — ${a.token_number - a.current_token} ahead of you`
                      : ' — Your turn soon!'}
                  </p>
                )}
              </div>

              {(a.status === 'booked' || a.status === 'rescheduled') && (
                <button
                  onClick={() => handleCancel(a.id)}
                  disabled={cancelling === a.id}
                  className="btn-danger self-start sm:self-center text-sm py-1.5 px-3"
                >
                  {cancelling === a.id ? '…' : 'Cancel'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Token Queue (patient views their position)
// ----------------------------------------------------------------
const TokenQueueView = () => {
  const [doctorId,  setDoctorId]  = useState('');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [queueData, setQueueData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [doctors,   setDoctors]   = useState([]);

  useEffect(() => {
    patientAPI.getDoctors().then(({ data }) => setDoctors(data.doctors)).catch(console.error);
  }, []);

  const fetchQueue = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const { data } = await tokenAPI.getQueue(doctorId, date);
      setQueueData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Check Token Queue</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="form-input flex-1"
          >
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>Dr. {d.name} — {d.specialization}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input w-40"
          />
          <button onClick={fetchQueue} disabled={!doctorId || loading} className="btn-primary">
            {loading ? '…' : 'View Queue'}
          </button>
        </div>
      </div>

      {queueData && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Queue for {queueData.date}</h3>
            <span className="badge-blue">Serving #{queueData.currentToken}</span>
          </div>

          {queueData.queue.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Queue is empty.</p>
          ) : (
            <div className="space-y-2">
              {queueData.queue.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    item.token_number === queueData.currentToken
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    #{item.token_number}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.patient_name}</p>
                    <p className="text-xs text-gray-500">Scheduled: {item.time}</p>
                  </div>
                  {idx === 0 && (
                    <span className="ml-auto badge-green">Next</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Router wrapper
// ----------------------------------------------------------------
const PatientDashboard = () => (
  <DashboardLayout title="Patient Dashboard">
    <Routes>
      <Route index                 element={<Overview />} />
      <Route path="book"           element={<BookAppointment />} />
      <Route path="appointments"   element={<MyAppointments />} />
      <Route path="queue"          element={<TokenQueueView />} />
    </Routes>
  </DashboardLayout>
);

export default PatientDashboard;
