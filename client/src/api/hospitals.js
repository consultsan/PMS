import axios from 'axios';

export async function getHospitals() {
  const res = await axios.get('/api/hospitals');
  return res.data;
}

export async function createHospital(data) {
  const res = await axios.post('/api/hospitals', data);
  return res.data;
}

export async function updateHospital(id, data) {
  const res = await axios.put(`/api/hospitals/${id}`, data);
  return res.data;
}

export async function deleteHospital(id) {
  const res = await axios.delete(`/api/hospitals/${id}`);
  return res.data;
} 