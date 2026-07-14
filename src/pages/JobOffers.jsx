import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function JobOffers(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Onboarding Modal State
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Job Offers', null, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        const list = res.List0 || [];
        setRows(list);

        if (list.length > 0) {
          const keys = Object.keys(list[0]).filter(k => k !== 'OnboardingChecked' && k !== 'OfferTerms');
          const cols = keys.map(k => {
            const label = k.replace(/([A-Z])/g, ' $1').trim();
            return {
              key: k,
              label: label.charAt(0).toUpperCase() + label.slice(1),
              render: (val, row, search, highlight) => {
                if (k === 'OfferState') {
                  const states = {
                    0: { text: 'Draft', color: 'var(--muted)', bg: 'var(--soft)' },
                    1: { text: 'Pending Approval', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                    2: { text: 'Sent', color: '#6366f1', bg: '#e0e7ff' },
                    3: { text: 'Accepted', color: 'var(--green)', bg: 'var(--green-soft)' },
                    4: { text: 'Declined', color: 'var(--red)', bg: 'var(--red-soft)' }
                  };
                  const state = states[val] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
                  return (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: state.color,
                      background: state.bg,
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      {state.text}
                    </span>
                  );
                }
                if (k.toLowerCase().includes('salary') && val) {
                  return Number(val).toLocaleString('en-US');
                }
                if (k.toLowerCase().includes('date') && val) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                  } catch (e) {}
                }
                return highlight(String(val ?? '-'), search);
              }
            };
          });

          // Move OfferState to the first position
          const stateColIndex = cols.findIndex(c => c.key === 'OfferState');
          if (stateColIndex > -1) {
            const [stateCol] = cols.splice(stateColIndex, 1);
            cols.unshift(stateCol);
          }

          setColumns(cols);
        }
      } else {
        setError(res.Message || 'Failed to retrieve job offers.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleUpdateOfferState(id, newState) {
    if (!window.confirm('Update offer status?')) return;
    setLoading(true);
    try {
      const res = await apiCall('Update Offer Status', {
        OfferID: id,
        OfferState: newState
      }, {}, 'recruitment_requests');
      if (res.State === 0) {
        loadData();
      } else {
        alert(res.Message || 'Update failed.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  // Open checklist editor
  const handleOpenChecklist = (row) => {
    setActiveOffer(row);
    try {
      const list = JSON.parse(row.OnboardingChecked || '[]');
      setChecklist(list);
    } catch (e) {
      setChecklist([]);
    }
    setShowChecklistModal(true);
  };

  const handleToggleCheckItem = (idx) => {
    const next = [...checklist];
    next[idx].done = !next[idx].done;
    setChecklist(next);
  };

  const handleSaveChecklist = async () => {
    setSavingChecklist(true);
    try {
      const res = await apiCall('Update Onboarding Checklist', {
        OfferID: activeOffer.OfferID,
        OnboardingChecked: JSON.stringify(checklist)
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowChecklistModal(false);
        loadData();
      } else {
        alert(res.Message || 'Failed to save checklist.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSavingChecklist(false);
  };

  const metrics = (() => {
    const total = rows.length;
    const pending = rows.filter(r => r.OfferState === 1).length;
    const sent = rows.filter(r => r.OfferState === 2).length;
    const accepted = rows.filter(r => r.OfferState === 3).length;
    return { total, pending, sent, accepted };
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && (
        <div style={{ marginBottom: 20, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Offers</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Pending Approval</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>{metrics.pending}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Offers Sent</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>{metrics.sent}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Offers Accepted</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>{metrics.accepted}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Job Offers Directory"
          subtitle="Manage candidate employment terms and tracking checklists"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          extraRowActions={[
            {
              label: '📨 Send Offer to Candidate',
              show: (row) => row.OfferState === 0,
              onClick: (row) => handleUpdateOfferState(row.OfferID, 2)
            },
            {
              label: '👍 Record Offer Acceptance',
              show: (row) => row.OfferState === 2,
              onClick: (row) => handleUpdateOfferState(row.OfferID, 3)
            },
            {
              label: '👎 Record Offer Decline',
              show: (row) => row.OfferState === 2,
              onClick: (row) => handleUpdateOfferState(row.OfferID, 4)
            },
            {
              label: '📋 Manage Onboarding Checklist',
              show: (row) => row.OfferState === 3,
              onClick: (row) => handleOpenChecklist(row)
            }
          ]}
        />
      </div>

      {/* Onboarding Checklist Modal */}
      {showChecklistModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(400px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Onboarding Handoff</h3>
              <button onClick={() => setShowChecklistModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Checklist for {activeOffer?.FullName}:</div>
              {checklist.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 10 }}>No checklist items registered.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {checklist.map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={item.done} onChange={() => handleToggleCheckItem(idx)} style={{ cursor: 'pointer' }} />
                      <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--muted)' : 'var(--text)' }}>{item.item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowChecklistModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button type="button" onClick={handleSaveChecklist} disabled={savingChecklist} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                {savingChecklist ? 'Saving...' : 'Save Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
