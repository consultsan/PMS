import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function RegisterPartner() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await axios.post(`${BACKEND_URL}/api/auth/register-partner`, form);
      setMessage('Registration successful! Await admin approval.');
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: "url('/login-bg.png') no-repeat center center",
        backgroundSize: 'cover',
        overflow: 'auto',
      }}
    >
      <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-opacity-80 py-8 px-2 sm:px-4 lg:px-8 relative z-10">
        <div className="w-full max-w-md space-y-8 mx-auto">
          <div>
            <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
              Partner Registration
            </h2>
          </div>
          <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {error && (
              <div className="rounded-md bg-red-50 p-3 sm:p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            {message && (
              <div className="rounded-md bg-green-50 p-3 sm:p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">{message}</h3>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="firstName" className="sr-only">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-base sm:text-sm"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="sr-only">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-base sm:text-sm"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-base sm:text-sm"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="phone" className="sr-only">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  required
                  maxLength={10}
                  minLength={10}
                  className="appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-base sm:text-sm"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-base sm:text-sm"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 