import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Field = ({ name, label, type = 'text', placeholder, required, value, onChange, error }) => (
  <div>
    <label className="form-label">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={`form-input ${error ? 'border-red-400' : ''}`}
    />
    {error && <p className="form-error">{error}</p>}
  </div>
);

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    age: '', gender: '', phone: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())      errs.name     = 'Name is required';
    if (!form.email.trim())     errs.email    = 'Email is required';
    if (form.password.length < 8) errs.password = 'Password must be 8+ characters';
    if (!/[A-Z]/.test(form.password)) errs.password = 'Password needs an uppercase letter';
    if (!/[0-9]/.test(form.password)) errs.password = 'Password needs a number';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
        age:      form.age    ? parseInt(form.age)  : undefined,
        gender:   form.gender || undefined,
        phone:    form.phone  || undefined,
      };
      await register(payload);
      navigate('/patient');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Register as a patient</p>
        </div>

        <div className="card shadow-md">
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field name="name"  label="Full Name"   placeholder="Alice Smith"          required value={form.name}     onChange={handleChange} error={errors.name} />
              <Field name="email" label="Email"       type="email" placeholder="alice@example.com" required value={form.email}    onChange={handleChange} error={errors.email} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field name="password" label="Password"         type="password" placeholder="Min 8 chars" required value={form.password} onChange={handleChange} error={errors.password} />
              <Field name="confirm"  label="Confirm Password" type="password" placeholder="Re-enter"    required value={form.confirm}  onChange={handleChange} error={errors.confirm} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field name="age"   label="Age"   type="number" placeholder="30"          value={form.age}   onChange={handleChange} error={errors.age} />
              <div>
                <label className="form-label">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field name="phone" label="Phone" placeholder="9876543210"                value={form.phone} onChange={handleChange} error={errors.phone} />
            </div>

            <button type="submit" disabled={loading} className="btn-secondary w-full mt-2">
              {loading ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
