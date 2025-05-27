import React, { useState, useEffect } from 'react';
import { getHospitals } from '../../api/hospitals';
import { getUsers } from '../../api/users';
import { getLeadAnalytics } from '../../api/analytics';
import { getPendingPointsApprovals, approvePoints, rejectPoints } from '../../api/pointsApproval';
import { createHospital, updateHospital, deleteHospital } from '../../api/hospitals';
import AdminListModal from '../../components/AdminListModal';
import { BellIcon, UserGroupIcon, BuildingOffice2Icon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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

function NotificationBell() {
  return (
    <button className="relative p-2 rounded-full hover:bg-blue-100 transition">
      <BellIcon className="h-6 w-6 text-blue-700" />
      {/* Example notification dot */}
      <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
    </button>
  );
}

function ProfileDropdown() {
  return (
    <div className="relative">
      <button className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-medium hover:bg-blue-200 transition">
        <span>Profile</span>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {/* Dropdown menu placeholder */}
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

function PendingPartnersSuperadmin() {
  const [pending, setPending] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, partner: null });

  useEffect(() => {
    fetchPending();
    fetchHospitals();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${BACKEND_URL}/api/users`, {
        params: { role: 'PARTNER', status: 'ONBOARDING', hospitalId: 'null' }
      });
      setPending(res.data);
    } catch (err) {
      setError('Failed to fetch pending partners');
    }
    setLoading(false);
  };

  const fetchHospitals = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/hospitals`);
      setHospitals(res.data);
    } catch (err) {
      setHospitals([]);
    }
  };

  const approveAssign = async (id) => {
    const hospitalId = assignments[id];
    if (!hospitalId) return;
    try {
      await axios.put(`${BACKEND_URL}/api/users/${id}/approve-assign`, { hospitalId });
      fetchPending();
    } catch (err) {
      setError('Failed to approve and assign partner');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/users/${id}`);
      fetchPending();
      setDeleteConfirm({ show: false, partner: null });
    } catch (err) {
      setError('Failed to delete partner');
    }
  };

  return (
    <div className="card p-4 mb-8">
      <h2 className="text-xl font-bold mb-4">Pending Partner Approvals (Superadmin)</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Phone</th><th>Assign Hospital</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={5}>No pending partners</td></tr>
            ) : pending.map(p => (
              <tr key={p.id} className="even:bg-gray-50 hover:bg-indigo-50 transition">
                <td>{p.firstName} {p.lastName}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>
                  <select
                    className="input"
                    value={assignments[p.id] || ''}
                    onChange={e => setAssignments(a => ({ ...a, [p.id]: e.target.value }))}
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!assignments[p.id]}
                      onClick={() => approveAssign(p.id)}
                    >
                      Approve & Assign
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteConfirm({ show: true, partner: p })}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {deleteConfirm.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="text-lg font-bold mb-4">Delete Partner</h3>
            <p>Are you sure you want to delete <b>{deleteConfirm.partner?.firstName} {deleteConfirm.partner?.lastName}</b>?</p>
            <div className="flex gap-2 justify-end mt-4">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm({ show: false, partner: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.partner.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperadminDashboard() {
  // Analytics state
  const [analytics, setAnalytics] = useState({
    hospitals: 0,
    users: { SUPERADMIN: 0, ADMIN: 0, PARTNER: 0, SALES_PERSON: 0 },
    leads: { NEW: 0, NOT_REACHABLE: 0, NOT_INTERESTED: 0, OPD_DONE: 0, IPD_DONE: 0, CLOSED: 0, DELETED: 0 },
    totalPoints: 0,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Partner points approval state
  const [pendingPoints, setPendingPoints] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(true);

  // Hospitals state
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modal state
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [hospitalForm, setHospitalForm] = useState({
    name: '', address: '', city: '', state: '', country: '', phone: '', email: ''
  });
  const [savingHospital, setSavingHospital] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, hospital: null });

  // Admins modal state
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchPointsApprovals();
    fetchHospitals();
    fetchUsers();
  }, []);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await getLeadAnalytics();
      setAnalytics(a => ({
        ...a,
        leads: data.statusCounts,
        totalPoints: data.totalPoints,
      }));
    } catch (err) {}
    setLoadingAnalytics(false);
  };

  const fetchPointsApprovals = async () => {
    setLoadingPoints(true);
    try {
      const data = await getPendingPointsApprovals();
      setPendingPoints(data);
    } catch (err) {
      setPendingPoints([]);
    }
    setLoadingPoints(false);
  };

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const data = await getHospitals();
      setHospitals(data);
      setAnalytics(a => ({ ...a, hospitals: data.length }));
    } catch (err) {
      setHospitals([]);
    }
    setLoadingHospitals(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
      // Count users by role for analytics
      const roleCounts = { SUPERADMIN: 0, ADMIN: 0, PARTNER: 0, SALES_PERSON: 0 };
      data.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });
      setAnalytics(a => ({ ...a, users: roleCounts }));
    } catch (err) {
      setUsers([]);
    }
    setLoadingUsers(false);
  };

  const filteredHospitals = hospitals.filter(h => h.name.toLowerCase().includes(hospitalSearch.toLowerCase()));
  const filteredUsers = users.filter(u =>
    ((u.firstName + ' ' + u.lastName).toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
    (!userRoleFilter || u.role === userRoleFilter)
  );

  const handleApprove = async (id) => {
    await approvePoints(id);
    fetchPointsApprovals();
  };
  const handleReject = async (id) => {
    await rejectPoints(id);
    fetchPointsApprovals();
  };

  // Open modal for add/edit
  const openHospitalModal = (hospital = null) => {
    setEditingHospital(hospital);
    setHospitalForm(hospital ? {
      name: hospital.name || '',
      address: hospital.address || '',
      city: hospital.city || '',
      state: hospital.state || '',
      country: hospital.country || '',
      phone: hospital.phone || '',
      email: hospital.email || ''
    } : { name: '', address: '', city: '', state: '', country: '', phone: '', email: '' });
    setShowHospitalModal(true);
  };
  const closeHospitalModal = () => {
    setShowHospitalModal(false);
    setEditingHospital(null);
    setHospitalForm({ name: '', address: '', city: '', state: '', country: '', phone: '', email: '' });
  };

  // Handle form change
  const handleHospitalFormChange = e => {
    setHospitalForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Save hospital (add or edit)
  const handleSaveHospital = async e => {
    e.preventDefault();
    setSavingHospital(true);
    try {
      if (editingHospital) {
        await updateHospital(editingHospital.id, hospitalForm);
      } else {
        await createHospital(hospitalForm);
      }
      fetchHospitals();
      closeHospitalModal();
    } catch (err) {
      alert('Failed to save hospital');
    }
    setSavingHospital(false);
  };

  // Delete hospital
  const handleDeleteHospital = async () => {
    if (!deleteConfirm.hospital) return;
    try {
      await deleteHospital(deleteConfirm.hospital.id);
      fetchHospitals();
      setDeleteConfirm({ show: false, hospital: null });
    } catch (err) {
      alert('Failed to delete hospital');
    }
  };

  // Open admins modal
  const openAdminsModal = (hospital) => {
    setSelectedHospital(hospital);
    setShowAdminsModal(true);
  };
  const closeAdminsModal = () => {
    setShowAdminsModal(false);
    setSelectedHospital(null);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header with notification and profile */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Superadmin Dashboard</h1>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <KpiCard icon={BuildingOffice2Icon} label="Hospitals" value={analytics.hospitals} badgeColor="bg-blue-700" />
        <KpiCard icon={UserGroupIcon} label="Users" value={analytics.users.SUPERADMIN + analytics.users.ADMIN + analytics.users.PARTNER + analytics.users.SALES_PERSON} badgeColor="bg-blue-500" />
        <KpiCard
          icon={ClipboardDocumentListIcon}
          label="Leads"
          value={Object.entries(analytics.leads)
            .filter(([status]) => status !== 'DELETED')
            .reduce((a, [, b]) => a + b, 0)}
          badgeColor="bg-blue-400"
        />
        <KpiCard icon={ClipboardDocumentListIcon} label="Total Points" value={analytics.totalPoints} badgeColor="bg-green-500" />
      </div>

      {/* Example Section Header */}
      <SectionHeader icon={UserGroupIcon} title="Partner Points Approval" />
      <PendingPartnersSuperadmin />
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-center">Partner Points Approval</h2>
        <div className="card">
          {loadingPoints ? (
            <div className="text-center">Loading...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Current Points</th>
                  <th>Requested Points</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPoints.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">No pending requests</td></tr>
                ) : (
                  pendingPoints.map(p => (
                    <tr key={p.id} className="even:bg-gray-50 hover:bg-indigo-50 transition">
                      <td>{p.partner}</td>
                      <td>{p.currentPoints}</td>
                      <td>{p.requestedPoints}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button className="btn btn-primary btn-sm" onClick={() => handleApprove(p.id)}>Approve</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleReject(p.id)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Hospitals</h2>
        <div className="mb-2 flex gap-2">
          <input className="input w-64" placeholder="Search hospitals..." value={hospitalSearch} onChange={e => setHospitalSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => openHospitalModal()}>Add Hospital</button>
        </div>
        <div className="card">
          {loadingHospitals ? (
            <div>Loading...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHospitals.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">No hospitals found</td></tr>
                ) : (
                  filteredHospitals.map(h => (
                    <tr key={h.id} className="even:bg-gray-50 hover:bg-indigo-50 transition">
                      <td>{h.name}</td>
                      <td>{h.city}</td>
                      <td>{h.state}</td>
                      <td><StatusBadge status={h.isActive ? 'Active' : 'Inactive'} /></td>
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button className="btn btn-info btn-sm" onClick={() => openAdminsModal(h)}>View Admins</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openHospitalModal(h)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ show: true, hospital: h })}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Hospital Modal */}
        {showHospitalModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="text-lg font-bold mb-4">{editingHospital ? 'Edit Hospital' : 'Add Hospital'}</h3>
              <form onSubmit={handleSaveHospital} className="space-y-3">
                <input className="input w-full" name="name" placeholder="Name" value={hospitalForm.name} onChange={handleHospitalFormChange} required />
                <input className="input w-full" name="address" placeholder="Address" value={hospitalForm.address} onChange={handleHospitalFormChange} />
                <input className="input w-full" name="city" placeholder="City" value={hospitalForm.city} onChange={handleHospitalFormChange} />
                <input className="input w-full" name="state" placeholder="State" value={hospitalForm.state} onChange={handleHospitalFormChange} />
                <input className="input w-full" name="country" placeholder="Country" value={hospitalForm.country} onChange={handleHospitalFormChange} />
                <input className="input w-full" name="phone" placeholder="Phone" value={hospitalForm.phone} onChange={handleHospitalFormChange} />
                <input className="input w-full" name="email" placeholder="Email" value={hospitalForm.email} onChange={handleHospitalFormChange} />
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" className="btn btn-secondary" onClick={closeHospitalModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={savingHospital}>{savingHospital ? 'Saving...' : (editingHospital ? 'Update' : 'Create')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="text-lg font-bold mb-4">Delete Hospital</h3>
              <p>Are you sure you want to delete <b>{deleteConfirm.hospital?.name}</b>?</p>
              <div className="flex gap-2 justify-end mt-4">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm({ show: false, hospital: null })}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteHospital}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {/* Admins Modal */}
        <AdminListModal open={showAdminsModal} onClose={closeAdminsModal} hospital={selectedHospital} />
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="mb-2 flex gap-2">
          <input className="input w-64" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          <select className="input w-48" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="SUPERADMIN">Superadmin</option>
            <option value="ADMIN">Admin</option>
            <option value="PARTNER">Partner</option>
            <option value="SALES_PERSON">Sales Person</option>
          </select>
        </div>
        <div className="card">
          {loadingUsers ? (
            <div className="text-center">Loading...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hospital</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">No users found</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="even:bg-gray-50 hover:bg-indigo-50 transition">
                      <td>{u.firstName} {u.lastName}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.hospital?.name || '-'}</td>
                      <td><StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
} 