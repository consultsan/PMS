import React, { useEffect, useState, useRef } from 'react';
import { getLeads, getLeadRemarks, addLeadRemark, updateLead } from '../../api/leads';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function SalesDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [lastRemarkId, setLastRemarkId] = useState(null);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const pollingRef = useRef();
  const [statusUpdating, setStatusUpdating] = useState({});
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lastSeenLeadIds, setLastSeenLeadIds] = useState([]);
  const [newAssignedLeads, setNewAssignedLeads] = useState([]);
  const [showNewLeadsPopup, setShowNewLeadsPopup] = useState(false);

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      try {
        const data = await getLeads({});
        // Filter for leads assigned to this sales person (assuming backend does this, else filter by user)
        setLeads(data);
      } catch (e) {
        setError('Failed to load leads');
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  useEffect(() => {
    // On first load, mark all current leads as seen
    setLastSeenLeadIds(leads.map(l => l.id));
  }, []);

  useEffect(() => {
    // Poll for new leads every minute
    const interval = setInterval(async () => {
      try {
        const data = await getLeads({});
        const currentIds = data.map(l => l.id);
        const newLeads = data.filter(l => !lastSeenLeadIds.includes(l.id));
        if (newLeads.length > 0) {
          setNewAssignedLeads(newLeads);
          setShowNewLeadsPopup(true);
          setLastSeenLeadIds(currentIds);
        }
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [lastSeenLeadIds]);

  const openChatModal = async (lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
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
    if (!modalOpen || !selectedLead) return;
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getLeadRemarks(selectedLead.id);
        if (data.length > remarks.length) {
          // Check if the new remark is from the other party
          const newRemarks = data.slice(remarks.length);
          const hasOtherParty = newRemarks.some(r => r.user && r.user.role !== 'SALES_PERSON');
          if (hasOtherParty) setNewMessageAlert(true);
          setRemarks(data);
          setLastRemarkId(data[data.length - 1].id);
        }
      } catch {}
    }, 60000);
    return () => clearInterval(pollingRef.current);
    // eslint-disable-next-line
  }, [modalOpen, selectedLead, remarks.length]);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedLead(null);
    setRemarks([]);
    setNewRemark('');
    setFile(null);
    setNewMessageAlert(false);
  };

  const handleSendRemark = async () => {
    if (!newRemark.trim() && !file) return;
    setSending(true);
    try {
      const remark = await addLeadRemark(selectedLead.id, newRemark, file);
      setRemarks((prev) => [...prev, remark]);
      setNewRemark('');
      setFile(null);
    } catch (e) {
      // Optionally show error
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setStatusUpdating(prev => ({ ...prev, [leadId]: true }));
    try {
      await updateLead(leadId, { status: newStatus });
      setLeads(leads => leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (e) {
      // Optionally show error
    } finally {
      setStatusUpdating(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const openPartnerModal = (partner) => {
    setSelectedPartner(partner);
    setPartnerModalOpen(true);
  };

  const closePartnerModal = () => {
    setPartnerModalOpen(false);
    setSelectedPartner(null);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search);
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics calculations
  const totalLeads = filteredLeads.length;
  const statusList = ['NEW', 'NOT_REACHABLE', 'NOT_INTERESTED', 'OPD_DONE', 'IPD_DONE', 'CLOSED'];
  const leadsByStatus = statusList.reduce((acc, status) => {
    acc[status] = filteredLeads.filter(l => l.status === status).length;
    return acc;
  }, {});
  const conversionRate = totalLeads > 0 ? Math.round((leadsByStatus['CLOSED'] / totalLeads) * 100) : 0;

  return (
    <div className="container mx-auto p-4 font-inter">
      <h1 className="text-3xl font-extrabold mb-8 text-center tracking-tight">Sales Person Dashboard</h1>
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-lg font-medium text-gray-600 text-center">Total Leads</div>
          <div className="text-4xl font-extrabold text-blue-700 text-center mt-2">{totalLeads}</div>
        </div>
        {statusList.map(status => (
          <div key={status} className="card bg-white shadow-md rounded-xl p-6">
            <div className="text-lg font-medium text-gray-600 text-center">{status.replace('_', ' ')}</div>
            <div className="text-2xl font-bold text-blue-700 text-center mt-2">{leadsByStatus[status]}</div>
          </div>
        ))}
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-lg font-medium text-gray-600 text-center">Conversion Rate</div>
          <div className="text-2xl font-bold text-green-600 text-center mt-2">{conversionRate}%</div>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-lg font-medium text-gray-600 text-center">Assigned Leads</div>
          <div className="text-4xl font-extrabold text-blue-700 text-center mt-2">{leads.length}</div>
        </div>
        <div className="card bg-white shadow-md rounded-xl p-6">
          <div className="text-lg font-medium text-gray-600 text-center">Status Updates</div>
          <div className="text-4xl font-extrabold text-blue-700 text-center mt-2">-</div>
        </div>
      </div>

      {/* Lead Management Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Lead Management</h2>
        <div className="mb-4 flex gap-2 flex-wrap">
          <input 
            className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-64" 
            placeholder="Search leads..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <select 
            className="input bg-white border border-gray-300 rounded-lg px-4 py-2 w-48"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="NOT_REACHABLE">Not Reachable</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="OPD_DONE">OPD Done</option>
            <option value="IPD_DONE">IPD Done</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-blue-700 text-white sticky top-0">
                <tr>
                  <th className="text-center font-semibold px-4 py-3">Name</th>
                  <th className="text-center font-semibold px-4 py-3">Phone</th>
                  <th className="text-center font-semibold px-4 py-3">Status</th>
                  <th className="text-center font-semibold px-4 py-3">Specialisation</th>
                  <th className="text-center font-semibold px-4 py-3">Documents</th>
                  <th className="text-center font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead, idx) => (
                  <tr key={lead.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                    <td className="text-center px-4 py-3">{lead.name}</td>
                    <td className="text-center px-4 py-3">{lead.phone}</td>
                    <td className="text-center px-4 py-3">
                      <select
                        className="input bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm"
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        disabled={statusUpdating[lead.id]}
                      >
                        <option value="NEW">New</option>
                        <option value="NOT_REACHABLE">Not Reachable</option>
                        <option value="NOT_INTERESTED">Not Interested</option>
                        <option value="OPD_DONE">OPD Done</option>
                        <option value="IPD_DONE">IPD Done</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      {statusUpdating[lead.id] && <span className="ml-2 text-xs text-gray-400">Updating...</span>}
                    </td>
                    <td className="text-center px-4 py-3">{lead.specialisation || '-'}</td>
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
                      <div className="flex justify-center gap-2">
                        <button 
                          className="btn bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-sm"
                          onClick={() => openChatModal(lead)}
                        >
                          Chat
                        </button>
                        {lead.partner && (
                          <button 
                            className="btn bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm"
                            onClick={() => openPartnerModal(lead.partner)}
                          >
                            View Partner
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Chat Modal */}
      {modalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Chat with {selectedLead.name}</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={closeModal}
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
                disabled={sending}
              />
              <input
                type="file"
                className="input bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800"
                style={{ width: 120 }}
                onChange={e => setFile(e.target.files[0])}
                disabled={sending}
              />
              <button 
                className="btn bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
                onClick={handleSendRemark} 
                disabled={sending || (!newRemark.trim() && !file)}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
      {partnerModalOpen && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Partner Information</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={closePartnerModal}
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Name</span>
                <span className="text-base text-gray-900">{selectedPartner.firstName} {selectedPartner.lastName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Phone</span>
                <span className="text-base text-gray-900">{selectedPartner.phone}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">Email</span>
                <span className="text-base text-gray-900">{selectedPartner.email}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNewLeadsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">New Leads Assigned</h3>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold" 
                onClick={() => setShowNewLeadsPopup(false)}
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              {newAssignedLeads.length === 0 ? (
                <div className="text-center text-gray-500">No new leads.</div>
              ) : (
                newAssignedLeads.map(lead => (
                  <div key={lead.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-1">
                    <span className="font-semibold text-gray-800">{lead.name}</span>
                    <span className="text-xs text-gray-500">{lead.phone}</span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">{lead.status}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button className="btn bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onClick={() => setShowNewLeadsPopup(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 