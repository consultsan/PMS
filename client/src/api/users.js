import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export async function getUsers(params = {}) {
  const res = await axios.get('/api/users', { params });
  return res.data;
}

export async function createUser(data) {
  const res = await axios.post('/api/users', data);
  return res.data;
}

export async function updateUser(id, data) {
  const res = await axios.put(`/api/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id) {
  const res = await axios.delete(`/api/users/${id}`);
  return res.data;
}

export async function getMyProfile() {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${BACKEND_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateMyProfile(formData) {
  const token = localStorage.getItem('token');
  const res = await axios.put(`${BACKEND_URL}/api/users/me`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function reassignAdminData(adminId, targetAdminId) {
  const token = localStorage.getItem('token');
  const res = await axios.post(`${BACKEND_URL}/api/users/${adminId}/reassign`, 
    { targetAdminId },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return res.data;
} 