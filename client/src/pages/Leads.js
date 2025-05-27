import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, createLead, updateLead, deleteLead, bulkUploadLeads, getLeadRemarks, addLeadRemark } from '../api/leads';
import { getHospitals } from '../api/hospitals';
import { getUsers } from '../api/users';
import { InformationCircleIcon, PencilIcon, TrashIcon, ChatBubbleLeftRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const STATUS_OPTIONS = [
  'NEW',
  'NOT_REACHABLE',
  'NOT_INTERESTED',
  'OPD_DONE',
  'IPD_DONE',
  'CLOSED',
];
const STATUS_POINTS = {
  NEW: 100,
  OPD_DONE: 200,
  IPD_DONE: 3500,
};

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

function StatusBadge({ status }) {
  const colorMap = {
    NEW: 'bg-blue-500',
    NOT_REACHABLE: 'bg-yellow-400',
    NOT_INTERESTED: 'bg-gray-400',
    OPD_DONE: 'bg-green-500',
    IPD_DONE: 'bg-teal-600',
    CLOSED: 'bg-red-500',
    DUPLICATE: 'bg-pink-500',
    DELETED: 'bg-gray-300',
  };
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${colorMap[status] || 'bg-gray-400'}`}>{status.replace('_', ' ')}</span>
  );
}

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', remarks: '', status: 'NEW', points: 100, files: [], pointsOverride: '', hospitalId: '', specialisation: '' });
  const [formError, setFormError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [remarks, setRemarks] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [sendingRemark, setSendingRemark] = useState(false);
  const [file, setFile] = useState(null);
  const [lastRemarkId, setLastRemarkId] = useState(null);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [users, setUsers] = useState([]);
  const [reassignUser, setReassignUser] = useState({});
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [pendingReassign, setPendingReassign] = useState(null);
  const [specialisationFilter, setSpecialisationFilter] = useState('');

  useEffect(() => {
    fetchLeads();
    if (user.role === 'SUPERADMIN') {
      getHospitals().then(setHospitals);
    }
    if (user.role === 'ADMIN') {
      fetchUsers();
    }
  }, [filterStatus, search]);

  const fetchLeads = async () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    const data = await getLeads(params);
    setLeads(
      data.filter(l => l.status !== 'DUPLICATE')
        .filter(l => (!search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)))
    );
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const openForm = (lead = null) => {
    setSelectedLead(lead);
    setForm(
      lead
        ? { ...lead, pointsOverride: lead.pointsOverride || '', files: [], specialisation: lead.specialisation || '' }
        : { name: '', phone: '', remarks: '', status: 'NEW', points: 100, files: [], pointsOverride: '', hospitalId: '', specialisation: '' }
    );
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = e => {
    const { name, value, files } = e.target;
    if (name === 'files') {
      setForm(f => ({ ...f, files: Array.from(files) }));
    } else {
      let newForm = { ...form, [name]: value };
      // Update points if status changes
      if (name === 'status') {
        newForm.points = Number(STATUS_POINTS[value] || 0);
      }
      setForm(newForm);
    }
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.phone || form.phone.length !== 10) {
      setFormError('Name and 10-digit phone are required.');
      return;
    }
    if (user.role === 'SUPERADMIN' && !form.hospitalId) {
      setFormError('Hospital is required.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phone', form.phone);
      formData.append('remarks', form.remarks || '');
      formData.append('status', form.status);
      formData.append('specialisation', form.specialisation);
      if (form.files && form.files.length > 0) {
        form.files.forEach(file => formData.append('files', file));
      }
      if (user.role === 'SUPERADMIN') {
        formData.append('hospitalId', form.hospitalId);
        if (form.pointsOverride) {
          formData.append('pointsOverride', form.pointsOverride);
        }
      }
      if (selectedLead) {
        await updateLead(selectedLead.id, formData);
      } else {
        await createLead(formData);
      }
      setShowForm(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      setFormError(err.message || 'Error saving lead');
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

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead and all its documents?')) return;
    try {
      await deleteLead(leadId);
      fetchLeads();
    } catch (err) {
      alert('Delete failed');
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

  const handleSendRemark = async () => {
    if (!newRemark.trim() && !file) return;
    setSendingRemark(true);
    try {
      const remark = await addLeadRemark(selectedLead.id, newRemark, file);
      setRemarks(prev => [...prev, remark]);
      setNewRemark('');
      setFile(null);
    } catch (e) {
      // Optionally show error
    } finally {
      setSendingRemark(false);
    }
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

  const eligiblePartners = users.filter(u => u.isActive && u.role === 'PARTNER');
  const eligibleSales = users.filter(u => u.isActive && u.role === 'SALES_PERSON');

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      (lead.specialisation && lead.specialisation.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesSpecialisation = !specialisationFilter || lead.specialisation === specialisationFilter;
    return matchesSearch && matchesStatus && matchesSpecialisation;
  });

  return (
    <div className="px-2 sm:px-4 lg:px-8 py-4 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">Leads</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="btn btn-primary flex-1 sm:flex-none" onClick={() => openForm()}>Add Lead</button>
          <button className="btn btn-secondary flex-1 sm:flex-none" onClick={() => setShowUpload(true)}>Bulk Upload</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 text-xs">
        <select className="input w-full sm:w-48 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input w-full sm:w-48 text-xs" value={specialisationFilter} onChange={e => setSpecialisationFilter(e.target.value)}>
          <option value="">All Specialisations</option>
          {SPECIALISATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="input w-full sm:w-64 text-xs" placeholder="Search name, phone, or specialisation" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {/* Table of leads */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            <span className="text-blue-400 font-medium text-lg">Loading leads...</span>
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="text-xs">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Points</th>
                <th className="px-3 py-2 font-semibold">Specialisation</th>
                <th className="px-3 py-2 font-semibold">Remarks</th>
                <th className="px-3 py-2 font-semibold">Created By</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, idx) => (
                <tr key={lead.id} className={`transition-colors ${lead.status === 'DELETED' ? 'text-gray-400' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 text-xs`}>
                  <td className="px-3 py-2">{lead.name}</td>
                  <td className="px-3 py-2">{lead.phone}</td>
                  <td className="px-3 py-2"><StatusBadge status={lead.status} /></td>
                  <td className="px-3 py-2 flex items-center gap-1">
                    {lead.points}
                    {lead.pointsOverride && (
                      <span className="ml-1 px-1 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs" title="Points overridden by admin">Overridden</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{lead.specialisation}</td>
                  <td className="px-3 py-2">{lead.remarks}</td>
                  <td className="px-3 py-2">{lead.createdBy?.firstName} {lead.createdBy?.lastName}</td>
                  <td className="px-3 py-2 flex flex-col sm:flex-row gap-1 sm:gap-2">
                    <button className="btn btn-secondary btn-sm flex items-center gap-1" title="Edit" onClick={() => openForm(lead)}><PencilIcon className="h-4 w-4" /> Edit</button>
                    {(user.role === 'SUPERADMIN' || user.role === 'ADMIN') && !lead.isDeleted && (
                      <button className="btn btn-secondary btn-sm flex items-center gap-1" title="Delete" onClick={() => handleDeleteLead(lead.id)}><TrashIcon className="h-4 w-4" /> Delete</button>
                    )}
                    <button className="btn btn-primary btn-sm flex items-center gap-1" title="Chat" onClick={() => openChatModal(lead)}><ChatBubbleLeftRightIcon className="h-4 w-4" /> Chat</button>
                    {user.role === 'ADMIN' && (
                      <button className="btn btn-primary btn-sm flex items-center gap-1" title="Reassign" onClick={() => { setPendingReassign(lead.id); setShowReassignModal(true); }}><ArrowPathIcon className="h-4 w-4" /> Reassign</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Lead Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="card w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{selectedLead ? 'Edit Lead' : 'Add Lead'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold">Name *</label>
                <input className="input text-xs" name="name" value={form.name} onChange={handleFormChange} required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold">Phone *</label>
                <input className="input text-xs" name="phone" value={form.phone} onChange={handleFormChange} required maxLength={10} minLength={10} />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold">Specialisation *</label>
                <select className="input text-xs" name="specialisation" value={form.specialisation} onChange={handleFormChange} required>
                  <option value="">Select Specialisation</option>
                  {SPECIALISATIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {user.role !== 'PARTNER' && (
                <div>
                  <label className="block mb-1 text-xs font-semibold">Status</label>
                  <select className="input text-xs" name="status" value={form.status} onChange={handleFormChange}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block mb-1 text-xs font-semibold">Points {user.role === 'ADMIN' && <span className="text-xs text-gray-500">(Customizable)</span>}</label>
                <input
                  className="input text-xs"
                  name="points"
                  value={form.points}
                  onChange={user.role === 'ADMIN' ? handleFormChange : undefined}
                  type="number"
                  readOnly={user.role !== 'ADMIN'}
                  min={0}
                />
              </div>
              {user.role === 'SUPERADMIN' && (
                <div>
                  <label className="block mb-1 text-xs font-semibold">Points Override (Superadmin only)</label>
                  <input className="input text-xs" name="pointsOverride" value={form.pointsOverride} onChange={handleFormChange} type="number" />
                </div>
              )}
              {user.role === 'SUPERADMIN' && (
                <div>
                  <label className="block mb-1 text-xs font-semibold">Hospital *</label>
                  <select className="input text-xs" name="hospitalId" value={form.hospitalId || ''} onChange={handleFormChange} required>
                    <option value="">Select Hospital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block mb-1 text-xs font-semibold">Remarks</label>
                <textarea className="input text-xs" name="remarks" value={form.remarks} onChange={handleFormChange} />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold">Patient Documents (optional, multiple)</label>
                <input className="input text-xs" name="files" type="file" multiple onChange={handleFormChange} />
              </div>
              {formError && <div className="text-red-600">{formError}</div>}
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit">Save</button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setSelectedLead(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Bulk Upload Leads</h2>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div>
                <input type="file" accept=".xlsx,.xls" onChange={e => setUploadFile(e.target.files[0])} />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit">Upload</button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowUpload(false); setUploadResult(''); }}>Cancel</button>
              </div>
              {uploadResult && <div className="text-green-700">{uploadResult}</div>}
            </form>
            <div className="mt-2 text-sm text-gray-500">Download template: <a href="/lead-template.xlsx" className="text-primary-600 underline">lead-template.xlsx</a></div>
          </div>
        </div>
      )}
      {chatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Chat with {selectedLead?.name}</h2>
            <div className="space-y-4">
              {remarksLoading ? (
                <div className="text-center">Loading...</div>
              ) : remarks.length === 0 ? (
                <div className="text-center text-gray-500">No messages yet</div>
              ) : (
                <div className="space-y-2">
                  {remarks.map(remark => (
                    <div key={remark.id} className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-500">
                        {remark.createdBy?.firstName} {remark.createdBy?.lastName} ({new Date(remark.createdAt).toLocaleString()})
                      </div>
                      <div>{remark.message}</div>
                      {remark.fileUrl && (
                        <a href={`${BACKEND_URL}${remark.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Attachment</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-xs"
                  placeholder="Type a message..."
                  value={newRemark}
                  onChange={e => setNewRemark(e.target.value)}
                />
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="btn btn-secondary text-xs">
                  Attach
                </label>
                <button
                  className="btn btn-primary text-xs"
                  onClick={handleSendRemark}
                  disabled={sendingRemark || (!newRemark.trim() && !file)}
                >
                  Send
                </button>
              </div>
              {file && (
                <div className="text-sm text-gray-500">
                  Selected file: {file.name}
                  <button
                    className="ml-2 text-red-600"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <button
              className="btn btn-secondary mt-4"
              onClick={() => {
                setChatModalOpen(false);
                setSelectedLead(null);
                setRemarks([]);
                setNewRemark('');
                setFile(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="card w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4 text-center">Confirm Reassignment</h2>
            <div className="mb-4 text-center">
              Are you sure you want to reassign this lead to{' '}
              <span className="font-bold text-primary-600">
                {(() => {
                  const leadId = pendingReassign;
                  const { partnerId, salesPersonId } = reassignUser[leadId] || {};
                  const user = (salesPersonId ? eligibleSales : partnerId ? eligiblePartners : null);
                  return user ? `${user.firstName} ${user.lastName} (${user.role})` : 'selected user';
                })()}
              </span>?
            </div>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-primary" onClick={handleReassignConfirm}>
                Yes, Reassign
              </button>
              <button className="btn btn-secondary" onClick={() => setShowReassignModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 