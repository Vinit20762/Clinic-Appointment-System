import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner  from '../components/LoadingSpinner';
import StatusBadge     from '../components/StatusBadge';
import { adminAPI, reportAPI } from '../services/api';

// ----------------------------------------------------------------
// Overview — key metrics from /admin/reports
// ----------------------------------------------------------------
const Overview = () => {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getReports()
      .then(({ data }) => setReport(data.report))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;
  if (!report)  return <p className="text-red-500">Failed to load report.</p>;

  const { totals, statusBreakdown, topDoctors } = report;

  return (
    <div>
      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Doctors',      value: totals.doctors,      icon: '👨‍⚕️', color: 'bg-blue-50   text-blue-700'   },
          { label: 'Patients',     value: totals.patients,     icon: '👥',   color: 'bg-purple-50 text-purple-700' },
          { label: 'Appointments', value: totals.appointments, icon: '📋',   color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Today',        value: totals.today,        icon: '📅',   color: 'bg-amber-50  text-amber-700'  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`card text-center ${color}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Appointments by Status</h3>
          <div className="space-y-3">
            {statusBreakdown.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="font-bold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top doctors */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Top Doctors by Appointments</h3>
          {topDoctors.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {topDoctors.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-800">Dr. {d.doctor_name}</p>
                    <p className="text-xs text-gray-400">{d.specialization}</p>
                  </div>
                  <span className="badge-blue">{d.appointment_count} appts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
// Doctors management
// ----------------------------------------------------------------
const Doctors = () => {
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '', specialization: '' });
  const [formErr,  setFormErr]  = useState('');
  const [formOk,   setFormOk]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getDoctors()
      .then(({ data }) => setDoctors(data.doctors))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true); setFormErr(''); setFormOk('');
    try {
      await adminAPI.addDoctor(form);
      setFormOk('Doctor added successfully!');
      setForm({ name: '', email: '', password: '', specialization: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to add doctor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove Dr. ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminAPI.deleteDoctor(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-800">All Doctors ({doctors.length})</h3>
        <button onClick={() => setShowForm((p) => !p)} className="btn-primary text-sm">
          {showForm ? '✕ Cancel' : '+ Add Doctor'}
        </button>
      </div>

      {/* Add Doctor Form */}
      {showForm && (
        <div className="card mb-6 border-blue-200 border">
          <h4 className="font-semibold text-gray-700 mb-4">Add New Doctor</h4>
          {formErr && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formErr}</div>}
          {formOk  && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{formOk}</div>}

          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'name',           label: 'Full Name',      placeholder: 'Dr. John Doe', type: 'text' },
              { name: 'email',          label: 'Email',          placeholder: 'dr@clinic.com', type: 'email' },
              { name: 'password',       label: 'Password',       placeholder: 'Min 8 chars',  type: 'password' },
              { name: 'specialization', label: 'Specialization', placeholder: 'Cardiologist',  type: 'text' },
            ].map(({ name, label, placeholder, type }) => (
              <div key={name}>
                <label className="form-label">{label} *</label>
                <input
                  type={type}
                  value={form[name]}
                  onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="form-input"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Adding…' : 'Add Doctor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((d) => (
            <div key={d.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold mr-3 shrink-0">
                  {d.name.charAt(0)}
                </div>
                <button
                  onClick={() => handleDelete(d.id, d.name)}
                  disabled={deleting === d.id}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-auto text-sm"
                  title="Remove doctor"
                >
                  ✕
                </button>
              </div>
              <h4 className="font-semibold text-gray-800 mt-3">Dr. {d.name}</h4>
              <p className="text-sm text-gray-500">{d.specialization}</p>
              <p className="text-xs text-gray-400 mt-1">{d.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Patients list
// ----------------------------------------------------------------
const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    adminAPI.getPatients()
      .then(({ data }) => setPatients(data.patients))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="card mb-5">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Age</th>
                <th className="pb-3 pr-4">Gender</th>
                <th className="pb-3">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-800">{p.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{p.email}</td>
                  <td className="py-3 pr-4">{p.age || '—'}</td>
                  <td className="py-3 pr-4 capitalize">{p.gender || '—'}</td>
                  <td className="py-3">{p.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No patients found.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------
const Reports = () => {
  const today = new Date().toISOString().split('T')[0];
  const [date,    setDate]    = useState(today);
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDaily = () => {
    setLoading(true);
    reportAPI.daily(date)
      .then(({ data }) => setReport(data.report))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchDaily, [date]);

  return (
    <div>
      <div className="card mb-6 flex items-center gap-4">
        <div>
          <label className="form-label">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input w-44"
          />
        </div>
      </div>

      {loading ? <LoadingSpinner text="Generating report…" /> : report && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {report.statusBreakdown.map(({ status, count }) => (
              <div key={status} className="card text-center">
                <StatusBadge status={status} />
                <p className="text-3xl font-bold mt-2">{count}</p>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-gray-800 mb-4">All Appointments — {date}</h3>
            {report.appointments.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No appointments on this date.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 pr-4">Token</th>
                    <th className="pb-2 pr-4">Patient</th>
                    <th className="pb-2 pr-4">Doctor</th>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-mono font-bold text-blue-600">#{a.token_number}</td>
                      <td className="py-2 pr-4">{a.patient_name}</td>
                      <td className="py-2 pr-4">{a.doctor_name}</td>
                      <td className="py-2 pr-4 text-gray-500">{a.time}</td>
                      <td className="py-2"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
const AdminDashboard = () => (
  <DashboardLayout title="Admin Dashboard">
    <Routes>
      <Route index          element={<Overview />} />
      <Route path="doctors"  element={<Doctors />} />
      <Route path="patients" element={<Patients />} />
      <Route path="reports"  element={<Reports />} />
    </Routes>
  </DashboardLayout>
);

export default AdminDashboard;
