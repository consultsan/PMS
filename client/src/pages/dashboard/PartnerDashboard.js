import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLeads, createLead, updateLead, bulkUploadLeads, deleteLead, getLeadRemarks, addLeadRemark } from '../../api/leads';
import { getMyProfile, updateMyProfile } from '../../api/users';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const SPECIALISATIONS = [
  'Orthopaedics',
  'Urology',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Gastroenterology',
  'Nephrology',
  'ENT',
  'General Surgery',
  'Other',
];

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', remarks: '', status: 'NEW', files: [], specialisation: '' });
  const [leadFormError, setLeadFormError] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', email: '', pan: '', aadhaar: '', panDoc: null, aadhaarDoc: null, bankName: '', accountNumber: '', ifscCode: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [sendingRemark, setSendingRemark] = useState(false);
  const [file, setFile] = useState(null);
  const [lastRemarkId, setLastRemarkId] = useState(null);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const pollingRef = useRef();

  useEffect(() => {
    fetchLeads();
    fetchProfile();
  }, [search, statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    const data = await getLeads(params);
    // Only show leads for this partner and filter out DUPLICATE status
    const filtered = data.filter(l => 
      l.partnerId === user.id && 
      l.status !== 'DUPLICATE' &&
      (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))
    );
    setLeads(filtered);
    setLoading(false);
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await getMyProfile();
      setProfile(data);
      setProfileForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        email: data.email || '',
        pan: data.pan || '',
        aadhaar: data.aadhaar || '',
        panDoc: null,
        aadhaarDoc: null,
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
      });
      setEditingProfile(false);
    } catch (err) {
      setProfileError('Failed to load profile');
    }
    setProfileLoading(false);
  };

  const totalPoints = leads.filter(l => l.status !== 'CLOSED' && l.status !== 'DUPLICATE').reduce((sum, l) => sum + (l.points || 0), 0);

  // Calculate points breakdown by status
  const statusList = ['NEW', 'NOT_REACHABLE', 'NOT_INTERESTED', 'OPD_DONE', 'IPD_DONE', 'CLOSED'];
  const pointsByStatus = statusList.reduce((acc, status) => {
    acc[status] = leads.filter(l => l.status === status).reduce((sum, l) => sum + (l.points || 0), 0);
    return acc;
  }, {});

  const openAddLeadModal = () => {
    setEditingLead(null);
    setLeadForm({ name: '', phone: '', remarks: '', status: 'NEW', files: [], specialisation: '' });
    setLeadFormError('');
    setShowLeadModal(true);
  };
  const openEditLeadModal = (lead) => {
    setEditingLead(lead);
    setLeadForm({ name: lead.name, phone: lead.phone, remarks: lead.remarks || '', status: lead.status, files: [], specialisation: lead.specialisation || '' });
    setLeadFormError('');
    setShowLeadModal(true);
  };
  const handleLeadFormChange = e => {
    const { name, value, files } = e.target;
    if (name === 'files') {
      setLeadForm(f => ({ ...f, files: Array.from(files) }));
    } else {
      setLeadForm(f => ({ ...f, [name]: value }));
    }
  };
  const handleLeadFormSubmit = async e => {
    e.preventDefault();
    setLeadFormError('');
    if (!leadForm.name || !leadForm.phone || leadForm.phone.length !== 10) {
      setLeadFormError('Name and 10-digit phone are required.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', leadForm.name);
      formData.append('phone', leadForm.phone);
      formData.append('remarks', leadForm.remarks || '');
      formData.append('status', leadForm.status);
      formData.append('specialisation', leadForm.specialisation);
      if (leadForm.files && leadForm.files.length > 0) {
        leadForm.files.forEach(file => formData.append('files', file));
      }
      let res;
      if (editingLead) {
        res = await updateLead(editingLead.id, formData);
      } else {
        res = await createLead(formData);
      }
      setShowLeadModal(false);
      setEditingLead(null);
      fetchLeads();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setLeadFormError(err.response.data.message);
      } else {
        setLeadFormError(err.message || 'Error saving lead');
      }
    }
  };
  const openBulkUploadModal = () => {
    setShowBulkModal(true);
    setBulkFile(null);
    setBulkResult('');
  };
  const handleBulkUpload = async e => {
    e.preventDefault();
    setBulkResult('');
    if (!bulkFile) return setBulkResult('Please select a file.');
    try {
      const res = await bulkUploadLeads(bulkFile);
      setBulkResult(res.message);
      setBulkFile(null);
      fetchLeads();
    } catch (err) {
      setBulkResult('Upload failed');
    }
  };
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead and all its documents?')) return;
    try {
      await deleteLead(leadId);
      fetchLeads();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleProfileChange = e => {
    const { name, value, files } = e.target;
    if (files) {
      setProfileForm(f => ({ ...f, [name]: files[0] }));
    } else {
      setProfileForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleProfileSubmit = async e => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    try {
      const formData = new FormData();
      formData.append('firstName', profileForm.firstName);
      formData.append('lastName', profileForm.lastName);
      formData.append('phone', profileForm.phone);
      formData.append('pan', profileForm.pan);
      formData.append('aadhaar', profileForm.aadhaar);
      formData.append('bankName', profileForm.bankName || '');
      formData.append('accountNumber', profileForm.accountNumber || '');
      formData.append('ifscCode', profileForm.ifscCode || '');
      if (profileForm.panDoc) formData.append('panDoc', profileForm.panDoc);
      if (profileForm.aadhaarDoc) formData.append('aadhaarDoc', profileForm.aadhaarDoc);
      await updateMyProfile(formData);
      setProfileSuccess('Profile updated successfully');
      fetchProfile();
    } catch (err) {
      setProfileError('Failed to update profile');
    }
  };

  const openChatModal = async (lead) => {
    setSelectedLead(lead);
    setChatModalOpen(true);
    setRemarksLoading(true);
    setNewMessageAlert(false);
    try {
      const data = await getLeadRemarks(lead.id);
      setRemarks(data);
      setLastRemarkId(data.length > 0 ? data[data.length - 1].id : null);
    } catch (e) {
      setRemarks([]);
      setLastRemarkId(null);
    } finally {
      setRemarksLoading(false);
    }
  };

  useEffect(() => {
    if (!chatModalOpen || !selectedLead) return;
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getLeadRemarks(selectedLead.id);
        if (data.length > remarks.length) {
          // Check if the new remark is from the other party
          const newRemarks = data.slice(remarks.length);
          const hasOtherParty = newRemarks.some(r => r.user && r.user.role !== 'PARTNER');
          if (hasOtherParty) setNewMessageAlert(true);
          setRemarks(data);
          setLastRemarkId(data[data.length - 1].id);
        }
      } catch {}
    }, 60000);
    return () => clearInterval(pollingRef.current);
    // eslint-disable-next-line
  }, [chatModalOpen, selectedLead, remarks.length]);

  const closeChatModal = () => {
    setChatModalOpen(false);
    setSelectedLead(null);
    setRemarks([]);
    setNewRemark('');
    setFile(null);
    setNewMessageAlert(false);
  };

  const handleSendRemark = async () => {
    if (!newRemark.trim() && !file) return;
    setSendingRemark(true);
    try {
      const remark = await addLeadRemark(selectedLead.id, newRemark, file);
      setRemarks((prev) => [...prev, remark]);
      setNewRemark('');
      setFile(null);
    } catch (e) {
      // Optionally show error
    } finally {
      setSendingRemark(false);
    }
  };

  return (
    <div className="px-2 sm:px-4 lg:px-8 py-4 w-full max-w-7xl mx-auto font-inter">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center tracking-tight">Partner Dashboard</h1>
      {/* KPI Cards with updated styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-base sm:text-lg font-medium text-gray-600 text-center">Points</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 text-center mt-2">{loading ? '...' : totalPoints}</div>
          {/* Points breakdown with updated styling */}
          <div className="mt-4 w-full overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm bg-gray-50">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Status</th>
                  <th className="text-right font-semibold px-4 py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {statusList.map((status, idx) => (
                  <tr key={status} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="text-left px-4 py-2">{status.replace('_', ' ')}</td>
                    <td className="text-right px-4 py-2">{pointsByStatus[status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-base sm:text-lg font-medium text-gray-600 text-center">Leads</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 text-center mt-2">{loading ? '...' : leads.length}</div>
          {/* Status-wise count breakdown */}
          <div className="mt-4 w-full overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm bg-gray-50">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Status</th>
                  <th className="text-right font-semibold px-4 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {statusList.map((status, idx) => (
                  <tr key={status} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="text-left px-4 py-2">{status.replace('_', ' ')}</td>
                    <td className="text-right px-4 py-2">{leads.filter(l => l.status === status).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mb-10">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Lead Management</h2>
        <div className="mb-2 flex flex-col sm:flex-row gap-2 flex-wrap">
          <input 
            className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-64" 
            placeholder="Search leads..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <select 
            className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-48"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="OPD_DONE">OPD Done</option>
            <option value="IPD_DONE">IPD Done</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 w-full sm:w-auto" onClick={openAddLeadModal}>Add Lead</button>
          <button className="btn bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 w-full sm:w-auto" onClick={openBulkUploadModal}>Bulk Upload</button>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-blue-700 text-white sticky top-0">
              <tr>
                <th className="text-center font-semibold px-4 py-3">Name</th>
                <th className="text-center font-semibold px-4 py-3">Phone</th>
                <th className="text-center font-semibold px-4 py-3">Status</th>
                <th className="text-center font-semibold px-4 py-3">Points</th>
                <th className="text-center font-semibold px-4 py-3">Documents</th>
                <th className="text-center font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4">No leads found</td></tr>
              ) :
                leads.map((lead, idx) => (
                  <tr key={lead.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                    <td className="text-center px-4 py-3">{lead.name}</td>
                    <td className="text-center px-4 py-3">{lead.phone}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'OPD_DONE' ? 'bg-green-100 text-green-800' :
                          lead.status === 'IPD_DONE' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">{lead.points}</td>
                    <td className="text-center px-4 py-3">
                      {lead.documents && lead.documents.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {lead.documents.map(doc => (
                            <a key={doc.id} href={`${BACKEND_URL}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 underline">Document</a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No Docs</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex flex-col sm:flex-row justify-center gap-2">
                        <button className="btn bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-xs sm:text-sm" onClick={() => openEditLeadModal(lead)}>Edit</button>
                        <button className="btn bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-xs sm:text-sm" onClick={() => handleDeleteLead(lead.id)}>Delete</button>
                        <button className="btn bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-xs sm:text-sm" onClick={() => openChatModal(lead)}>Chat</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Profile Management</h2>
        <div className="card text-center">
          {profileLoading ? (
            <div>Loading...</div>
          ) : editingProfile ? (
            <form className="space-y-4 max-w-lg mx-auto text-left" onSubmit={handleProfileSubmit}>
              <div>
                <label className="block mb-1">First Name *</label>
                <input className="input" name="firstName" value={profileForm.firstName} onChange={handleProfileChange} required />
              </div>
              <div>
                <label className="block mb-1">Last Name *</label>
                <input className="input" name="lastName" value={profileForm.lastName} onChange={handleProfileChange} required />
              </div>
              <div>
                <label className="block mb-1">Phone *</label>
                <input className="input" name="phone" value={profileForm.phone} onChange={handleProfileChange} required maxLength={10} minLength={10} />
              </div>
              <div>
                <label className="block mb-1">Email</label>
                <input className="input" name="email" value={profileForm.email} disabled />
              </div>
              <div>
                <label className="block mb-1">PAN</label>
                <input className="input" name="pan" value={profileForm.pan} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">Aadhaar</label>
                <input className="input" name="aadhaar" value={profileForm.aadhaar} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">Bank Name</label>
                <input className="input" name="bankName" value={profileForm.bankName || ''} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">Account Number</label>
                <input className="input" name="accountNumber" value={profileForm.accountNumber || ''} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">IFSC Code</label>
                <input className="input" name="ifscCode" value={profileForm.ifscCode || ''} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">PAN Document</label>
                {profile && profile.panDocUrl && (
                  <a href={`${BACKEND_URL}${profile.panDocUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline mr-2">View</a>
                )}
                <input className="input" name="panDoc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleProfileChange} />
              </div>
              <div>
                <label className="block mb-1">Aadhaar Document</label>
                {profile && profile.aadhaarDocUrl && (
                  <a href={`${BACKEND_URL}${profile.aadhaarDocUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline mr-2">View</a>
                )}
                <input className="input" name="aadhaarDoc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleProfileChange} />
              </div>
              {profileError && <div className="text-red-600">{profileError}</div>}
              {profileSuccess && <div className="text-green-600">{profileSuccess}</div>}
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit">Save</button>
                <button className="btn btn-secondary" type="button" onClick={() => setEditingProfile(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 max-w-lg mx-auto text-left">
              <div><span className="font-bold">First Name:</span> {profile.firstName}</div>
              <div><span className="font-bold">Last Name:</span> {profile.lastName}</div>
              <div><span className="font-bold">Phone:</span> {profile.phone}</div>
              <div><span className="font-bold">Email:</span> {profile.email}</div>
              <div><span className="font-bold">PAN:</span> {profile.pan || <span className="text-gray-400">Not Provided</span>}</div>
              <div><span className="font-bold">Aadhaar:</span> {profile.aadhaar || <span className="text-gray-400">Not Provided</span>}</div>
              <div><span className="font-bold">Bank Name:</span> {profile.bankName || <span className="text-gray-400">Not Provided</span>}</div>
              <div><span className="font-bold">Account Number:</span> {profile.accountNumber || <span className="text-gray-400">Not Provided</span>}</div>
              <div><span className="font-bold">IFSC Code:</span> {profile.ifscCode || <span className="text-gray-400">Not Provided</span>}</div>
              <div><span className="font-bold">PAN Document:</span> {profile.panDocUrl ? <a href={`${BACKEND_URL}${profile.panDocUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">View</a> : <span className="text-gray-400">Not Uploaded</span>}</div>
              <div><span className="font-bold">Aadhaar Document:</span> {profile.aadhaarDocUrl ? <a href={`${BACKEND_URL}${profile.aadhaarDocUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">View</a> : <span className="text-gray-400">Not Uploaded</span>}</div>
              {profileError && <div className="text-red-600">{profileError}</div>}
              {profileSuccess && <div className="text-green-600">{profileSuccess}</div>}
              <div className="flex gap-2 mt-4">
                <button className="btn btn-primary" onClick={() => setEditingProfile(true)}>Edit</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">{editingLead ? 'Edit Lead' : 'Add Lead'}</h2>
            <form onSubmit={handleLeadFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input 
                  className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full" 
                  name="name" 
                  value={leadForm.name} 
                  onChange={handleLeadFormChange} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input 
                  className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full" 
                  name="phone" 
                  value={leadForm.phone} 
                  onChange={handleLeadFormChange} 
                  required 
                  maxLength={10} 
                  minLength={10} 
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold">Specialisation *</label>
                <select className="input text-xs" name="specialisation" value={leadForm.specialisation} onChange={handleLeadFormChange} required>
                  <option value="">Select Specialisation</option>
                  {SPECIALISATIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {user.role !== 'PARTNER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full" 
                    name="status" 
                    value={leadForm.status} 
                    onChange={handleLeadFormChange}
                  >
                    <option value="NEW">New</option>
                    <option value="OPD_DONE">OPD Done</option>
                    <option value="IPD_DONE">IPD Done</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea 
                  className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full" 
                  name="remarks" 
                  value={leadForm.remarks} 
                  onChange={handleLeadFormChange} 
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Documents (optional, multiple)</label>
                <input 
                  className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full" 
                  name="files" 
                  type="file" 
                  multiple 
                  onChange={handleLeadFormChange} 
                />
              </div>
              {leadFormError && <div className="text-red-600 text-sm">{leadFormError}</div>}
              <div className="flex gap-2 justify-end mt-6">
                <button 
                  className="btn bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200" 
                  type="button" 
                  onClick={() => { setShowLeadModal(false); setEditingLead(null); }}
                >
                  Cancel
                </button>
                <button 
                  className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600" 
                  type="submit"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">Bulk Upload Leads</h2>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={e => setBulkFile(e.target.files[0])} 
                  className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-full"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button 
                  className="btn bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200" 
                  type="button" 
                  onClick={() => { setShowBulkModal(false); setBulkResult(''); }}
                >
                  Cancel
                </button>
                <button 
                  className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600" 
                  type="submit"
                >
                  Upload
                </button>
              </div>
              {bulkResult && <div className="text-green-600 text-sm mt-2">{bulkResult}</div>}
            </form>
            <div className="mt-4 text-sm text-gray-500">
              Download template: 
              <a href="/lead-template.xlsx" className="text-blue-700 hover:text-blue-900 underline ml-1">
                lead-template.xlsx
              </a>
            </div>
          </div>
        </div>
      )}
      {chatModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Chat with {selectedLead.name}</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => { setChatModalOpen(false); setSelectedLead(null); }}
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-lg p-4">
              {remarksLoading ? (
                <div className="text-center py-4 text-gray-600">Loading...</div>
              ) : remarks.length === 0 ? (
                <div className="text-center text-gray-500">No messages yet</div>
              ) : (
                remarks.map(remark => (
                  <div key={remark.id} className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary-700">{remark.user.firstName} {remark.user.lastName}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(remark.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                      <p className="text-gray-800 text-base leading-relaxed">{remark.message}</p>
                      {remark.fileUrl && (
                        <a 
                          href={`${BACKEND_URL}${remark.fileUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary-600 hover:text-primary-700 underline text-sm mt-2 inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                className="input bg-white border border-gray-200 rounded-lg px-4 py-2.5 flex-1 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Type a message..."
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendRemark(); }}
                disabled={sendingRemark}
              />
              <input
                type="file"
                className="input bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800"
                style={{ width: 120 }}
                onChange={e => setFile(e.target.files[0])}
                disabled={sendingRemark}
              />
              <button 
                className="btn bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                onClick={handleSendRemark} 
                disabled={sendingRemark || (!newRemark.trim() && !file)}
              >
                {sendingRemark ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 