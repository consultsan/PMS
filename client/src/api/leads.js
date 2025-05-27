import axios from 'axios';

export async function getLeads(params = {}) {
  const res = await axios.get('/api/leads', { params });
  return res.data;
}

export async function createLead(data) {
  const res = await axios.post('/api/leads', data);
  return res.data;
}

export async function updateLead(id, data) {
  const res = await axios.put(`/api/leads/${id}`, data);
  return res.data;
}

export async function deleteLead(id) {
  const res = await axios.delete(`/api/leads/${id}`);
  return res.data;
}

export async function bulkUploadLeads(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/leads/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function reassignLead(id, data) {
  const res = await axios.put(`/api/leads/${id}/reassign`, data);
  return res.data;
}

export async function getLeadRemarks(leadId) {
  const res = await axios.get(`/api/leads/${leadId}/remarks`);
  return res.data;
}

export async function addLeadRemark(leadId, message, file) {
  const formData = new FormData();
  if (message) formData.append('message', message);
  if (file) formData.append('file', file);
  const res = await axios.post(`/api/leads/${leadId}/remarks`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
} 