import React, { useState, useEffect } from 'react';

export default function AdminFormModal({ open, onClose, onSave, initialData, hospitalId }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        password: '', // never prefill password
        phone: initialData.phone || '',
      });
    } else {
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
    }
  }, [initialData, open]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, hospitalId });
      onClose();
    } catch (err) {
      alert('Failed to save admin');
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 className="text-lg font-bold mb-4">{initialData ? 'Edit Admin' : 'Add Admin'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input w-full" name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} required />
          <input className="input w-full" name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} required />
          <input className="input w-full" name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} required />
          <input className="input w-full" name="phone" placeholder="Phone (10 digits)" type="text" value={form.phone} onChange={handleChange} required pattern="\d{10}" maxLength={10} minLength={10} />
          <input className="input w-full" name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required={!initialData} />
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (initialData ? 'Update' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
} 