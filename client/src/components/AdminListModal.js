import React, { useState, useEffect } from 'react';
import AdminFormModal from './AdminFormModal';
import { getUsers, createUser, updateUser, deleteUser, reassignAdminData } from '../api/users';

export default function AdminListModal({ open, onClose, hospital }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, admin: null });
  const [reassignModal, setReassignModal] = useState({ show: false, admin: null });
  const [targetAdmin, setTargetAdmin] = useState('');
  const [allAdmins, setAllAdmins] = useState([]);

  useEffect(() => {
    if (open && hospital) {
      fetchAdmins();
      fetchAllAdmins();
    }
    // eslint-disable-next-line
  }, [open, hospital]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await getUsers({ role: 'ADMIN', hospitalId: hospital.id });
      setAdmins(data);
    } catch (err) {
      setAdmins([]);
    }
    setLoading(false);
  };

  const fetchAllAdmins = async () => {
    try {
      const data = await getUsers({ role: 'ADMIN' });
      setAllAdmins(data.filter(a => a.id !== deleteConfirm.admin?.id));
    } catch (err) {
      setAllAdmins([]);
    }
  };

  const handleAdd = () => {
    setEditingAdmin(null);
    setShowForm(true);
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setShowForm(true);
  };

  const handleSave = async (form) => {
    if (editingAdmin) {
      await updateUser(editingAdmin.id, { ...form, role: 'ADMIN', hospitalId: hospital.id });
    } else {
      await createUser({ ...form, role: 'ADMIN', hospitalId: hospital.id });
    }
    setShowForm(false);
    fetchAdmins();
  };

  const handleDelete = async () => {
    if (!deleteConfirm.admin) return;
    try {
      await reassignAdminData(deleteConfirm.admin.id, targetAdmin);
      setDeleteConfirm({ show: false, admin: null });
      setReassignModal({ show: false, admin: null });
      setTargetAdmin('');
      fetchAdmins();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete and reassign admin data';
      alert(errorMessage);
    }
  };

  if (!open || !hospital) return null;

  return (
    <div className="modal-overlay">
      <div className="modal w-[500px] max-w-full">
        <h3 className="text-lg font-bold mb-4">Admins for {hospital.name}</h3>
        <button className="btn btn-primary mb-3" onClick={handleAdd}>Add Admin</button>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full mb-3">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={4} className="text-center">No admins found</td></tr>
              ) : (
                admins.map(a => (
                  <tr key={a.id}>
                    <td>{a.firstName} {a.lastName}</td>
                    <td>{a.email}</td>
                    <td>{a.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary mr-2" onClick={() => handleEdit(a)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => {
                        setDeleteConfirm({ show: true, admin: a });
                        setReassignModal({ show: true, admin: a });
                        fetchAllAdmins();
                      }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <button className="btn btn-secondary mt-2" onClick={onClose}>Close</button>
        
        {/* Admin Form Modal */}
        <AdminFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          initialData={editingAdmin}
          hospitalId={hospital.id}
        />

        {/* Delete and Reassign Confirmation Modal */}
        {deleteConfirm.show && reassignModal.show && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="text-lg font-bold mb-4">Delete Admin and Reassign Data</h3>
              <p className="mb-4">Are you sure you want to delete <b>{deleteConfirm.admin?.firstName} {deleteConfirm.admin?.lastName}</b>?</p>
              <p className="mb-4">Please select an admin to reassign their data to:</p>
              <select 
                className="input w-full mb-4" 
                value={targetAdmin} 
                onChange={(e) => setTargetAdmin(e.target.value)}
                required
              >
                <option value="">Select Admin</option>
                {allAdmins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.firstName} {admin.lastName} ({admin.hospital?.name})
                  </option>
                ))}
              </select>
              <div className="flex gap-2 justify-end mt-4">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setDeleteConfirm({ show: false, admin: null });
                    setReassignModal({ show: false, admin: null });
                    setTargetAdmin('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={!targetAdmin}
                >
                  Delete & Reassign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 