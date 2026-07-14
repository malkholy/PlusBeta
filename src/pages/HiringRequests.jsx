import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function HiringRequests(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    RequestID: '',
    PositionTitle: '',
    Department: '',
    Headcount: '1',
    Reason: 'New',
    JobDescription: '',
    RequiredSkills: '',
    SalaryMin: '',
    SalaryMax: '',
    Urgency: 'Medium',
    TargetStartDate: ''
  });

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalRow, setApprovalRow] = useState(null);
  const [approvalDecision, setApprovalDecision] = useState(1); // 1: Approve, 2: Reject, 3: Return
  const [approvalComments, setApprovalComments] = useState('');

  // Departments list
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadData();
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const res = await apiCall('Get Departments', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        setDepartments(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load departments:', e);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Hiring Requests', null, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        const list = res.List0 || [];
        setRows(list);

        if (list.length > 0) {
          const keys = Object.keys(list[0]).filter(k => k !== 'JobDescription' && k !== 'RequiredSkills');
          const cols = keys.map(k => {
            const label = k.replace(/([A-Z])/g, ' $1').trim();
            return {
              key: k,
              label: label.charAt(0).toUpperCase() + label.slice(1),
              render: (val, row, search, highlight) => {
                if (k === 'RequestState') {
                  const states = {
                    0: { text: 'Draft', color: 'var(--muted)', bg: 'var(--soft)' },
                    1: { text: 'Pending Approval', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                    2: { text: 'Approved', color: 'var(--green)', bg: 'var(--green-soft)' },
                    3: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
                    4: { text: 'Returned', color: 'var(--blue)', bg: 'var(--blue-soft)' },
                    5: { text: 'Open sourcing', color: '#6366f1', bg: '#e0e7ff' },
                    6: { text: 'Fulfilled', color: 'var(--green)', bg: 'var(--green-soft)' }
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
                  return '$' + Number(val).toLocaleString('en-US');
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

          // Move RequestState to the first position
          const stateColIndex = cols.findIndex(c => c.key === 'RequestState');
          if (stateColIndex > -1) {
            const [stateCol] = cols.splice(stateColIndex, 1);
            cols.unshift(stateCol);
          }

          setColumns(cols);
        }
      } else {
        setError(res.Message || 'Failed to retrieve hiring requests.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleSaveRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    try {
      const payload = {
        ...formData,
        Headcount: Number(formData.Headcount),
        SalaryMin: formData.SalaryMin ? Number(formData.SalaryMin) : null,
        SalaryMax: formData.SalaryMax ? Number(formData.SalaryMax) : null
      };

      const res = await apiCall('Save Hiring Request', payload, {}, 'recruitment_requests');
      if (res.State === 0) {
        setShowAddModal(false);
        loadData();
      } else {
        setModalError(res.Message || 'Failed to save request.');
      }
    } catch (err) {
      setModalError('Connection error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleSubmitRequest(id) {
    if (!window.confirm('Are you sure you want to submit this request for approvals?')) return;
    setLoading(true);
    try {
      const res = await apiCall('Submit Hiring Request', { RequestID: id }, {}, 'recruitment_requests');
      if (res.State === 0) {
        loadData();
      } else {
        alert(res.Message || 'Submission failed.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleApprovalSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Find the matching pending approval record
      const resPending = await apiCall('Get Pending Approvals', null, {}, 'recruitment_requests');
      const pendingTask = (resPending.List0 || []).find(p => p.RequestID === approvalRow.RequestID);

      if (!pendingTask) {
        alert('No pending approval steps found for this request.');
        setShowApproveModal(false);
        setSubmitting(false);
        return;
      }

      const res = await apiCall('Approve Reject Request', {
        ApprovalID: pendingTask.ApprovalID,
        Decision: Number(approvalDecision),
        Comments: approvalComments
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowApproveModal(false);
        setApprovalComments('');
        loadData();
      } else {
        alert(res.Message || 'Failed to submit approval.');
      }
    } catch (err) {
      alert('Error submitting approval: ' + err.message);
    }
    setSubmitting(false);
  }

  const metrics = (() => {
    const total = rows.length;
    const pending = rows.filter(r => r.RequestState === 1).length;
    const open = rows.filter(r => r.RequestState === 5).length;
    const fulfilled = rows.filter(r => r.RequestState === 6).length;
    return { total, pending, open, fulfilled };
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
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Requisitions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Pending Approval</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>{metrics.pending}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Open Positions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>{metrics.open}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Fulfilled Requisitions</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>{metrics.fulfilled}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Hiring Requests Registry"
          subtitle="Submit and coordinate corporate headcount requests"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          onAdd={() => {
            setFormData({
              RequestID: '',
              PositionTitle: '',
              Department: '',
              Headcount: '1',
              Reason: 'New',
              JobDescription: '',
              RequiredSkills: '',
              SalaryMin: '',
              SalaryMax: '',
              Urgency: 'Medium',
              TargetStartDate: ''
            });
            setModalError('');
            setShowAddModal(true);
          }}
          extraRowActions={[
            {
              label: '🚀 Submit Request',
              show: (row) => row.RequestState === 0 || row.RequestState === 4,
              onClick: (row) => handleSubmitRequest(row.RequestID)
            },
            {
              label: '📝 Edit Draft',
              show: (row) => row.RequestState === 0 || row.RequestState === 4,
              onClick: (row) => {
                setFormData({
                  RequestID: row.RequestID,
                  PositionTitle: row.PositionTitle,
                  Department: row.Department,
                  Headcount: String(row.Headcount),
                  Reason: row.Reason,
                  JobDescription: row.JobDescription || '',
                  RequiredSkills: row.RequiredSkills || '',
                  SalaryMin: row.SalaryMin ? String(row.SalaryMin) : '',
                  SalaryMax: row.SalaryMax ? String(row.SalaryMax) : '',
                  Urgency: row.Urgency,
                  TargetStartDate: row.TargetStartDate ? row.TargetStartDate.split('T')[0] : ''
                });
                setModalError('');
                setShowAddModal(true);
              }
            },
            {
              label: '✍️ Submit Approval Decision',
              show: (row) => row.RequestState === 1,
              onClick: (row) => {
                setApprovalRow(row);
                setApprovalDecision(1);
                setApprovalComments('');
                setShowApproveModal(true);
              }
            }
          ]}
        />
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(580px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                {formData.RequestID ? 'Edit Hiring Request' : 'Create Hiring Request'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            {modalError && (
              <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>{modalError}</div>
            )}

            <form onSubmit={handleSaveRequest}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Position Title</label>
                  <input type="text" value={formData.PositionTitle} onChange={e => setFormData({ ...formData, PositionTitle: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Department</label>
                  <select value={formData.Department} onChange={e => setFormData({ ...formData, Department: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required>
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Headcount</label>
                  <input type="number" min="1" value={formData.Headcount} onChange={e => setFormData({ ...formData, Headcount: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Reason</label>
                  <select value={formData.Reason} onChange={e => setFormData({ ...formData, Reason: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="New">New Position</option>
                    <option value="Replacement">Replacement</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Urgency</label>
                  <select value={formData.Urgency} onChange={e => setFormData({ ...formData, Urgency: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Min Salary</label>
                  <input type="number" placeholder="Min" value={formData.SalaryMin} onChange={e => setFormData({ ...formData, SalaryMin: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Max Salary</label>
                  <input type="number" placeholder="Max" value={formData.SalaryMax} onChange={e => setFormData({ ...formData, SalaryMax: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Target Start Date</label>
                <input type="date" value={formData.TargetStartDate} onChange={e => setFormData({ ...formData, TargetStartDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Job Description</label>
                <textarea rows="8" value={formData.JobDescription} onChange={e => setFormData({ ...formData, JobDescription: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} placeholder="Detail requirements..." />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Required Skills</label>
                <textarea rows="6" value={formData.RequiredSkills} onChange={e => setFormData({ ...formData, RequiredSkills: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} placeholder="List key technologies, certifications..." />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Saving...' : 'Save Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(440px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Submit Approval Decision</h3>
              <button onClick={() => setShowApproveModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleApprovalSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Decision</label>
                <select value={approvalDecision} onChange={e => setApprovalDecision(e.target.value)} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="1">Approved</option>
                  <option value="2">Rejected</option>
                  <option value="3">Returned for Edits</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Comments</label>
                <textarea rows="3" value={approvalComments} onChange={e => setApprovalComments(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} placeholder="Approver reasons, guidelines..." required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowApproveModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
