import axios from 'axios';
 
export async function getLeadAnalytics() {
  const res = await axios.get('/api/leads/analytics');
  return res.data;
} 