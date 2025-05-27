import axios from 'axios';

export async function getPendingPointsApprovals() {
  const res = await axios.get('/api/points-approval/pending');
  return res.data;
}

export async function approvePoints(id) {
  const res = await axios.post(`/api/points-approval/${id}/approve`);
  return res.data;
}

export async function rejectPoints(id) {
  const res = await axios.post(`/api/points-approval/${id}/reject`);
  return res.data;
}

export async function getPartnerPoints(partnerId) {
  const res = await axios.get('/api/points-approval/partner-points', { params: { partnerId } });
  return res.data;
}

export async function setPartnerPoints({ partnerId, status, points }) {
  const res = await axios.post('/api/points-approval/partner-points', { partnerId, status, points });
  return res.data;
} 