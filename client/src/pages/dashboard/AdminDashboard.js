import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser } from '../../api/users';
import { getHospitals } from '../../api/hospitals';
import { getLeads, updateLead, bulkUploadLeads, reassignLead } from '../../api/leads';
import PartnerPointsTable from '../../components/PartnerPointsTable';
import { UserGroupIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const PARTNER_TYPES = [
  'Pharmacist',
  'Diagnostic Lab',
  'GP',
  'Doctor',
  'Others',
];

function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-8">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-6 w-6 text-blue-700" />}
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, badgeColor }) {
  return (
    <div className="flex flex-col items-center justify-center bg-blue-50 rounded-xl shadow-md p-6 min-w-[160px]">
      <div className={`flex items-center justify-center h-12 w-12 rounded-full mb-2 ${badgeColor}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="text-lg font-semibold text-gray-600 text-center">{label}</div>
      <div className="text-3xl font-extrabold text-blue-900 text-center mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color =
    status === 'APPROVED' ? 'bg-green-500' :
    status === 'PENDING' ? 'bg-yellow-500' :
    status === 'REJECTED' ? 'bg-red-500' :
    status === 'Active' ? 'bg-green-500' :
    status === 'Inactive' ? 'bg-gray-400' :
    'bg-blue-500';
  return (
    <span className={`status-badge ${color} text-white`}>{status}</span>
  );
}

export default function AdminDashboard() {
  // Partner & Sales Management state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'PARTNER', hospitalId: '', isActive: true, password: '', partnerType: '', partnerTypeOther: '' });
  const [formError, setFormError] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  // Lead Reassignment state
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [reassignUser, setReassignUser] = useState({});
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [pendingReassign, setPendingReassign] = useState(null);
  const eligiblePartners = users.filter(u => u.isActive && u.role === 'PARTNER');
  const eligibleSales = users.filter(u => u.isActive && u.role === 'SALES_PERSON');
  const [reassignType, setReassignType] = useState({});

  // Bulk Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState('');

  // Duplicate Leads state
  const [duplicateLeads, setDuplicateLeads] = useState([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchHospitals();
    fetchLeads();
    fetchDuplicateLeads();
  }, [userRoleFilter, leadStatusFilter]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = {};
      if (userRoleFilter) params.role = userRoleFilter;
      const data = await getUsers(params);
      setUsers(data.filter(u => u.role === 'PARTNER' || u.role === 'SALES_PERSON'));
    } catch (err) {
      setUsers([]);
    }
    setLoadingUsers(false);
  };

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const data = await getHospitals();
      setHospitals(data);
    } catch (err) {
      setHospitals([]);
    }
    setLoadingHospitals(false);
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const params = {};
      if (leadStatusFilter) params.status = leadStatusFilter;
      const data = await getLeads(params);
      setLeads(data.filter(lead => lead.status !== 'DUPLICATE'));
    } catch (err) {
      setLeads([]);
    }
    setLoadingLeads(false);
  };

  const fetchDuplicateLeads = async () => {
    setLoadingDuplicates(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BACKEND_URL}/api/leads/duplicates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDuplicateLeads(res.data);
    } catch (err) {
      setDuplicateLeads([]);
    }
    setLoadingDuplicates(false);
  };

  const filteredUsers = users.filter(u =>
    ((u.firstName + ' ' + u.lastName).toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLeads = leads.filter(l =>
    (!leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone.includes(leadSearch))
  );

  const openForm = (user = null) => {
    setEditingUser(user);
    setForm(
      user
        ? {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'PARTNER',
            hospitalId: user.hospitalId || '',
            isActive: user.isActive !== undefined ? user.isActive : true,
            password: '',
            partnerType: user.partnerType || '',
            partnerTypeOther: user.partnerTypeOther || '',
          }
        : { firstName: '', lastName: '', email: '', phone: '', role: 'PARTNER', hospitalId: '', isActive: true, password: '', partnerType: '', partnerTypeOther: '' }
    );
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.role || !form.hospitalId) {
      setFormError('All fields except password are required.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setFormError('Phone number must be 10 digits.');
      return;
    }
    try {
      if (editingUser) {
        await updateUser(editingUser.id, form);
      } else {
        await createUser(form);
      }
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Error saving user');
    }
  };

  const handleActivateToggle = async user => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err) {
      // Optionally show error
    }
  };

  const eligibleUsers = users.filter(u => u.isActive);

  const handleReassignClick = (leadId) => {
    setPendingReassign(leadId);
    setShowReassignModal(true);
  };

  const handleReassignConfirm = async () => {
    const leadId = pendingReassign;
    const { partnerId, salesPersonId } = reassignUser[leadId] || {};
    if (!partnerId && !salesPersonId) return;
    try {
      await reassignLead(leadId, { partnerId, salesPersonId });
      setShowReassignModal(false);
      setPendingReassign(null);
      fetchLeads();
    } catch (err) {
      // Optionally show error
    }
  };

  const handleBulkUpload = async e => {
    e.preventDefault();
    setUploadResult('');
    if (!uploadFile) return setUploadResult('Please select a file.');
    try {
      const res = await bulkUploadLeads(uploadFile);
      setUploadResult(res.message);
      setUploadFile(null);
      fetchLeads();
    } catch (err) {
      setUploadResult('Upload failed');
    }
  };

  // Add this function to handle deleting a duplicate lead
  const handleDeleteDuplicateLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to permanently delete this duplicate lead?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDuplicateLeads();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 font-inter">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center tracking-tight">Admin Dashboard</h1>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <KpiCard icon={UserGroupIcon} label="Partners & Sales" value={users.length} badgeColor="bg-blue-700" />
        <KpiCard icon={ClipboardDocumentListIcon} label="Leads" value={leads.length} badgeColor="bg-blue-500" />
      </div>
      {/* Partner & Sales Management Section */}
      <SectionHeader icon={UserGroupIcon} title="Partner & Sales Management" />
      <div className="mb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <button className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto" onClick={() => openForm()}>Add User</button>
        <input className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-64" placeholder="Search partners/sales..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
        <select className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-48" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="PARTNER">Partner</option>
          <option value="SALES_PERSON">Sales Person</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-md overflow-x-auto mb-8">
        {loadingUsers ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Partner Type</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">No users found</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                    <td className="px-4 py-3">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /></td>
                    <td className="px-4 py-3">{u.partnerType === 'Others' ? u.partnerTypeOther : u.partnerType}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button className="btn bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-xs sm:text-sm" onClick={() => openForm(u)}>Edit</button>
                        <button className="btn bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-xs sm:text-sm" onClick={() => handleActivateToggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal for create/edit user */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block mb-1">First Name *</label>
                <input className="input" name="firstName" value={form.firstName} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="block mb-1">Last Name *</label>
                <input className="input" name="lastName" value={form.lastName} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="block mb-1">Email *</label>
                <input className="input" name="email" type="email" value={form.email} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="block mb-1">Phone *</label>
                <input className="input" name="phone" type="text" value={form.phone} onChange={handleFormChange} required maxLength={10} minLength={10} pattern="\d{10}" />
              </div>
              <div>
                <label className="block mb-1">Role *</label>
                <select className="input" name="role" value={form.role} onChange={handleFormChange} required>
                  <option value="PARTNER">Partner</option>
                  <option value="SALES_PERSON">Sales Person</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Hospital *</label>
                <select className="input" name="hospitalId" value={form.hospitalId} onChange={handleFormChange} required>
                  <option value="">Select Hospital</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              {form.role === 'PARTNER' && (
                <div>
                  <label className="block mb-1">Partner Type *</label>
                  <select className="input" name="partnerType" value={form.partnerType} onChange={handleFormChange} required>
                    <option value="">Select Type</option>
                    {PARTNER_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {form.partnerType === 'Others' && (
                    <input className="input mt-2" name="partnerTypeOther" value={form.partnerTypeOther} onChange={handleFormChange} placeholder="Please specify" required />
                  )}
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block mb-1">Password *</label>
                  <input className="input" name="password" type="password" value={form.password} onChange={handleFormChange} required />
                </div>
              )}
              <div className="flex items-center">
                <input className="mr-2" type="checkbox" name="isActive" checked={form.isActive} onChange={handleFormChange} />
                <label>Active</label>
              </div>
              {formError && <div className="text-red-600">{formError}</div>}
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit">Save</button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setEditingUser(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="mb-10">
        <SectionHeader icon={ClipboardDocumentListIcon} title="Lead Reassignment" />
        <div className="mb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
          <input className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-64" placeholder="Search leads..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
          <select className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-48" value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="NOT_REACHABLE">Not Reachable</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="OPD_DONE">OPD Done</option>
            <option value="IPD_DONE">IPD Done</option>
            <option value="CLOSED">Closed</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          {loadingLeads ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Current Assignee</th>
                  <th className="px-4 py-3 font-semibold">Reassign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4">No leads found</td></tr>
                ) : (
                  filteredLeads.map(lead => (
                    <tr key={lead.id} className="even:bg-gray-50 hover:bg-indigo-50 transition-colors">
                      <td className="px-4 py-3">{lead.name}</td>
                      <td className="px-4 py-3">{lead.phone}</td>
                      <td className="px-4 py-3">{lead.status}</td>
                      <td className="px-4 py-3">
                        <div className="mb-1">
                          <span className="font-semibold">Partner:</span>
                          <select
                            className="input w-40 inline-block ml-2"
                            value={reassignUser[lead.id]?.partnerId || lead.partnerId || ''}
                            onChange={e =>
                              setReassignUser(r => ({
                                ...r,
                                [lead.id]: { ...r[lead.id], partnerId: e.target.value }
                              }))
                            }
                          >
                            <option value="">Select Partner</option>
                            {eligiblePartners.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="font-semibold">Sales:</span>
                          <select
                            className="input w-40 inline-block ml-2"
                            value={reassignUser[lead.id]?.salesPersonId || lead.salesPersonId || ''}
                            onChange={e =>
                              setReassignUser(r => ({
                                ...r,
                                [lead.id]: { ...r[lead.id], salesPersonId: e.target.value }
                              }))
                            }
                          >
                            <option value="">Select Sales</option>
                            {eligibleSales.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs sm:text-sm mt-2"
                          onClick={() => handleReassignClick(lead.id)}
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Confirmation Modal */}
        {showReassignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4 text-center">Confirm Reassignment</h2>
              <div className="mb-4 text-center">Are you sure you want to reassign this lead?</div>
              <div className="flex gap-2 justify-center">
                <button className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onClick={handleReassignConfirm}>Yes, Reassign</button>
                <button className="btn bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => setShowReassignModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mb-10">
        <SectionHeader icon={ClipboardDocumentListIcon} title="Bulk Upload" />
        <form onSubmit={handleBulkUpload} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input type="file" accept=".xlsx,.xls" onChange={e => setUploadFile(e.target.files[0])} className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-auto" />
            <button className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto" type="submit">Upload</button>
          </div>
          {uploadResult && <div className="text-green-700 text-sm mt-2">{uploadResult}</div>}
        </form>
        <div className="mt-2 text-sm text-gray-500">Download template: <a href="/lead-template.xlsx" className="text-blue-700 hover:text-blue-900 underline">lead-template.xlsx</a></div>
      </div>
      {/* Define Points Per Partner Section */}
      <SectionHeader icon={ClipboardDocumentListIcon} title="Define Points Per Partner" />
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-12 overflow-x-auto border border-blue-200">
        <PartnerPointsTable />
      </div>
      {/* Duplicate Leads Section */}
      <SectionHeader icon={ExclamationTriangleIcon} title="Duplicate Leads">
        <span className="text-xs text-gray-500">(Not counted in KPIs or reports)</span>
      </SectionHeader>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-12 overflow-x-auto border border-red-200">
        {loadingDuplicates ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-red-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            <span className="text-red-400 font-medium text-lg">Loading duplicate leads...</span>
          </div>
        ) : duplicateLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-300 mb-2" />
            <span className="text-red-400 font-medium text-lg">No duplicate leads found.</span>
          </div>
        ) : (
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-red-100 text-red-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-left">Name</th>
                <th className="px-4 py-3 font-semibold text-left">Phone</th>
                <th className="px-4 py-3 font-semibold text-left">Remarks</th>
                <th className="px-4 py-3 font-semibold text-left">Created By</th>
                <th className="px-4 py-3 font-semibold text-left">Partner</th>
                <th className="px-4 py-3 font-semibold text-left">Sales Person</th>
                <th className="px-4 py-3 font-semibold text-left">Hospital</th>
                <th className="px-4 py-3 font-semibold text-left">Created At</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {duplicateLeads.map((lead, idx) => (
                <tr key={lead.id} className={
                  `transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50'} hover:bg-red-100`
                }>
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3">{lead.phone}</td>
                  <td className="px-4 py-3">{lead.remarks}</td>
                  <td className="px-4 py-3">{lead.createdBy ? `${lead.createdBy.firstName} ${lead.createdBy.lastName}` : ''}</td>
                  <td className="px-4 py-3">{lead.partner ? `${lead.partner.firstName} ${lead.partner.lastName}` : ''}</td>
                  <td className="px-4 py-3">{lead.salesPerson ? `${lead.salesPerson.firstName} ${lead.salesPerson.lastName}` : ''}</td>
                  <td className="px-4 py-3">{lead.hospital ? lead.hospital.name : ''}</td>
                  <td className="px-4 py-3">{new Date(lead.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs sm:text-sm font-semibold shadow-sm transition" onClick={() => handleDeleteDuplicateLead(lead.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 