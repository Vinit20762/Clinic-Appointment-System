import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge     from '../components/StatusBadge';
import LoadingSpinner  from '../components/LoadingSpinner';
import { doctorAPI }   from '../services/api';
import { useAuth }     from '../context/AuthContext';

// ----------------------------------------------------------------
// Overview
// ----------------------------------------------------------------
const Overview = () => {
  const { user }                  = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    doctorAPI.getAppointments({ date: today })
      .then(({ data }) => setAppointments(data.appointments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today]);

  return (
    <div>
      <p className="text-gray-500 mb-6">Good day, <span className="font-semibold text-gray-800">Dr. {user?.name}</span></p>

      {/* Today's quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Total",   value: appointments.length,                                          color: 'bg-blue-50 text-blue-700',    icon: '📋' },
          { label: 'Pending',         value: appointments.filter(a => a.status === 'booked').length,       color: 'bg-amber-50 text-amber-700',  icon: '⏳' },
          { label: 'Completed',       value: appointments.filter(a => a.status === 'completed').length,    color: 'bg-emerald-50 text-emerald-700', icon: '✅' },
          { label: 'Cancelled',       value: appointments.filter(a => a.status === 'cancelled').length,    color: 'bg-red-50 text-red-700',      icon: '❌' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`card text-center ${color}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Today's patient list */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Today's Patients: {today}</h3>
        {loading ? <LoadingSpinner /> : appointments.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No appointments today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-4">Token</th>
                  <th className="pb-2 pr-4">Patient</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 font-mono font-bold text-blue-600">#{a.token_number}</td>
                    <td className="py-2 pr-4 font-medium">{a.patient_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{a.time}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Appointments management
// ----------------------------------------------------------------
const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState({ date: '', status: '' });
  const [updating,     setUpdating]     = useState(null);
  const [message,      setMessage]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.date)   params.date   = filter.date;
    if (filter.status) params.status = filter.status;

    doctorAPI.getAppointments(params)
      .then(({ data }) => setAppointments(data.appointments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    try {
      await doctorAPI.updateApptStatus(id, status);
      setMessage(`Appointment marked as ${status}.`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="card mb-5 flex flex-wrap gap-3">
        <input
          type="date"
          value={filter.date}
          onChange={(e) => setFilter((p) => ({ ...p, date: e.target.value }))}
          className="form-input w-40"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
          className="form-input w-40"
        >
          <option value="">All statuses</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => setFilter({ date: '', status: '' })} className="btn-outline text-sm">
          Clear
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {message}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading…" />
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-bold text-blue-600">#{a.token_number}</span>
                    <span className="font-semibold text-gray-800">{a.patient_name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {a.date} · {a.time}
                    {a.patient_phone && <> · 📞 {a.patient_phone}</>}
                    {a.patient_age   && <> · Age {a.patient_age}</>}
                  </p>
                  {a.notes && <p className="text-xs text-gray-400 mt-1 italic">Note: {a.notes}</p>}
                </div>

                {a.status === 'booked' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatus(a.id, 'completed')}
                      disabled={updating === a.id}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      ✓ Complete
                    </button>
                    <button
                      onClick={() => handleStatus(a.id, 'cancelled')}
                      disabled={updating === a.id}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Availability management
// ----------------------------------------------------------------
const Availability = () => {
  const [avail,   setAvail]   = useState([]);
  const [form,    setForm]    = useState({ date: '', start_time: '', end_time: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');

  const load = () => {
    doctorAPI.getAvailability()
      .then(({ data }) => setAvail(data.availability))
      .catch(console.error);
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      await doctorAPI.setAvailability(form);
      setMessage('Availability saved!');
      setForm({ date: '', start_time: '', end_time: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Set availability form */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Set Availability</h3>

        {message && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{message}</div>}
        {error   && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Start Time *</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">End Time *</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Save Availability'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing availability */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Your Schedule</h3>
        {avail.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No availability set.</p>
        ) : (
          <div className="space-y-2">
            {avail.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-800">{a.date}</span>
                <span className="text-sm text-gray-500">{a.start_time} — {a.end_time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Token Queue (doctor's live view)
// ----------------------------------------------------------------
const TokenQueue = () => {
  const today  = new Date().toISOString().split('T')[0];
  const [date, setDate]       = useState(today);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [message, setMessage] = useState('');

  const fetchQueue = useCallback(() => {
    setLoading(true);
    doctorAPI.getCurrentToken(date)
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(fetchQueue, [fetchQueue]);

  const callNext = async () => {
    setAdvancing(true); setMessage('');
    try {
      const { data: resp } = await doctorAPI.callNextToken(date);
      setMessage(resp.message);
      fetchQueue();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed.');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="card mb-5 flex items-center gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="form-input w-44"
        />
        <button onClick={fetchQueue} className="btn-outline">Refresh</button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{message}</div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading queue…" />
      ) : data && (
        <div className="space-y-4">
          {/* Current token display */}
          <div className="card text-center bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <p className="text-sm opacity-80 mb-1">Now Serving</p>
            <p className="text-6xl font-black tracking-tight">
              {data.currentToken === 0 ? '—' : `#${data.currentToken}`}
            </p>
            <p className="text-sm opacity-80 mt-2">{data.queue.length} patients waiting</p>
          </div>

          <button
            onClick={callNext}
            disabled={advancing || data.queue.length === 0}
            className="btn-secondary w-full py-3 text-base"
          >
            {advancing ? 'Calling next…' : '▶ Call Next Patient'}
          </button>

          {/* Queue list */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Waiting Queue</h3>
            {data.queue.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Queue is empty! 🎉</p>
            ) : (
              <div className="space-y-2">
                {data.queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      idx === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      #{item.token_number}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.patient_name}</p>
                      {item.patient_phone && <p className="text-xs text-gray-400">{item.patient_phone}</p>}
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">{item.time}</span>
                    {idx === 0 && <span className="badge-blue">Up next</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Router wrapper
// ----------------------------------------------------------------
const DoctorDashboard = () => (
  <DashboardLayout title="Doctor Dashboard">
    <Routes>
      <Route index             element={<Overview />} />
      <Route path="appointments" element={<Appointments />} />
      <Route path="availability" element={<Availability />} />
      <Route path="queue"        element={<TokenQueue />} />
    </Routes>
  </DashboardLayout>
);

export default DoctorDashboard;
