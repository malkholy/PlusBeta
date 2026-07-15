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

  // Searchable Department select state
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  // Active Tab & Approval History state
  const [activeTab, setActiveTab] = useState('form');
  const [approvalHistory, setApprovalHistory] = useState([]);

  // Recruitment User Roles state for access control
  const [userRoles, setUserRoles] = useState([]);

  async function loadApprovalHistory(reqId) {
    try {
      const res = await apiCall('Get Request Approval History', { RequestID: reqId }, {}, 'recruitment_requests');
      if (res.State === 0) {
        setApprovalHistory(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load approval history:', e);
    }
  }

  useEffect(() => {
    loadData();
    loadDepartments();
    loadUserRoles();
  }, []);

  async function loadUserRoles() {
    try {
      const res = await apiCall('Get Recruitment User Roles', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        setUserRoles(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load user roles:', e);
    }
  }

  const getSelectableDepartments = () => {
    const currentUsername = sessionStorage.getItem('Username');
    const userDeptRoles = userRoles.filter(r => r.Username === currentUsername && r.RoleName === 'Department Manager' && r.Department);
    
    if (userDeptRoles.length > 0) {
      const allowedNames = userDeptRoles.map(r => r.Department);
      return departments.filter(d => allowedNames.includes(d.DepartmentName));
    }
    return departments;
  };

  const isHRResponsible = () => {
    const currentUsername = sessionStorage.getItem('Username');
    const hasRoleMapped = userRoles.some(r => r.Username === currentUsername);
    if (!hasRoleMapped) {
      return sessionStorage.getItem('IsAdmin') === '1';
    }
    return userRoles.some(r => r.Username === currentUsername && r.RoleName === 'HR Responsible');
  };

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
    if (!formData.Department) {
      setModalError('Department is required.');
      setSubmitting(false);
      return;
    }
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
      const res = await apiCall('Approve Reject Request', {
        RequestID: approvalRow.RequestID,
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

  const renderFormContent = () => {
    const isEditable = !formData.RequestID || (() => {
      const r = rows.find(x => Number(x.RequestID) === Number(formData.RequestID));
      return r ? (r.RequestState === 0 || r.RequestState === 4) : true;
    })();

    return (
      <>
        {modalError && (
          <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>{modalError}</div>
        )}

        {formData.RequestID && rows.find(r => Number(r.RequestID) === Number(formData.RequestID))?.ReturnComments && (
          <div style={{
            marginBottom: 16,
            background: 'var(--blue-soft)',
            color: 'var(--blue)',
            border: '1px solid rgba(59,130,246,0.2)',
            padding: 12,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600
          }}>
            ↩️ Return Comments: {rows.find(r => Number(r.RequestID) === Number(formData.RequestID)).ReturnComments}
          </div>
        )}

        <form onSubmit={handleSaveRequest}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Position Title</label>
              <input type="text" value={formData.PositionTitle} onChange={e => setFormData({ ...formData, PositionTitle: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable} required />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Department</label>
              <div 
                onClick={() => { if (isEditable) setShowDeptDropdown(!showDeptDropdown); }}
                style={{
                  width: '100%', 
                  height: 38, 
                  padding: '0 12px', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: 10, 
                  background: isEditable ? 'var(--bg)' : 'var(--soft)', 
                  color: formData.Department ? 'var(--text)' : 'var(--muted)', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isEditable ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                <span>{formData.Department || 'Select Department'}</span>
                <span>▾</span>
              </div>

              {showDeptDropdown && isEditable && (
                <>
                  <div 
                    onClick={() => {
                      setShowDeptDropdown(false);
                      setDeptSearch('');
                    }}
                    style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 99999,
                    marginTop: 4,
                    padding: 8
                  }}>
                    <input 
                      type="text" 
                      placeholder="Search department..." 
                      value={deptSearch}
                      onChange={e => setDeptSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        height: 34,
                        padding: '0 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        outline: 'none',
                        marginBottom: 8,
                        fontSize: 13
                      }}
                    />
                    <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {getSelectableDepartments()
                        .filter(d => d.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase()))
                        .map(d => (
                          <button
                            key={d.DepartmentID}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, Department: d.DepartmentName });
                              setShowDeptDropdown(false);
                              setDeptSearch('');
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: formData.Department === d.DepartmentName ? 'var(--primary-soft)' : 'transparent',
                              border: 0,
                              borderRadius: 6,
                              textAlign: 'left',
                              color: formData.Department === d.DepartmentName ? 'var(--primary)' : 'var(--text)',
                              fontSize: 13,
                              fontWeight: formData.Department === d.DepartmentName ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                              if (formData.Department !== d.DepartmentName) {
                                e.target.style.background = 'var(--soft)';
                              }
                            }}
                            onMouseLeave={e => {
                              if (formData.Department !== d.DepartmentName) {
                                e.target.style.background = 'transparent';
                              }
                            }}
                          >
                            {d.DepartmentName}
                          </button>
                        ))
                      }
                      {getSelectableDepartments().filter(d => d.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase())).length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'none', textAlign: 'center', padding: 8 }}>No matching departments found</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Headcount</label>
              <input type="number" min="1" value={formData.Headcount} onChange={e => setFormData({ ...formData, Headcount: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Reason</label>
              <select value={formData.Reason} onChange={e => setFormData({ ...formData, Reason: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable}>
                <option value="New">New Position</option>
                <option value="Replacement">Replacement</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Urgency</label>
              <select value={formData.Urgency} onChange={e => setFormData({ ...formData, Urgency: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Min Salary</label>
              <input type="number" placeholder="Min" value={formData.SalaryMin} onChange={e => setFormData({ ...formData, SalaryMin: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Max Salary</label>
              <input type="number" placeholder="Max" value={formData.SalaryMax} onChange={e => setFormData({ ...formData, SalaryMax: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Target Start Date</label>
            <input type="date" value={formData.TargetStartDate} onChange={e => setFormData({ ...formData, TargetStartDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none' }} disabled={!isEditable} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Job Description</label>
            <textarea rows="8" value={formData.JobDescription} onChange={e => setFormData({ ...formData, JobDescription: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} placeholder="Detail requirements..." disabled={!isEditable} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Required Skills</label>
            <textarea rows="6" value={formData.RequiredSkills} onChange={e => setFormData({ ...formData, RequiredSkills: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: isEditable ? 'var(--bg)' : 'var(--soft)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} placeholder="List key technologies, certifications..." disabled={!isEditable} />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            {isEditable && (
              <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                {submitting ? 'Saving...' : 'Save Requisition'}
              </button>
            )}
          </div>
        </form>
      </>
    );
  };

  const renderCommentsTab = () => {
    const commentsList = approvalHistory.filter(ap => ap.Comments && ap.Comments.trim() !== '');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {commentsList.map((ap, idx) => (
          <div 
            key={ap.ApprovalID || idx} 
            style={{ 
              background: 'var(--bg)', 
              border: '1.5px solid var(--border)', 
              borderRadius: 14, 
              padding: 16, 
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>👤 {ap.ApproverUser}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                {ap.ActionDate ? new Date(ap.ActionDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {ap.Comments}
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ 
                fontSize: 10, 
                fontWeight: 800, 
                padding: '2px 6px', 
                borderRadius: 4, 
                background: ap.ApprovalState === 1 ? 'var(--green-soft)' : ap.ApprovalState === 2 ? 'var(--red-soft)' : 'var(--blue-soft)',
                color: ap.ApprovalState === 1 ? 'var(--green)' : ap.ApprovalState === 2 ? 'var(--red)' : 'var(--blue)'
              }}>
                Step {ap.StepNumber}: {ap.StateText}
              </span>
            </div>
          </div>
        ))}
        {commentsList.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
            💬 No comments have been submitted for this request yet.
          </div>
        )}
      </div>
    );
  };

  const renderTimelineTab = () => {
    const requestRow = rows.find(r => Number(r.RequestID) === Number(formData.RequestID));
    if (!requestRow) return null;

    const timelineItems = [];

    // 1. Creation item
    timelineItems.push({
      title: 'Requisition Draft Created',
      user: requestRow.CreatedBy || 'System',
      date: requestRow.CreatedDate,
      icon: '📝',
      color: 'var(--muted)',
      bg: 'var(--soft)'
    });

    // 2. Add approval history items
    approvalHistory.forEach(ap => {
      if (ap.ApprovalState !== 0) { // Actioned steps
        timelineItems.push({
          title: `Step ${ap.StepNumber}: ${ap.StateText}`,
          user: ap.ApproverUser,
          date: ap.ActionDate,
          comments: ap.Comments,
          icon: ap.ApprovalState === 1 ? '✅' : ap.ApprovalState === 2 ? '❌' : '↩️',
          color: ap.ApprovalState === 1 ? 'var(--green)' : ap.ApprovalState === 2 ? 'var(--red)' : 'var(--blue)',
          bg: ap.ApprovalState === 1 ? 'var(--green-soft)' : ap.ApprovalState === 2 ? 'var(--red-soft)' : 'var(--blue-soft)'
        });
      } else if (ap.IsActive) { // Pending steps
        timelineItems.push({
          title: `Step ${ap.StepNumber}: Pending Approval`,
          user: ap.ApproverUser,
          date: null,
          icon: '⏳',
          color: 'var(--orange)',
          bg: 'var(--orange-soft)'
        });
      }
    });

    // Sort items by date (except pending steps which should sit at the end)
    timelineItems.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    return (
      <div style={{ position: 'relative', paddingLeft: 24, marginLeft: 12, borderLeft: '2px solid var(--border)' }}>
        {timelineItems.map((item, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: 24 }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute',
              left: -35,
              top: 2,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: item.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              border: '1.5px solid var(--surface)'
            }}>
              {item.icon}
            </div>

            {/* Timeline content */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{item.title}</span>
                {item.date && (
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                    {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                Action by: <span style={{ color: 'var(--text)' }}>{item.user}</span>
              </div>
              {item.comments && (
                <div style={{ 
                  marginTop: 6, 
                  background: 'var(--bg)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8, 
                  padding: '8px 12px', 
                  fontSize: 12.5, 
                  color: 'var(--text)',
                  lineHeight: 1.4
                }}>
                  "{item.comments}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

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
            const currentUsername = sessionStorage.getItem('Username');
            const userDeptRoles = userRoles.filter(r => r.Username === currentUsername && r.RoleName === 'Department Manager' && r.Department);
            const defaultDept = userDeptRoles.length === 1 ? userDeptRoles[0].Department : '';

            setFormData({
              RequestID: '',
              PositionTitle: '',
              Department: defaultDept,
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
              label: '👁️ View Details',
              show: (row) => true,
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
                setActiveTab('form');
                loadApprovalHistory(row.RequestID);
                setModalError('');
                setShowAddModal(true);
              }
            },
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
                setActiveTab('form');
                loadApprovalHistory(row.RequestID);
                setModalError('');
                setShowAddModal(true);
              }
            },
            {
              label: '✍️ Submit Approval Decision',
              show: (row) => row.RequestState === 1 && isHRResponsible(),
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

      {/* Add/Edit Modal (New Request Modal / Edit Request Drawer) */}
      {showAddModal && !formData.RequestID && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(580px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Create Hiring Request</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            {renderFormContent()}
          </div>
        </div>
      )}

      {showAddModal && formData.RequestID && (
        <>
          <div 
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.15)',
              backdropFilter: 'blur(3px)',
              zIndex: 9998
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 'min(580px, 100vw)',
            height: '100vh',
            background: 'var(--surface)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.12)',
            borderLeft: '1px solid var(--border)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 24px 0 24px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                {(() => {
                  const r = rows.find(x => Number(x.RequestID) === Number(formData.RequestID));
                  const isEd = r ? (r.RequestState === 0 || r.RequestState === 4) : true;
                  return isEd ? 'Edit Hiring Request' : 'View Hiring Request';
                })()}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 16 }}>
              {['form', 'comments', 'timeline'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 4px',
                    background: 'none',
                    border: 0,
                    borderBottom: activeTab === tab ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    color: activeTab === tab ? 'var(--primary)' : 'var(--muted)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab === 'form' ? '📄 Details' : tab === 'comments' ? '💬 Comments' : '⏳ Timeline'}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
              {activeTab === 'form' && renderFormContent()}
              {activeTab === 'comments' && renderCommentsTab()}
              {activeTab === 'timeline' && renderTimelineTab()}
            </div>
          </div>
        </>
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
