import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function CandidatesPool(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Requisitions list (for dropdowns)
  const [hiringRequests, setHiringRequests] = useState([]);

  // Candidate Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    CandidateID: '',
    RequestID: '',
    FullName: '',
    Email: '',
    Phone: '',
    CVFileName: '',
    CVFileContent: '',
    Source: 'Job Board'
  });

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCandidateID, setRejectCandidateID] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Interview Schedule Modal State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewFormData, setInterviewFormData] = useState({
    CandidateID: '',
    RoundNumber: '1',
    InterviewerUser: '',
    ScheduledDate: ''
  });

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackFormData, setFeedbackFormData] = useState({
    InterviewID: '',
    Rating: '5',
    FeedbackComments: '',
    Recommendation: '0' // 0: Proceed, 1: Reject, 2: Hold
  });

  // Job Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    CandidateID: '',
    ProposedSalary: '',
    ProposedStartDate: '',
    OfferTerms: ''
  });

  useEffect(() => {
    loadData();
    loadHiringRequests();
  }, []);

  async function loadHiringRequests() {
    try {
      const res = await apiCall('Get Hiring Requests', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        // Filter to requests that are approved or open for sourcing
        const list = (res.List0 || []).filter(r => r.RequestState === 5 || r.RequestState === 2);
        setHiringRequests(list);
      }
    } catch (e) {
      console.error('Failed to load hiring requests:', e);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Candidates', null, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        const list = res.List0 || [];
        setRows(list);

        if (list.length > 0) {
          const keys = Object.keys(list[0]).filter(k => k !== 'CVFileContent');
          const cols = keys.map(k => {
            const label = k.replace(/([A-Z])/g, ' $1').trim();
            return {
              key: k,
              label: label.charAt(0).toUpperCase() + label.slice(1),
              render: (val, row, search, highlight) => {
                if (k === 'CandidateState') {
                  const states = {
                    0: { text: 'New', color: 'var(--blue)', bg: 'var(--blue-soft)' },
                    1: { text: 'Shortlisted', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                    2: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
                    3: { text: 'Interviewing', color: '#6366f1', bg: '#e0e7ff' },
                    4: { text: 'Selected', color: 'var(--green)', bg: 'var(--green-soft)' },
                    5: { text: 'On Hold', color: 'var(--muted)', bg: 'var(--soft)' },
                    6: { text: 'Hired', color: 'var(--green)', bg: 'var(--green-soft)' }
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
                if (k === 'CVFileName' && val) {
                  return (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                      📄 {val}
                    </span>
                  );
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

          // Move CandidateState to the first position
          const stateColIndex = cols.findIndex(c => c.key === 'CandidateState');
          if (stateColIndex > -1) {
            const [stateCol] = cols.splice(stateColIndex, 1);
            cols.unshift(stateCol);
          }

          setColumns(cols);
        }
      } else {
        setError(res.Message || 'Failed to retrieve candidates.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleSaveCandidate(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    try {
      const payload = {
        ...formData,
        RequestID: Number(formData.RequestID)
      };

      const res = await apiCall('Save Candidate', payload, {}, 'recruitment_requests');
      if (res.State === 0) {
        setShowAddModal(false);
        loadData();
      } else {
        setModalError(res.Message || 'Failed to save candidate.');
      }
    } catch (err) {
      setModalError('Connection error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleShortlist(id) {
    if (!window.confirm('Shortlist this candidate for phone screen/interviews?')) return;
    setLoading(true);
    try {
      const res = await apiCall('Screen Candidate', {
        CandidateID: id,
        CandidateState: 1
      }, {}, 'recruitment_requests');
      if (res.State === 0) {
        loadData();
      } else {
        alert(res.Message || 'Action failed.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Screen Candidate', {
        CandidateID: rejectCandidateID,
        CandidateState: 2,
        RejectionReason: rejectionReason
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowRejectModal(false);
        setRejectionReason('');
        loadData();
      } else {
        alert(res.Message || 'Failed to reject candidate.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleInterviewSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Schedule Interview', {
        CandidateID: Number(interviewFormData.CandidateID),
        RoundNumber: Number(interviewFormData.RoundNumber),
        InterviewerUser: interviewFormData.InterviewerUser,
        ScheduledDate: new Date(interviewFormData.ScheduledDate).toISOString()
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowInterviewModal(false);
        loadData();
      } else {
        alert(res.Message || 'Failed to schedule interview.');
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
      const res = await apiCall('Submit Feedback', {
        InterviewID: Number(feedbackFormData.InterviewID),
        Rating: Number(feedbackFormData.Rating),
        FeedbackComments: feedbackFormData.FeedbackComments,
        Recommendation: Number(feedbackFormData.Recommendation)
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowFeedbackModal(false);
        loadData();
      } else {
        alert(res.Message || 'Failed to submit feedback.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleOfferSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Save Job Offer', {
        CandidateID: Number(offerFormData.CandidateID),
        ProposedSalary: Number(offerFormData.ProposedSalary),
        ProposedStartDate: new Date(offerFormData.ProposedStartDate).toISOString().split('T')[0],
        OfferTerms: offerFormData.OfferTerms
      }, {}, 'recruitment_requests');

      if (res.State === 0) {
        setShowOfferModal(false);
        loadData();
        alert('Job offer generated successfully!');
      } else {
        alert(res.Message || 'Failed to generate job offer.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  // Handle local file uploads converting to base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          CVFileName: file.name,
          CVFileContent: reader.result.split(',')[1] // Get base64 payload
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const metrics = (() => {
    const total = rows.length;
    const shortlisted = rows.filter(r => r.CandidateState === 1).length;
    const interviewing = rows.filter(r => r.CandidateState === 3).length;
    const hired = rows.filter(r => r.CandidateState === 6).length;
    return { total, shortlisted, interviewing, hired };
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
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Candidates</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{metrics.total}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Shortlisted</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)', marginTop: 6 }}>{metrics.shortlisted}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Interviewing</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>{metrics.interviewing}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Hired</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>{metrics.hired}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Candidates Directory"
          subtitle="Record and advance applicant details inside active requisitions"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          onAdd={() => {
            setFormData({
              CandidateID: '',
              RequestID: hiringRequests.length > 0 ? String(hiringRequests[0].RequestID) : '',
              FullName: '',
              Email: '',
              Phone: '',
              CVFileName: '',
              CVFileContent: '',
              Source: 'Job Board'
            });
            setModalError('');
            setShowAddModal(true);
          }}
          extraRowActions={[
            {
              label: '📋 Shortlist Candidate',
              show: (row) => row.CandidateState === 0,
              onClick: (row) => handleShortlist(row.CandidateID)
            },
            {
              label: '📅 Schedule Interview',
              show: (row) => row.CandidateState === 1 || row.CandidateState === 3,
              onClick: (row) => {
                setInterviewFormData({
                  CandidateID: String(row.CandidateID),
                  RoundNumber: '1',
                  InterviewerUser: '',
                  ScheduledDate: ''
                });
                setShowInterviewModal(true);
              }
            },
            {
              label: '✍️ Submit Interview Feedback',
              show: (row) => row.CandidateState === 3,
              onClick: async (row) => {
                try {
                  const res = await apiCall('Get Interviews', { CandidateID: row.CandidateID }, {}, 'recruitment_requests');
                  const activeInt = (res.List0 || []).find(i => i.InterviewState === 0);
                  if (!activeInt) {
                    alert('No scheduled/active interview rounds found for this candidate.');
                    return;
                  }
                  setFeedbackFormData({
                    InterviewID: String(activeInt.InterviewID),
                    Rating: '5',
                    FeedbackComments: '',
                    Recommendation: '0'
                  });
                  setShowFeedbackModal(true);
                } catch (err) {
                  alert('Error loading interview: ' + err.message);
                }
              }
            },
            {
              label: '💼 Generate Job Offer',
              show: (row) => row.CandidateState === 4,
              onClick: (row) => {
                setOfferFormData({
                  CandidateID: String(row.CandidateID),
                  ProposedSalary: '',
                  ProposedStartDate: '',
                  OfferTerms: ''
                });
                setShowOfferModal(true);
              }
            },
            {
              label: '❌ Reject Candidate',
              show: (row) => row.CandidateState !== 2 && row.CandidateState !== 6,
              onClick: (row) => {
                setRejectCandidateID(row.CandidateID);
                setRejectionReason('');
                setShowRejectModal(true);
              }
            }
          ]}
        />
      </div>

      {/* Candidate Registration Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(480px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Register Candidate</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            {modalError && (
              <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>{modalError}</div>
            )}

            <form onSubmit={handleSaveCandidate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Hiring Requisition</label>
                <select value={formData.RequestID} onChange={e => setFormData({ ...formData, RequestID: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required>
                  <option value="">Select Requisition</option>
                  {hiringRequests.map(r => (
                    <option key={r.RequestID} value={r.RequestID}>{r.PositionTitle} ({r.Department})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" value={formData.FullName} onChange={e => setFormData({ ...formData, FullName: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Email</label>
                  <input type="email" value={formData.Email} onChange={e => setFormData({ ...formData, Email: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Phone</label>
                  <input type="text" value={formData.Phone} onChange={e => setFormData({ ...formData, Phone: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Source</label>
                <select value={formData.Source} onChange={e => setFormData({ ...formData, Source: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="Job Board">Job Board</option>
                  <option value="Agency">Agency</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Upload CV (PDF/Word)</label>
                <input type="file" onChange={handleFileChange} style={{ fontSize: 13 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Saving...' : 'Register Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(400px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Log Rejection Reason</h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Reason</label>
                <textarea rows="3" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} placeholder="Disqualification details..." required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'var(--red)', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  Reject Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(420px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Schedule Interview</h3>
              <button onClick={() => setShowInterviewModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleInterviewSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Interview Round</label>
                <select value={interviewFormData.RoundNumber} onChange={e => setInterviewFormData({ ...interviewFormData, RoundNumber: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="1">Round 1: HR</option>
                  <option value="2">Round 2: Technical</option>
                  <option value="3">Round 3: Manager</option>
                  <option value="4">Round 4: Final</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Interviewer User</label>
                <input type="text" value={interviewFormData.InterviewerUser} onChange={e => setInterviewFormData({ ...interviewFormData, InterviewerUser: e.target.value })} placeholder="Interviewer user ID" style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Scheduled Date & Time</label>
                <input type="datetime-local" value={interviewFormData.ScheduledDate} onChange={e => setInterviewFormData({ ...interviewFormData, ScheduledDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowInterviewModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Interview Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(440px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Log Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleFeedbackSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Rating Score</label>
                  <select value={feedbackFormData.Rating} onChange={e => setFeedbackFormData({ ...feedbackFormData, Rating: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                    <option value="4">⭐⭐⭐⭐ Good</option>
                    <option value="3">⭐⭐⭐ Average</option>
                    <option value="2">⭐⭐ Fair</option>
                    <option value="1">⭐ Poor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Recommendation</label>
                  <select value={feedbackFormData.Recommendation} onChange={e => setFeedbackFormData({ ...feedbackFormData, Recommendation: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="0">Proceed</option>
                    <option value="1">Reject</option>
                    <option value="2">On Hold</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Comments</label>
                <textarea rows="4" value={feedbackFormData.FeedbackComments} onChange={e => setFeedbackFormData({ ...feedbackFormData, FeedbackComments: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} placeholder="Log interview performance..." required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowFeedbackModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Job Offer Modal */}
      {showOfferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(460px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Draft Job Offer</h3>
              <button onClick={() => setShowOfferModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleOfferSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Proposed Salary</label>
                  <input type="number" value={offerFormData.ProposedSalary} onChange={e => setOfferFormData({ ...offerFormData, ProposedSalary: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={offerFormData.ProposedStartDate} onChange={e => setOfferFormData({ ...offerFormData, ProposedStartDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Offer Terms</label>
                <textarea rows="3" value={offerFormData.OfferTerms} onChange={e => setOfferFormData({ ...offerFormData, OfferTerms: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none' }} placeholder="Optionally add contract specific terms..." />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowOfferModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  Generate Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
