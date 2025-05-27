import React, { useEffect, useState } from 'react';
import { getUsers } from '../api/users';
import { getPartnerPoints, setPartnerPoints } from '../api/pointsApproval';
import { useAuth } from '../contexts/AuthContext';

const STATUSES = ['NEW', 'OPD_DONE', 'IPD_DONE'];

export default function PartnerPointsTable() {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [pointsData, setPointsData] = useState({}); // { partnerId: { status: { points, approvalStatus } } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // { partnerId_status: bool }

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    const users = await getUsers({ role: 'PARTNER' });
    setPartners(users);
    // Fetch points for each partner
    const allPoints = {};
    await Promise.all(users.map(async (p) => {
      const pts = await getPartnerPoints(p.id);
      allPoints[p.id] = {};
      STATUSES.forEach(status => {
        const entry = pts.find(e => e.status === status);
        allPoints[p.id][status] = entry ? { points: entry.points, approvalStatus: entry.approvalStatus } : { points: '', approvalStatus: '' };
      });
    }));
    setPointsData(allPoints);
    setLoading(false);
  };

  const handleChange = (partnerId, status, value) => {
    setPointsData(d => ({
      ...d,
      [partnerId]: {
        ...d[partnerId],
        [status]: { 
          ...d[partnerId][status], 
          points: value,
          // Only set approvalStatus if it's a new entry or if superadmin is editing
          approvalStatus: d[partnerId][status]?.approvalStatus || (user.role === 'SUPERADMIN' ? 'APPROVED' : '')
        }
      }
    }));
  };

  const handleSave = async (partnerId, status) => {
    setSaving(s => ({ ...s, [`${partnerId}_${status}`]: true }));
    try {
      // For admin, set approvalStatus to PENDING when saving
      const currentData = pointsData[partnerId][status];
      const approvalStatus = user.role === 'ADMIN' ? 'PENDING' : 
                           user.role === 'SUPERADMIN' ? 'APPROVED' : 
                           currentData.approvalStatus;

      await setPartnerPoints({ 
        partnerId, 
        status, 
        points: Number(currentData.points),
        approvalStatus 
      });
      await fetchPartners();
    } catch (err) {
      alert('Failed to save points');
    }
    setSaving(s => ({ ...s, [`${partnerId}_${status}`]: false }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600';
      case 'PENDING': return 'text-yellow-600';
      case 'REJECTED': return 'text-red-600';
      default: return '';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold mb-4">Define Points Per Partner</h2>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Partner</th>
            {STATUSES.map(status => <th key={status}>{status.replace('_', ' ')}</th>)}
          </tr>
        </thead>
        <tbody>
          {partners.length === 0 ? (
            <tr><td colSpan={STATUSES.length + 1} className="text-center">No partners found</td></tr>
          ) : (
            partners.map(p => (
              <tr key={p.id}>
                <td>{p.firstName} {p.lastName}</td>
                {STATUSES.map(status => (
                  <td key={status}>
                    <div className="flex items-center gap-2">
                      <input
                        className="input w-20"
                        type="number"
                        value={pointsData[p.id]?.[status]?.points ?? ''}
                        onChange={e => handleChange(p.id, status, e.target.value)}
                        min={0}
                        disabled={pointsData[p.id]?.[status]?.approvalStatus === 'PENDING' && user.role === 'ADMIN'}
                      />
                      <span className={`text-xs ${getStatusColor(pointsData[p.id]?.[status]?.approvalStatus)}`}>
                        {pointsData[p.id]?.[status]?.approvalStatus}
                      </span>
                      <button
                        className="btn btn-xs btn-primary"
                        disabled={
                          saving[`${p.id}_${status}`] || 
                          !pointsData[p.id]?.[status]?.points ||
                          (pointsData[p.id]?.[status]?.approvalStatus === 'PENDING' && user.role === 'ADMIN')
                        }
                        onClick={() => handleSave(p.id, status)}
                      >
                        {saving[`${p.id}_${status}`] ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 