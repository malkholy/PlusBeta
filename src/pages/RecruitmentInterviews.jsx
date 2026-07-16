import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function RecruitmentInterviews(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemUsers, setSystemUsers] = useState([]);
  
  // Drawer Details State
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('details'); // 'details', 'attachments', 'history', 'interviews'
  const [interviews, setInterviews] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [hiringRequests, setHiringRequests] = useState([]);

  // Reassign Requisition Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignFormData, setReassignFormData] = useState({
    CandidateID: '',
    RequestID: ''
  });

  // Feedback Form State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackFormData, setFeedbackFormData] = useState({
    InterviewID: '',
    Rating: '8',
    Recommendation: '0',
    FeedbackComments: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Delay/Cancel Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusFormData, setStatusFormData] = useState({
    InterviewID: '',
    InterviewState: 3, // 3: Delayed, 4: Canceled
    DelayCancelReason: ''
  });

  async function handleStatusSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Update Interview State', {
        InterviewID: Number(statusFormData.InterviewID),
        InterviewState: Number(statusFormData.InterviewState),
        DelayCancelReason: statusFormData.DelayCancelReason
      }, {}, 'recruitment_requests');
      
      if (res.State === 0) {
        setShowStatusModal(false);
        setShowDetailDrawer(false);
        loadData();
      } else {
        alert(res.Message || 'Failed to update interview status.');
      }
    } catch (err) {
      alert('Error updating interview: ' + err.message);
    }
    setSubmitting(false);
  }

  useEffect(() => {
    loadData();
    loadSystemUsers();
    loadHiringRequests();
  }, []);

  async function loadHiringRequests() {
    try {
      const res = await apiCall('Get Hiring Requests', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        const list = (res.List0 || []).filter(r => r.RequestState === 5 || r.RequestState === 2);
        setHiringRequests(list);
      }
    } catch (e) {
      console.error('Failed to load hiring requests:', e);
    }
  }

  async function loadSystemUsers() {
    try {
      const res = await apiCall('GetSystemUsers', {}, {}, 'plus');
      if (res.State === 0 || res.List0) {
        setSystemUsers(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load system users:', e);
    }
  }

  async function loadCandidateData(candidateId) {
    if (!candidateId) return;
    try {
      const res = await apiCall('Get Interviews', { CandidateID: candidateId }, {}, 'recruitment_requests');
      if (res.State === 0) {
        setInterviews(res.List0 || []);
      }
    } catch (err) {
      console.error('Failed to load interviews:', err);
    }
    try {
      const res = await apiCall('Get Candidate Assignment History', { CandidateID: candidateId }, {}, 'recruitment_requests');
      if (res.State === 0) {
        setAssignmentHistory(res.List0 || []);
      }
    } catch (err) {
      console.error('Failed to load assignment history:', err);
    }
  }

  async function handleReassignSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Reassign Candidate', {
        CandidateID: Number(reassignFormData.CandidateID),
        RequestID: Number(reassignFormData.RequestID)
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowReassignModal(false);
        loadData();
        loadCandidateData(Number(reassignFormData.CandidateID));
        // Update selectedInterview fields to reflect reassignment
        if (selectedInterview && selectedInterview.CandidateID === Number(reassignFormData.CandidateID)) {
          const updatedReq = hiringRequests.find(h => h.RequestID === Number(reassignFormData.RequestID));
          setSelectedInterview(prev => ({
            ...prev,
            PositionTitle: updatedReq ? updatedReq.PositionTitle : prev.PositionTitle,
            Department: updatedReq ? updatedReq.Department : prev.Department
          }));
        }
        alert('Candidate reassigned successfully!');
      } else {
        alert(res.Message || 'Failed to reassign candidate.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Submit interview feedback', {
        InterviewID: Number(feedbackFormData.InterviewID),
        Rating: Number(feedbackFormData.Rating),
        FeedbackComments: feedbackFormData.FeedbackComments,
        Recommendation: Number(feedbackFormData.Recommendation)
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowFeedbackModal(false);
        setShowDetailDrawer(false);
        loadData();
      } else {
        alert(res.Message || 'Failed to submit feedback.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Interviews Log', null, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        const list = res.List0 || [];
        setRows(list);

        if (list.length > 0) {
          const keys = Object.keys(list[0]).filter(k => k !== 'InterviewID' && k !== 'CandidateID');
          const cols = keys.map(k => {
            let label = k.replace(/([A-Z])/g, ' $1').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);
            if (k === 'PositionTitle') label = 'Requested Position';
            if (k === 'InterviewerUser') label = 'Interviewer';
            if (k === 'InterviewState') label = 'Status';
            
            return {
              key: k,
              label,
              render: (val, row, search, highlight) => {
                if (k === 'RoundNumber') {
                  const roundLabels = {
                    1: 'Round 1: HR',
                    2: 'Round 2: Technical',
                    3: 'Round 3: Manager',
                    4: 'Round 4: Final'
                  };
                  return highlight(roundLabels[val] || `Round ${val}`, search);
                }
                if (k === 'InterviewerUser') {
                  const sysUser = systemUsers.find(u => u.Username.toLowerCase() === (val || '').toLowerCase());
                  const displayName = sysUser ? sysUser.Name : val;
                  return highlight(displayName || '—', search);
                }
                if (k === 'InterviewState') {
                  const states = {
                    0: { text: 'Scheduled', color: 'var(--muted)', bg: 'var(--soft)' },
                    1: { text: 'Completed', color: 'var(--text)', bg: 'var(--soft)' },
                    2: { text: 'Passed', color: 'var(--green)', bg: 'var(--green-soft)' }
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
                if (k === 'Recommendation') {
                  if (val === null || val === undefined || val === '') return '—';
                  const recs = {
                    0: { text: 'Proceed', color: 'var(--green)', bg: 'var(--green-soft)' },
                    1: { text: 'Reject', color: 'var(--red)', bg: 'var(--red-soft)' },
                    2: { text: 'Hold', color: 'var(--muted)', bg: 'var(--soft)' }
                  };
                  const rec = recs[val] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
                  return (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: rec.color,
                      background: rec.bg,
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      {rec.text}
                    </span>
                  );
                }
                if (k === 'Rating') {
                  if (val === null || val === undefined || val === '') return '—';
                  return <span style={{ fontWeight: 700 }}>⭐ {val} / 10</span>;
                }
                if (k.toLowerCase().endsWith('date') && val) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    }
                  } catch (e) {}
                }
                return highlight(String(val ?? '-'), search);
              }
            };
          });

          // Reorder: Move InterviewState to first position, CandidateName to second, PositionTitle to third
          const stateIndex = cols.findIndex(c => c.key === 'InterviewState');
          if (stateIndex > -1) {
            const [stateCol] = cols.splice(stateIndex, 1);
            cols.unshift(stateCol);
          }
          const candIndex = cols.findIndex(c => c.key === 'CandidateName');
          if (candIndex > -1) {
            const [candCol] = cols.splice(candIndex, 1);
            cols.splice(1, 0, candCol);
          }
          const posIndex = cols.findIndex(c => c.key === 'PositionTitle');
          if (posIndex > -1) {
            const [posCol] = cols.splice(posIndex, 1);
            cols.splice(2, 0, posCol);
          }

          setColumns(cols);
        }
      } else {
        setError(res.Message || 'Failed to retrieve interviews history.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  // When systemUsers or rows update, re-run cols mapping so names load correctly
  useEffect(() => {
    if (rows.length > 0 && systemUsers.length > 0) {
      const keys = Object.keys(rows[0]).filter(k => k !== 'InterviewID' && k !== 'CandidateID');
      const cols = keys.map(k => {
        let label = k.replace(/([A-Z])/g, ' $1').trim();
        label = label.charAt(0).toUpperCase() + label.slice(1);
        if (k === 'PositionTitle') label = 'Requested Position';
        if (k === 'InterviewerUser') label = 'Interviewer';
        if (k === 'InterviewState') label = 'Status';
        
        return {
          key: k,
          label,
          render: (val, row, search, highlight) => {
            if (k === 'RoundNumber') {
              const roundLabels = {
                1: 'Round 1: HR',
                2: 'Round 2: Technical',
                3: 'Round 3: Manager',
                4: 'Round 4: Final'
              };
              return highlight(roundLabels[val] || `Round ${val}`, search);
            }
            if (k === 'InterviewerUser') {
              const sysUser = systemUsers.find(u => u.Username.toLowerCase() === (val || '').toLowerCase());
              const displayName = sysUser ? sysUser.Name : val;
              return highlight(displayName || '—', search);
            }
            if (k === 'InterviewState') {
              const states = {
                0: { text: 'Scheduled', color: 'var(--muted)', bg: 'var(--soft)' },
                1: { text: 'Completed', color: 'var(--text)', bg: 'var(--soft)' },
                2: { text: 'Passed', color: 'var(--green)', bg: 'var(--green-soft)' }
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
            if (k === 'Recommendation') {
              if (val === null || val === undefined || val === '') return '—';
              const recs = {
                0: { text: 'Proceed', color: 'var(--green)', bg: 'var(--green-soft)' },
                1: { text: 'Reject', color: 'var(--red)', bg: 'var(--red-soft)' },
                2: { text: 'Hold', color: 'var(--muted)', bg: 'var(--soft)' }
              };
              const rec = recs[val] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
              return (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: rec.color,
                  background: rec.bg,
                  padding: '3px 8px',
                  borderRadius: 6
                }}>
                  {rec.text}
                </span>
              );
            }
            if (k === 'Rating') {
              if (val === null || val === undefined || val === '') return '—';
              return <span style={{ fontWeight: 700 }}>⭐ {val} / 10</span>;
            }
            if (k.toLowerCase().endsWith('date') && val) {
              try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
              } catch (e) {}
            }
            return highlight(String(val ?? '-'), search);
          }
        };
      });

      const stateIndex = cols.findIndex(c => c.key === 'InterviewState');
      if (stateIndex > -1) {
        const [stateCol] = cols.splice(stateIndex, 1);
        cols.unshift(stateCol);
      }
      const candIndex = cols.findIndex(c => c.key === 'CandidateName');
      if (candIndex > -1) {
        const [candCol] = cols.splice(candIndex, 1);
        cols.splice(1, 0, candCol);
      }
      const posIndex = cols.findIndex(c => c.key === 'PositionTitle');
      if (posIndex > -1) {
        const [posCol] = cols.splice(posIndex, 1);
        cols.splice(2, 0, posCol);
      }

      setColumns(cols);
    }
  }, [systemUsers, rows]);

  const renderDetailDrawer = () => {
    if (!selectedInterview) return null;
    const sysUser = systemUsers.find(u => u.Username.toLowerCase() === (selectedInterview.InterviewerUser || '').toLowerCase());
    const interviewerName = sysUser ? sysUser.Name : selectedInterview.InterviewerUser;

    const roundLabels = {
      1: 'Round 1: HR',
      2: 'Round 2: Technical',
      3: 'Round 3: Manager',
      4: 'Round 4: Final'
    };

    const recs = {
      0: { text: 'Proceed', color: 'var(--green)', bg: 'var(--green-soft)' },
      1: { text: 'Reject', color: 'var(--red)', bg: 'var(--red-soft)' },
      2: { text: 'Hold', color: 'var(--muted)', bg: 'var(--soft)' }
    };
    const rec = recs[selectedInterview.Recommendation];

    const states = {
      0: { text: 'Scheduled', color: 'var(--muted)', bg: 'var(--soft)' },
      1: { text: 'Completed', color: 'var(--text)', bg: 'var(--soft)' },
      2: { text: 'Passed', color: 'var(--green)', bg: 'var(--green-soft)' },
      3: { text: 'Delayed', color: 'var(--orange)', bg: 'var(--orange-soft)' },
      4: { text: 'Canceled', color: 'var(--red)', bg: 'var(--red-soft)' }
    };
    const state = states[selectedInterview.InterviewState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };

    const initials = selectedInterview.CandidateName ? selectedInterview.CandidateName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';

    return (
      <>
        <div
          onClick={() => setShowDetailDrawer(false)}
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
          width: 'min(680px, 100vw)',
          height: '100vh',
          background: 'var(--surface)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.12)',
          borderLeft: '1px solid var(--border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Interview Details</h3>
            <button onClick={() => setShowDetailDrawer(false)} style={{ background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'var(--muted)', fontWeight: 'bold' }}>&times;</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {selectedInterview.CandidateName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: state.color, background: state.bg, padding: '3px 8px', borderRadius: 6 }}>
                    {state.text}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>ID: #{selectedInterview.InterviewID}</span>
                </div>
              </div>
            </div>

            {/* Custom Tabs Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 16 }}>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('details')}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: activeDrawerTab === 'details' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: activeDrawerTab === 'details' ? 'var(--primary)' : 'var(--muted)',
                  padding: '8px 4px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                👤 Details
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('attachments')}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: activeDrawerTab === 'attachments' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: activeDrawerTab === 'attachments' ? 'var(--primary)' : 'var(--muted)',
                  padding: '8px 4px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                📎 Attachments
                <span style={{
                  fontSize: 10,
                  background: activeDrawerTab === 'attachments' ? 'var(--primary)' : 'var(--border2)',
                  color: activeDrawerTab === 'attachments' ? '#fff' : 'var(--muted)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 800,
                  marginLeft: 2
                }}>
                  {attachments.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('interviews')}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: activeDrawerTab === 'interviews' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: activeDrawerTab === 'interviews' ? 'var(--primary)' : 'var(--muted)',
                  padding: '8px 4px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                📅 Interview History
                <span style={{
                  fontSize: 10,
                  background: activeDrawerTab === 'interviews' ? 'var(--primary)' : 'var(--border2)',
                  color: activeDrawerTab === 'interviews' ? '#fff' : 'var(--muted)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 800,
                  marginLeft: 2
                }}>
                  {interviews.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('history')}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: activeDrawerTab === 'history' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: activeDrawerTab === 'history' ? 'var(--primary)' : 'var(--muted)',
                  padding: '8px 4px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                🔄 Reassignment History
                <span style={{
                  fontSize: 10,
                  background: activeDrawerTab === 'history' ? 'var(--primary)' : 'var(--border2)',
                  color: activeDrawerTab === 'history' ? '#fff' : 'var(--muted)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 800,
                  marginLeft: 2
                }}>
                  {assignmentHistory.length}
                </span>
              </button>
            </div>

            {activeDrawerTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>General Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600, alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Requested Position</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text)' }}>{selectedInterview.PositionTitle}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReassignFormData({
                              CandidateID: String(selectedInterview.CandidateID),
                              RequestID: String(selectedInterview.RequestID)
                            });
                            setShowReassignModal(true);
                          }}
                          style={{
                            background: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            border: 0,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          🔄 Reassign
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Department</span>
                      <span style={{ color: 'var(--text)' }}>{selectedInterview.Department || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Round</span>
                      <span style={{ color: 'var(--text)' }}>{roundLabels[selectedInterview.RoundNumber] || `Round ${selectedInterview.RoundNumber}`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Interviewer</span>
                      <span style={{ color: 'var(--text)' }}>{interviewerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Scheduled Time</span>
                      <span style={{ color: 'var(--text)' }}>
                        {selectedInterview.ScheduledDate ? new Date(selectedInterview.ScheduledDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Candidate Profile</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Email Address</span>
                      <span style={{ color: 'var(--text)' }}>{selectedInterview.CandidateEmail || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Phone Number</span>
                      <span style={{ color: 'var(--text)' }}>{selectedInterview.CandidatePhone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Candidate Source</span>
                      <span style={{ color: 'var(--text)' }}>{selectedInterview.CandidateSource || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Location</span>
                      <span style={{ color: 'var(--text)' }}>
                        {selectedInterview.CandidateGovernment ? `${selectedInterview.CandidateCity ? `${selectedInterview.CandidateCity}, ` : ''}${selectedInterview.CandidateGovernment}` : '—'}
                      </span>
                    </div>
                    {selectedInterview.CandidateAddress && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Address</span>
                        <span style={{ color: 'var(--text)' }}>{selectedInterview.CandidateAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(Number(selectedInterview.InterviewState) === 1 || Number(selectedInterview.InterviewState) === 2) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Score / Rating</span>
                        <span style={{ color: 'var(--amber)', fontWeight: 800 }}>⭐ {selectedInterview.Rating} / 10</span>
                      </div>
                      {rec && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
                          <span style={{ color: 'var(--muted)' }}>Recommendation</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, color: rec.color, background: rec.bg }}>{rec.text}</span>
                        </div>
                      )}
                    </div>

                    {selectedInterview.FeedbackComments && (
                      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 16, padding: 16, borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>Interviewer Comments</div>
                        <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                          "{selectedInterview.FeedbackComments}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedInterview.DelayCancelReason && (
                  <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, borderLeft: '4px solid var(--orange)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
                      {Number(selectedInterview.InterviewState) === 3 ? 'Delay Reason' : 'Cancellation Reason'}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                      "{selectedInterview.DelayCancelReason}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === 'attachments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
                  Candidate CV Attachment
                </div>
                {attachments.length === 0 ? (
                  <div style={{ padding: '24px 12px', background: 'var(--soft)', border: '1px dotted var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    📎 No CV file uploaded for this candidate.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {attachments.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 24 }}>📄</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadCV(file)}
                          style={{
                            height: 32,
                            padding: '0 12px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            borderRadius: 8,
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === 'interviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
                  Interview History ({interviews.length})
                </div>
                {interviews.length === 0 ? (
                  <div style={{ padding: '24px 12px', background: 'var(--soft)', border: '1px dotted var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    📅 No other interview rounds scheduled yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {interviews.map((item, idx) => {
                      const rounds = {
                        1: { text: 'Round 1: HR', bg: 'var(--blue-soft)', color: 'var(--blue)' },
                        2: { text: 'Round 2: Technical', bg: '#e0e7ff', color: '#6366f1' },
                        3: { text: 'Round 3: Manager', bg: 'var(--orange-soft)', color: 'var(--orange)' },
                        4: { text: 'Round 4: Final', bg: 'var(--green-soft)', color: 'var(--green)' }
                      };
                      const r = rounds[item.RoundNumber] || { text: `Round ${item.RoundNumber}`, bg: 'var(--soft)', color: 'var(--muted)' };

                      const isStates = {
                        0: { text: 'Scheduled', color: 'var(--muted)', bg: 'var(--soft)' },
                        1: { text: 'Completed', color: 'var(--text)', bg: 'var(--soft)' },
                        2: { text: 'Passed', color: 'var(--green)', bg: 'var(--green-soft)' },
                        3: { text: 'Delayed', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                        4: { text: 'Canceled', color: 'var(--red)', bg: 'var(--red-soft)' }
                      };
                      const s = isStates[item.InterviewState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };

                      return (
                        <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.015)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: r.color, background: r.bg }}>{r.text}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: s.color, background: s.bg }}>{s.text}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--muted)' }}>Interviewer</span>
                              <span style={{ color: 'var(--text)' }}>
                                {(() => {
                                  const sys = systemUsers.find(u => u.Username.toLowerCase() === (item.InterviewerUser || '').toLowerCase());
                                  return sys ? sys.Name : item.InterviewerUser;
                                })()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--muted)' }}>Date & Time</span>
                              <span style={{ color: 'var(--text)' }}>
                                {item.ScheduledDate ? new Date(item.ScheduledDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
                  Reassignment Log History ({assignmentHistory.length})
                </div>
                {assignmentHistory.length === 0 ? (
                  <div style={{ padding: '24px 12px', background: 'var(--soft)', border: '1px dotted var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    🔄 No reassignment records found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assignmentHistory.map((item, idx) => {
                      const candidateStates = {
                        0: { text: 'New', color: 'var(--blue)', bg: 'var(--blue-soft)' },
                        1: { text: 'Shortlisted', color: '#6366f1', bg: '#e0e7ff' },
                        2: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
                        3: { text: 'Interviewing', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                        4: { text: 'Selected', color: 'var(--primary)', bg: 'var(--primary-soft)' },
                        5: { text: 'On Hold', color: 'var(--muted)', bg: 'var(--soft)' },
                        6: { text: 'Hired', color: 'var(--green)', bg: 'var(--green-soft)' }
                      };
                      const oldState = candidateStates[item.OldCandidateState];

                      return (
                        <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.015)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '2px 8px', borderRadius: 6 }}>
                              Reassigned Requisition
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                              {item.AssignedDate ? new Date(item.AssignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)' }}>From Requisition</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: 'var(--text)' }}>
                                  {item.OldPositionTitle ? `${item.OldPositionTitle} (${item.OldDepartment || '—'})` : 'None / Registered'}
                                </span>
                                {oldState && (
                                  <span style={{ fontSize: 9.5, fontWeight: 800, color: oldState.color, background: oldState.bg, padding: '1px 5px', borderRadius: 4 }}>
                                    {oldState.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--muted)' }}>To Requisition</span>
                            <span style={{ color: 'var(--text)', fontWeight: 800 }}>
                              {item.NewPositionTitle} ({item.NewDepartment})
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 2 }}>
                            <span style={{ color: 'var(--muted)' }}>Assigned By</span>
                            <span style={{ color: 'var(--text)' }}>{item.AssignedBy}</span>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {Number(selectedInterview.InterviewState) === 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setFeedbackFormData({
                    InterviewID: selectedInterview.InterviewID,
                    Rating: '8',
                    Recommendation: '0',
                    FeedbackComments: ''
                  });
                  setShowFeedbackModal(true);
                }}
                style={{
                  width: '100%',
                  height: 40,
                  border: 0,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(249,115,22,0.15)'
                }}
              >
                ✍️ Submit Interview Feedback
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFormData({
                      InterviewID: String(selectedInterview.InterviewID),
                      InterviewState: 3,
                      DelayCancelReason: ''
                    });
                    setShowStatusModal(true);
                  }}
                  style={{
                    flex: 1,
                    height: 38,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  ⚠️ Delay Round
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFormData({
                      InterviewID: String(selectedInterview.InterviewID),
                      InterviewState: 4,
                      DelayCancelReason: ''
                    });
                    setShowStatusModal(true);
                  }}
                  style={{
                    flex: 1,
                    height: 38,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--red)',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  🚫 Cancel Round
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && (
        <div style={{ marginBottom: 20, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Interviews Log"
          subtitle="Audit and track historical interview rounds, evaluations, and decisions"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          onRowClick={(row) => {
            setSelectedInterview(row);
            setActiveDrawerTab('details');
            setInterviews([]);
            setAssignmentHistory([]);
            setShowDetailDrawer(true);
            loadCandidateData(row.CandidateID);
          }}
          extraRowActions={[
            {
              label: '✍️ Submit Interview Feedback',
              show: (row) => Number(row.InterviewState) === 0,
              onClick: (row) => {
                setFeedbackFormData({
                  InterviewID: String(row.InterviewID),
                  Rating: '8',
                  Recommendation: '0',
                  FeedbackComments: ''
                });
                setShowFeedbackModal(true);
              }
            },
            {
              label: '⚠️ Delay Interview Round',
              show: (row) => Number(row.InterviewState) === 0,
              onClick: (row) => {
                setStatusFormData({
                  InterviewID: String(row.InterviewID),
                  InterviewState: 3,
                  DelayCancelReason: ''
                });
                setShowStatusModal(true);
              }
            },
            {
              label: '🚫 Cancel Interview Round',
              show: (row) => Number(row.InterviewState) === 0,
              onClick: (row) => {
                setStatusFormData({
                  InterviewID: String(row.InterviewID),
                  InterviewState: 4,
                  DelayCancelReason: ''
                });
                setShowStatusModal(true);
              }
            }
          ]}
        />
      </div>

      {showDetailDrawer && renderDetailDrawer()}

      {/* Log Interview Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Log Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleFeedbackSubmit}>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Rating / Score</label>
                  <select value={feedbackFormData.Rating} onChange={e => setFeedbackFormData({ ...feedbackFormData, Rating: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    {[...Array(11).keys()].map(n => (
                      <option key={n} value={n}>{n} / 10</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Recommendation</label>
                  <select value={feedbackFormData.Recommendation} onChange={e => setFeedbackFormData({ ...feedbackFormData, Recommendation: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="0">Proceed</option>
                    <option value="1">Reject</option>
                    <option value="2">Hold</option>
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Interviewer Comments</label>
                  <textarea rows="4" value={feedbackFormData.FeedbackComments} onChange={e => setFeedbackFormData({ ...feedbackFormData, FeedbackComments: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} placeholder="Log interview performance..." required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', background: 'var(--soft)', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowFeedbackModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                {Number(statusFormData.InterviewState) === 3 ? 'Delay Interview' : 'Cancel Interview'}
              </h3>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleStatusSubmit}>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Reason for {Number(statusFormData.InterviewState) === 3 ? 'Delay' : 'Cancellation'}
                  </label>
                  <textarea 
                    rows="4" 
                    value={statusFormData.DelayCancelReason} 
                    onChange={e => setStatusFormData({ ...statusFormData, DelayCancelReason: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} 
                    placeholder={`Please specify why this round is being ${Number(statusFormData.InterviewState) === 3 ? 'delayed' : 'canceled'}...`} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', background: 'var(--soft)', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowStatusModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: Number(statusFormData.InterviewState) === 3 ? 'linear-gradient(135deg, var(--orange), #f59e0b)' : 'linear-gradient(135deg, var(--red), #ef4444)', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Updating...' : Number(statusFormData.InterviewState) === 3 ? 'Confirm Delay' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReassignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Reassign Candidate Requisition</h3>
              <button onClick={() => setShowReassignModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleReassignSubmit}>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Target Hiring Request / Requisition</label>
                  <select 
                    value={reassignFormData.RequestID} 
                    onChange={e => setReassignFormData({ ...reassignFormData, RequestID: e.target.value })} 
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                    required
                  >
                    <option value="">Select Requisition</option>
                    {hiringRequests.map(req => (
                      <option key={req.RequestID} value={req.RequestID}>
                        {req.PositionTitle} ({req.Department}) - Code: #{req.RequestID}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
                  💡 <strong>Note:</strong> Reassigning a candidate updates their active link to the chosen job requisition and resets their state to <strong>Shortlisted</strong>. All past interview records, comments, and decision ratings for other requisitions are preserved in their history log.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', background: 'var(--soft)', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowReassignModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
