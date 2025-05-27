import React, { useState, useEffect } from 'react';
import { getUsers } from '../api/users';
import { getLeads } from '../api/leads';
import { useAuth } from '../contexts/AuthContext';

const STATUS_OPTIONS = [
  'NEW',
  'NOT_REACHABLE',
  'NOT_INTERESTED',
  'OPD_DONE',
  'IPD_DONE',
  'CLOSED',
];

export default function DownloadLeads() {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    partnerId: '',
    status: '',
    salesPersonId: '',
    adminId: '',
  });

  useEffect(() => {
    getUsers().then(users => {
      setPartners(users.filter(u => u.role === 'PARTNER'));
      setSalesPeople(users.filter(u => u.role === 'SALES_PERSON'));
      setAdmins(users.filter(u => u.role === 'ADMIN'));
    });
  }, []);

  const handleChange = e => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleDownload = async () => {
    try {
      const params = { ...filters };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`/api/leads/export?${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Download Leads</h2>
      <form className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block mb-1">From Date</label>
            <input type="date" name="from" className="input" value={filters.from} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="block mb-1">To Date</label>
            <input type="date" name="to" className="input" value={filters.to} onChange={handleChange} />
          </div>
        </div>
        <div>
          <label className="block mb-1">Partner</label>
          <select name="partnerId" className="input" value={filters.partnerId} onChange={handleChange}>
            <option value="">All</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Status</label>
          <select name="status" className="input" value={filters.status} onChange={handleChange}>
            <option value="">All</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Sales Person</label>
          <select name="salesPersonId" className="input" value={filters.salesPersonId} onChange={handleChange}>
            <option value="">All</option>
            {salesPeople.map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>
        {user.role === 'SUPERADMIN' && (
          <div>
            <label className="block mb-1">Admin</label>
            <select name="adminId" className="input" value={filters.adminId} onChange={handleChange}>
              <option value="">All</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-center mt-6">
          <button type="button" className="btn btn-primary px-8" onClick={handleDownload}>
            Download
          </button>
        </div>
      </form>
    </div>
  );
} 