import { useState, useEffect } from 'react';
import { apiCall, uploadToCloudinary, getAnthropicAPIKey } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const EGYPT_LOCATIONS = {
  'Cairo': ['New Cairo', 'Maadi', 'Nasr City', 'Heliopolis', 'Shoubra', 'Zamalek', 'Sheraton', 'El Rehab', 'Madinaty', 'Hadayek El-Kobba', 'Cairo City'],
  'Giza': ['6th of October', 'Sheikh Zayed', 'Haram', 'Faisal', 'Dokki', 'Mohandessin', 'Imbaba', 'Giza City'],
  'Alexandria': ['Sidi Bishr', 'Smouha', 'Miami', 'Montaza', 'Maamoura', 'Roushdy', 'Glim', 'Alexandria City'],
  'Qalyubia': ['Banha', 'Shubra El-Kheima', 'Qalyub', 'Khanka', 'Qaha'],
  'Gharbia': ['Tanta', 'Kafr El-Zayat', 'El Mahalla El-Kubra', 'Zifta'],
  'Monufia': ['Shibin El Kom', 'Sadat City', 'Ashmoun', 'Menouf'],
  'Sharqia': ['Zagazig', '10th of Ramadan', 'Belbeis', 'Minya El-Qamh'],
  'Dakahlia': ['Mansoura', 'Talkha', 'Mit Ghamr', 'Senbellawein'],
  'Damietta': ['Damietta City', 'New Damietta', 'Ras El Bar'],
  'Beheira': ['Damanhour', 'Kafr El Dawar', 'Kom Hamada', 'Rashid'],
  'Kafr El Sheikh': ['Kafr El Sheikh City', 'Desouk', 'Metoubes', 'Baltim'],
  'Matrouh': ['Marsa Matrouh', 'Siwa', 'El Alamein'],
  'Port Said': ['Port Said City', 'Port Fouad'],
  'Ismailia': ['Ismailia City', 'Fayed', 'El Qantara'],
  'Suez': ['Suez City', 'Ain Sokhna'],
  'North Sinai': ['Arish', 'Sheikh Zuweid'],
  'South Sinai': ['Sharm El Sheikh', 'Dahab', 'Nuweiba', 'Tor'],
  'Faiyum': ['Faiyum City', 'Sinnuris', 'Ibshaway'],
  'Beni Suef': ['Beni Suef City', 'New Beni Suef', 'Beba'],
  'Minya': ['Minya City', 'Mallawi', 'Samalut'],
  'Asyut': ['Asyut City', 'Dairut', 'Manfalut'],
  'Sohag': ['Sohag City', 'Akhmim', 'Girga'],
  'Qena': ['Qena City', 'Nag Hammadi', 'Deshna'],
  'Luxor': ['Luxor City', 'Esna', 'Armant'],
  'Aswan': ['Aswan City', 'Kom Ombo', 'Edfu'],
  'Red Sea': ['Hurghada', 'El Gouna', 'Safaga', 'Marsa Alam'],
  'New Valley': ['Kharga', 'Dakhla', 'Farafra']
};


export default function CandidatesPool(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Requisitions list (for dropdowns)
  const [hiringRequests, setHiringRequests] = useState([]);
  const [recruitmentRoles, setRecruitmentRoles] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);

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
    Source: 'Job Board',
    Government: '',
    City: '',
    Address: '',
    DateOfBirth: '',
    ExpectedJoiningDate: '',
    ExpectedSalary: '',
    EducationDetails: {
      Degree: '',
      University: '',
      Major: '',
      GraduationYear: '',
      Grade: ''
    },
    WorkExperienceDetails: []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [activeDrawerTab, setActiveDrawerTab] = useState('details'); // 'details', 'attachments', 'interviews', or 'history'

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCandidateID, setRejectCandidateID] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Delay/Cancel Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusFormData, setStatusFormData] = useState({
    InterviewID: '',
    InterviewState: 3, // 3: Delayed, 4: Canceled
    DelayCancelReason: ''
  });

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

  // Reassign Requisition Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignFormData, setReassignFormData] = useState({
    CandidateID: '',
    RequestID: ''
  });

  // Job Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    CandidateID: '',
    ProposedSalary: '',
    ProposedStartDate: '',
    OfferTerms: ''
  });

  // Test Assignment State
  const [assignedTests, setAssignedTests] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [showAssignTestModal, setShowAssignTestModal] = useState(false);
  const [assignTestFormData, setAssignTestFormData] = useState({
    CandidateID: '',
    TestID: ''
  });

  // Expanded Interviews state (click on details to show feedback/ratings)
  const [expandedInterviews, setExpandedInterviews] = useState({});

  const toggleInterviewDetails = (id) => {
    setExpandedInterviews(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Answer Breakdown Modal State
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedAnswerTest, setSelectedAnswerTest] = useState(null);
  const [modalQuestions, setModalQuestions] = useState([]);
  const [loadingAnswerDetails, setLoadingAnswerDetails] = useState(false);

  async function handleOpenAnswerModal(testItem) {
    setSelectedAnswerTest(testItem);
    setShowAnswerModal(true);
    setLoadingAnswerDetails(true);

    let parsedQuestions = [];
    if (testItem.AnswersDetails) {
      try {
        parsedQuestions = typeof testItem.AnswersDetails === 'string'
          ? JSON.parse(testItem.AnswersDetails)
          : testItem.AnswersDetails;
      } catch (e) {}
    }

    if (parsedQuestions && Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
      setModalQuestions(parsedQuestions);
      setLoadingAnswerDetails(false);
    } else {
      try {
        const res = await apiCall('GetTestQuestions', { TestID: testItem.TestID }, {}, 'recruitment_tests');
        if (res.State === 0 || res.List0) {
          const fetchedQs = (res.List0 || []).map(q => ({
            ...q,
            SelectedAnswer: null,
            IsCorrect: null
          }));
          setModalQuestions(fetchedQs);
        }
      } catch (err) {
        console.error('Failed to load test questions:', err);
      } finally {
        setLoadingAnswerDetails(false);
      }
    }
  }

  useEffect(() => {
    loadData();
    loadHiringRequests();
    loadRecruitmentRoles();
    loadSystemUsers();
    loadAvailableTests();
  }, []);

  async function loadAvailableTests() {
    try {
      const res = await apiCall('GetRecruitmentTests', {}, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setAvailableTests(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load available tests:', e);
    }
  }

  async function loadAssignedTests(candidateId) {
    if (!candidateId) return;
    try {
      const res = await apiCall('GetCandidateAssignedTests', { CandidateID: candidateId }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setAssignedTests(res.List0 || []);
      }
    } catch (err) {
      console.error('Failed to load assigned tests:', err);
    }
  }

  async function handleAssignTestSubmit(e) {
    e.preventDefault();
    if (!assignTestFormData.TestID) return alert('Please select a test.');
    setSubmitting(true);
    try {
      const res = await apiCall('AssignCandidateTest', {
        CandidateID: Number(assignTestFormData.CandidateID),
        TestID: Number(assignTestFormData.TestID)
      }, {}, 'recruitment_tests');
      
      if (res.State === 0) {
        setShowAssignTestModal(false);
        if (selectedCandidate) {
          loadAssignedTests(selectedCandidate.CandidateID);
        }
      } else {
        alert(res.Message || 'Failed to assign test.');
      }
    } catch (err) {
      alert('Error assigning test: ' + err.message);
    }
    setSubmitting(false);
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

  async function loadInterviewsAndHistory(candidateId) {
    if (!candidateId) return;
    loadAssignedTests(candidateId);
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

  async function handleGeneratePIN() {
    if (!selectedCandidate) return;
    try {
      const res = await apiCall('GenerateCandidateAccessCode', { CandidateID: selectedCandidate.CandidateID }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        const pin = res.List0[0].AccessPassword;
        setSelectedCandidate(prev => ({ ...prev, AccessPassword: pin }));
        setRows(prevRows => prevRows.map(r => r.CandidateID === selectedCandidate.CandidateID ? { ...r, AccessPassword: pin } : r));
        alert(`Access PIN generated for ${selectedCandidate.FullName}: ${pin}`);
      } else {
        alert(res.Message || 'Failed to generate access code.');
      }
    } catch (e) {
      alert('Error generating PIN: ' + e.message);
    }
  }

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
        if (selectedCandidate) {
          loadInterviewsAndHistory(selectedCandidate.CandidateID);
        }
        loadData();
      } else {
        alert(res.Message || 'Failed to update interview status.');
      }
    } catch (err) {
      alert('Error updating interview: ' + err.message);
    }
    setSubmitting(false);
  }

  async function loadRecruitmentRoles() {
    try {
      const res = await apiCall('Get Recruitment User Roles', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        setRecruitmentRoles(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load recruitment roles:', e);
    }
  }

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
          const excludedKeys = [
            'CVFileContent',
            'CVFileName',
            'CandidateID',
            'RequestID',
            'RejectionReason',
            'CreatedBy',
            'Government',
            'City',
            'Address',
            'Department',
            'Summary'
          ];
          const keys = Object.keys(list[0]).filter(k => !excludedKeys.includes(k));
          const cols = keys.map(k => {
            let label = k.replace(/([A-Z])/g, ' $1').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);
            if (k === 'PositionTitle') {
              label = 'Requested Position';
            }
            return {
              key: k,
              label,
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
                  const cvUrl = row.CVFileContent;
                  if (cvUrl && cvUrl.trim().startsWith('[')) {
                    try {
                      const files = JSON.parse(cvUrl);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
                          {files.map((file, idx) => (
                            <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                              📄 Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      );
                    } catch (err) {}
                  }
                  if (cvUrl && cvUrl.startsWith('http')) {
                    return (
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        📄 View CV
                      </a>
                    );
                  }
                  return (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                      📄 View CV
                    </span>
                  );
                }
                if (k.toLowerCase().endsWith('date') && val) {
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

          // Move PositionTitle (Requested Position) right after FullName
          const posColIndex = cols.findIndex(c => c.key === 'PositionTitle');
          if (posColIndex > -1) {
            const [posCol] = cols.splice(posColIndex, 1);
            const fullNameIndex = cols.findIndex(c => c.key === 'FullName');
            if (fullNameIndex > -1) {
              cols.splice(fullNameIndex + 1, 0, posCol);
            } else {
              cols.splice(2, 0, posCol);
            }
          }

          setColumns(cols);
        }
        setLoading(false);
        return list;
      } else {
        setError(res.Message || 'Failed to retrieve candidates.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  const handleAddExperience = () => {
    setFormData(prev => ({
      ...prev,
      WorkExperienceDetails: [
        ...(Array.isArray(prev.WorkExperienceDetails) ? prev.WorkExperienceDetails : []),
        { CompanyName: '', JobTitle: '', StartDate: '', EndDate: '', IsCurrent: false, Responsibilities: '', ReasonForLeaving: '' }
      ]
    }));
  };

  const handleUpdateExperience = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(Array.isArray(prev.WorkExperienceDetails) ? prev.WorkExperienceDetails : [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, WorkExperienceDetails: updated };
    });
  };

  const handleRemoveExperience = (index) => {
    setFormData(prev => {
      const updated = [...(Array.isArray(prev.WorkExperienceDetails) ? prev.WorkExperienceDetails : [])];
      updated.splice(index, 1);
      return { ...prev, WorkExperienceDetails: updated };
    });
  };

  async function handleSaveCandidate(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    if (!formData.Government) {
      setModalError('Government (Governorate) is required.');
      setSubmitting(false);
      return;
    }
    if (!formData.City) {
      setModalError('City is required.');
      setSubmitting(false);
      return;
    }
    try {
      let finalCVFileContent = formData.CVFileContent;
      let finalCVFileName = formData.CVFileName;
      
      if (selectedFiles.length > 0) {
        setModalError(`Uploading ${selectedFiles.length} file(s) to Cloudinary...`);
        try {
          const uploadedList = [];
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setModalError(`Uploading file ${i + 1} of ${selectedFiles.length}: ${file.name}...`);
            const secureUrl = await uploadToCloudinary(file);
            uploadedList.push({ name: file.name, url: secureUrl });
          }
          finalCVFileContent = JSON.stringify(uploadedList);
          finalCVFileName = selectedFiles.map(f => f.name).join(', ');
        } catch (uploadErr) {
          setModalError('Failed to upload files: ' + uploadErr.message);
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        CVFileName: finalCVFileName,
        CVFileContent: finalCVFileContent,
        RequestID: Number(formData.RequestID),
        DateOfBirth: formData.DateOfBirth || null,
        ExpectedJoiningDate: formData.ExpectedJoiningDate || null,
        ExpectedSalary: formData.ExpectedSalary || null,
        EducationDetails: typeof formData.EducationDetails === 'object' ? JSON.stringify(formData.EducationDetails) : formData.EducationDetails,
        WorkExperienceDetails: Array.isArray(formData.WorkExperienceDetails) ? JSON.stringify(formData.WorkExperienceDetails) : formData.WorkExperienceDetails
      };

      const res = await apiCall('Save Candidate', payload, {}, 'recruitment_requests');
      if (res.State === 0) {
        setShowAddModal(false);
        setSelectedFiles([]);
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

  const getInterviewerOptions = () => {
    const cand = rows.find(r => String(r.CandidateID) === String(interviewFormData.CandidateID));
    const dept = cand?.Department;
    
    if (interviewFormData.RoundNumber === '1') {
      return recruitmentRoles.filter(r => r.RoleName === 'HR Responsible');
    }
    
    // Non-HR interview -> Department Managers matching candidate department
    const deptManagers = recruitmentRoles.filter(r => r.RoleName === 'Department Manager' && r.Department === dept);
    if (deptManagers.length > 0) {
      return deptManagers;
    }
    
    // Fallback: all Department Managers
    const allManagers = recruitmentRoles.filter(r => r.RoleName === 'Department Manager');
    if (allManagers.length > 0) {
      return allManagers;
    }

    // Fallback: all recruitment roles
    return recruitmentRoles;
  };

  async function handleInterviewSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const minutes = new Date(interviewFormData.ScheduledDate).getMinutes();
      if (minutes !== 0 && minutes !== 30) {
        alert('Please select an interview time that falls on the hour (e.g., 10:00) or half-hour (e.g., 10:30). Minutes must be 00 or 30.');
        setSubmitting(false);
        return;
      }

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
        if (selectedCandidate) {
          loadInterviews(selectedCandidate.CandidateID);
        }
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
        loadInterviewsAndHistory(Number(reassignFormData.CandidateID));
        // Update selectedCandidate context if the drawer is open
        if (selectedCandidate && selectedCandidate.CandidateID === Number(reassignFormData.CandidateID)) {
          const updatedReq = hiringRequests.find(h => h.RequestID === Number(reassignFormData.RequestID));
          setSelectedCandidate(prev => ({
            ...prev,
            RequestID: Number(reassignFormData.RequestID),
            PositionTitle: updatedReq ? updatedReq.PositionTitle : prev.PositionTitle,
            Department: updatedReq ? updatedReq.Department : prev.Department,
            CandidateState: 1, // reset to Shortlisted
            RejectionReason: null
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

  // Handle local file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const parseAISummary = (text) => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      let cleanLine = line.replace(/^[-*]\s*(✨)?\s*/, '').trim();
      const boldRegex = /^\*\*(.*?)\*\*[:\s]*/;
      const match = cleanLine.match(boldRegex);
      if (match) {
        const fullLabel = match[1].trim();
        let rest = cleanLine.substring(match[0].length).trim();
        rest = rest.replace(/^[—\-\s:]+/, '').trim();
        const scoreRegex = /(\d+(?:\.\d+)?\s*\/\s*10)/;
        const scoreMatch = fullLabel.match(scoreRegex);
        if (scoreMatch) {
          const scoreVal = scoreMatch[1];
          const cleanLabel = fullLabel.replace(scoreRegex, '').replace(/[:\s]+$/, '').trim();
          return { label: cleanLabel || 'Suitability Score', score: scoreVal, text: rest };
        }
        return { label: fullLabel, text: rest };
      }
      return { label: '', text: cleanLine };
    });
  };

  const handleCopySummary = (summary) => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    alert('AI Summary copied to clipboard!');
  };

  const [summarizing, setSummarizing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [translatedSummaries, setTranslatedSummaries] = useState({});

  async function handleAISummarize(candidateID) {
    let apiKey = await getAnthropicAPIKey();
    if (!apiKey) {
      apiKey = window.prompt("Please enter your Anthropic API Key to call Claude AI:");
      if (!apiKey || !apiKey.trim()) return;
      localStorage.setItem('Anthropic_API_Key', apiKey.trim());
    }

    setSummarizing(true);
    try {
      // Find candidate details
      const cand = rows.find(c => c.CandidateID === candidateID) || selectedCandidate;
      if (!cand) {
        throw new Error("Candidate data not found.");
      }

      let attachments = [];
      if (cand.CVFileContent && cand.CVFileContent.trim().startsWith('[')) {
        try {
          attachments = JSON.parse(cand.CVFileContent);
        } catch (e) {}
      } else if (cand.CVFileContent && cand.CVFileName) {
        attachments = [{ name: cand.CVFileName, url: cand.CVFileContent }];
      }

      let fileBase64 = null;
      let fileType = "application/pdf";

      if (attachments.length > 0) {
        const cvFile = attachments[0];
        try {
          const resFile = await fetch(cvFile.url);
          const blob = await resFile.blob();
          fileType = blob.type || "application/pdf";

          const base64Promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          fileBase64 = await base64Promise;
        } catch (fileErr) {
          console.warn("Failed to download CV file contents for direct AI extraction:", fileErr);
        }
      }

      const contentBlocks = [];

      if (fileBase64 && fileType === 'application/pdf') {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: fileBase64
          }
        });
      }

      contentBlocks.push({
        type: 'text',
        text: `Job Requisition Details:
Position Title: ${cand.PositionTitle}
Department: ${cand.Department}
Job Description: ${cand.JobDescription || '—'}
Required Skills: ${cand.RequiredSkills || '—'}

Please summarize this candidate's profile based on their CV and evaluate their fit for this job requisition.`
      });

      const url = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/anthropic-api/v1/messages'
        : 'https://api.anthropic.com/v1/messages';

      let modelsToTry = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307'
      ];

      try {
        console.log("Fetching available models from Anthropic API...");
        const modelsRes = await fetch((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? '/anthropic-api/v1/models'
          : 'https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          }
        });
        if (modelsRes.ok) {
          const modelsJson = await modelsRes.json();
          if (modelsJson.data && modelsJson.data.length > 0) {
            const apiModelIds = modelsJson.data.map(m => m.id);
            console.log("API returned models:", apiModelIds);
            const sonnetModels = apiModelIds.filter(id => id.toLowerCase().includes('sonnet'));
            const haikuModels = apiModelIds.filter(id => id.toLowerCase().includes('haiku'));
            const otherModels = apiModelIds.filter(id => !id.toLowerCase().includes('sonnet') && !id.toLowerCase().includes('haiku'));
            modelsToTry = [...sonnetModels, ...haikuModels, ...otherModels];
            console.log("Will attempt models in this order:", modelsToTry);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch model list, using hardcoded fallback list:", e);
      }

      let lastError = null;
      let summaryText = '';

      for (const currentModel of modelsToTry) {
        try {
          console.log(`Attempting to summarize candidate profile using Claude model: ${currentModel}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: currentModel,
              max_tokens: 600,
              system: "You are a professional HR recruiter assistant. Analyze the candidate's CV/Resume and the target Job Description. Generate a brief, concise candidate profile summary. You MUST extract and include the candidate's Age (or birth year, if specified), Governorate/State, City, and University/Education name from their CV (state 'Not specified' for any missing value), alongside their main tech stack, experience level, key achievements, and suitability score (0-10) for this specific role. Format the output with clean markdown bullet points starting with ✨. Keep the total length under 150 words.",
              messages: [
                {
                  role: 'user',
                  content: contentBlocks
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            let parsedErr;
            try {
              parsedErr = JSON.parse(errText);
            } catch (e) {}

            if (response.status === 404 && parsedErr?.error?.type === 'not_found_error') {
              console.warn(`Model ${currentModel} not found or not available. Trying fallback...`);
              lastError = new Error(`Claude API error (${response.status}): ${errText}`);
              continue;
            }
            throw new Error(`Claude API error (${response.status}): ${errText}`);
          }

          const json = await response.json();
          summaryText = json.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join('') || '';
          break;
        } catch (loopErr) {
          lastError = loopErr;
          if (!loopErr.message.includes('not_found_error') && !loopErr.message.includes('404')) {
            throw loopErr;
          }
        }
      }

      if (!summaryText.trim()) {
        try {
          console.log("Failed to find a working model. Fetching available models for this API key...");
          const modelsRes = await fetch((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/anthropic-api/v1/models'
            : 'https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            }
          });
          if (modelsRes.ok) {
            const modelsJson = await modelsRes.json();
            console.log("Available models for this API key:", modelsJson.data);
            const modelIds = modelsJson.data?.map(m => m.id).join(', ');
            lastError = new Error(`${lastError.message}\n\nAvailable models for your API key: ${modelIds || 'None'}`);
          }
        } catch (diagErr) {
          console.error("Failed to fetch available models list:", diagErr);
        }
        throw lastError || new Error("No summary returned from Claude AI.");
      }

      // Save summary in database
      const saveRes = await apiCall('Save Candidate Summary', {
        CandidateID: Number(candidateID),
        Summary: summaryText
      }, {}, 'recruitment_requests');

      if (saveRes.State === 0) {
        const freshList = await loadData();
        const updatedCand = freshList?.find(c => c.CandidateID === candidateID);
        if (updatedCand) {
          setSelectedCandidate(updatedCand);
        } else {
          setSelectedCandidate(prev => ({ ...prev, Summary: summaryText }));
        }
        alert('Candidate profile summarized successfully by Claude!');
      } else {
        throw new Error(saveRes.Message || 'Failed to save summary to database.');
      }
    } catch (err) {
      console.error("Claude Summary failure:", err);
      alert("Failed to summarize profile with Claude: " + err.message);
    } finally {
      setSummarizing(false);
    }
  }

  async function handleTranslateSummary() {
    if (!selectedCandidate || !selectedCandidate.Summary) return;
    
    if (activeLanguage === 'ar') {
      setActiveLanguage('en');
      return;
    }

    const candidateID = selectedCandidate.CandidateID;

    if (translatedSummaries[candidateID]) {
      setActiveLanguage('ar');
      return;
    }

    let apiKey = await getAnthropicAPIKey();
    if (!apiKey) {
      apiKey = window.prompt("Please enter your Anthropic API Key to call Claude AI:");
      if (!apiKey || !apiKey.trim()) return;
      localStorage.setItem('Anthropic_API_Key', apiKey.trim());
    }

    setTranslating(true);

    try {
      const promptText = `Please translate the following candidate profile summary into professional, clear business Arabic. Retain all markdown formatting (bold text and bullet points starting with ✨) exactly as they are. Keep the translated lines aligned to the original structure.

English Summary:
${selectedCandidate.Summary}`;

      const url = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/anthropic-api/v1/messages'
        : 'https://api.anthropic.com/v1/messages';

      let modelsToTry = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307'
      ];

      try {
        const modelsRes = await fetch((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? '/anthropic-api/v1/models'
          : 'https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          }
        });
        if (modelsRes.ok) {
          const modelsJson = await modelsRes.json();
          if (modelsJson.data && modelsJson.data.length > 0) {
            const apiModelIds = modelsJson.data.map(m => m.id);
            const sonnetModels = apiModelIds.filter(id => id.toLowerCase().includes('sonnet'));
            const haikuModels = apiModelIds.filter(id => id.toLowerCase().includes('haiku'));
            const otherModels = apiModelIds.filter(id => !id.toLowerCase().includes('sonnet') && !id.toLowerCase().includes('haiku'));
            modelsToTry = [...sonnetModels, ...haikuModels, ...otherModels];
          }
        }
      } catch (e) {
        console.warn("Failed to fetch model list, using hardcoded fallback list:", e);
      }

      let lastError = null;
      let translatedText = '';

      for (const currentModel of modelsToTry) {
        try {
          console.log(`Attempting translation using Claude model: ${currentModel}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: currentModel,
              max_tokens: 600,
              system: "You are a professional translator. Translate the provided text into clear business Arabic. Make sure to keep all markdown bullet points starting with ✨ and bold phrases exactly intact. Do not add any introductory or concluding conversational filler text, just return the translated text.",
              messages: [
                {
                  role: 'user',
                  content: promptText
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            let parsedErr;
            try {
              parsedErr = JSON.parse(errText);
            } catch (e) {}

            if (response.status === 404 && parsedErr?.error?.type === 'not_found_error') {
              console.warn(`Model ${currentModel} not found or not available. Trying fallback...`);
              lastError = new Error(`Claude API error (${response.status}): ${errText}`);
              continue;
            }
            throw new Error(`Claude API error (${response.status}): ${errText}`);
          }

          const json = await response.json();
          translatedText = json.content
            ?.filter(block => block.type === 'text')
            ?.map(block => block.text)
            ?.join('') || '';
          break;
        } catch (loopErr) {
          lastError = loopErr;
          if (!loopErr.message.includes('not_found_error') && !loopErr.message.includes('404')) {
            throw loopErr;
          }
        }
      }

      if (!translatedText.trim()) {
        throw lastError || new Error("No translation returned from Claude AI.");
      }

      setTranslatedSummaries(prev => ({ ...prev, [candidateID]: translatedText }));
      setActiveLanguage('ar');
    } catch (err) {
      console.error("Claude Translation failure:", err);
      alert("Failed to translate summary with Claude: " + err.message);
    } finally {
      setTranslating(false);
    }
  }

  const renderDetailDrawer = () => {
    if (!selectedCandidate) return null;

    const states = {
      0: { text: 'New', color: 'var(--blue)', bg: 'var(--blue-soft)' },
      1: { text: 'Shortlisted', color: 'var(--orange)', bg: 'var(--orange-soft)' },
      2: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
      3: { text: 'Interviewing', color: '#6366f1', bg: '#e0e7ff' },
      4: { text: 'Selected', color: 'var(--green)', bg: 'var(--green-soft)' },
      5: { text: 'On Hold', color: 'var(--muted)', bg: 'var(--soft)' },
      6: { text: 'Hired', color: 'var(--green)', bg: 'var(--green-soft)' }
    };

    const state = states[selectedCandidate.CandidateState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
    const initials = selectedCandidate.FullName ? selectedCandidate.FullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';

    let attachments = [];
    if (selectedCandidate.CVFileContent && selectedCandidate.CVFileContent.trim().startsWith('[')) {
      try {
        attachments = JSON.parse(selectedCandidate.CVFileContent);
      } catch (e) {}
    } else if (selectedCandidate.CVFileContent && selectedCandidate.CVFileName) {
      attachments = [{ name: selectedCandidate.CVFileName, url: selectedCandidate.CVFileContent }];
    }

    const handleDownloadCV = (file) => {
      if (file.url.startsWith('http')) {
        window.open(file.url, '_blank');
        return;
      }
      try {
        const byteCharacters = atob(file.url);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert('Failed to download CV.');
      }
    };

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
          width: 'min(980px, 100vw)',
          height: '100vh',
          background: 'var(--surface)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.12)',
          borderLeft: '1px solid var(--border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 24px 24px 24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Candidate Details</h3>
            <button onClick={() => setShowDetailDrawer(false)} style={{ background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'var(--muted)', fontWeight: 'bold' }}>&times;</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
              {selectedCandidate.ProfilePhoto ? (
                <img
                  src={selectedCandidate.ProfilePhoto}
                  alt="Avatar"
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {selectedCandidate.FullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: state.color, background: state.bg, padding: '3px 8px', borderRadius: 6 }}>
                    {state.text}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>ID: #{selectedCandidate.CandidateID}</span>
                  {selectedCandidate.ExpectedSalary && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', background: 'var(--green-soft)', padding: '2px 8px', borderRadius: 6 }}>
                      Expected: {selectedCandidate.ExpectedSalary}
                    </span>
                  )}
                  {assignedTests.filter(t => t.Score !== null && t.Score !== undefined).map((t, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 800, color: t.Score >= 60 ? 'var(--green)' : 'var(--red)', background: t.Score >= 60 ? 'var(--green-soft)' : 'var(--red-soft)', padding: '2px 8px', borderRadius: 6 }}>
                      📝 {t.TestTitle}: {t.Score}%
                    </span>
                  ))}
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
                📅 Interviews
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
                onClick={() => setActiveDrawerTab('tests')}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: activeDrawerTab === 'tests' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  color: activeDrawerTab === 'tests' ? 'var(--primary)' : 'var(--muted)',
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
                📝 Tests
                <span style={{
                  fontSize: 10,
                  background: activeDrawerTab === 'tests' ? 'var(--primary)' : 'var(--border2)',
                  color: activeDrawerTab === 'tests' ? '#fff' : 'var(--muted)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 800,
                  marginLeft: 2
                }}>
                  {assignedTests.length}
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

            {/* Tab Contents */}
            {activeDrawerTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* AI Summary Card Section */}
                {selectedCandidate.Summary ? (() => {
                  const displayText = activeLanguage === 'ar' 
                    ? (translatedSummaries[selectedCandidate.CandidateID] || selectedCandidate.Summary) 
                    : selectedCandidate.Summary;
                  const items = parseAISummary(displayText);
                  return (
                    <div className="ai-summary-card">
                      <div className="ai-summary-header">
                        <div className="ai-summary-title">
                          <span>✨ AI Candidate Summary</span>
                        </div>
                        <div className="ai-summary-actions">
                          <button 
                            type="button" 
                            disabled={translating}
                            onClick={handleTranslateSummary}
                            className="ai-summary-action-btn"
                            title={activeLanguage === 'ar' ? "Show English summary" : "Translate summary to Arabic"}
                          >
                            {translating ? '⏳ Translating...' : activeLanguage === 'ar' ? '🌐 English' : '🌐 Translate to Arabic'}
                          </button>
                          <button 
                            type="button" 
                            disabled={summarizing}
                            onClick={() => handleAISummarize(selectedCandidate.CandidateID)}
                            className="ai-summary-action-btn"
                            title="Summarize candidate profile again"
                          >
                            {summarizing ? '⏳ Summarizing...' : '🔄 Summarize Again'}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleCopySummary(displayText)}
                            className="ai-summary-action-btn"
                            title="Copy Summary to Clipboard"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                      <div className="ai-summary-content" style={{ direction: activeLanguage === 'ar' ? 'rtl' : 'ltr', textAlign: activeLanguage === 'ar' ? 'right' : 'left' }}>
                        {items.map((item, idx) => {
                          const isScore = item.label.toLowerCase().includes('score') || !!item.score;
                          return (
                            <div 
                              key={idx} 
                              className={`ai-summary-row ${isScore ? 'ai-summary-badge-row' : ''}`}
                            >
                              <div className="ai-summary-bullet">✨</div>
                              <div style={{ flex: 1 }}>
                                {item.label && (
                                  <span className="ai-summary-row-label">
                                    {item.label}
                                    {item.score ? (
                                      <span className="ai-summary-score-badge">
                                        {item.score}
                                      </span>
                                    ) : ':'}
                                  </span>
                                )}
                                <span className="ai-summary-row-text">
                                  {item.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button 
                      type="button"
                      disabled={summarizing}
                      onClick={() => handleAISummarize(selectedCandidate.CandidateID)}
                      style={{ 
                        width: '100%', 
                        height: 40, 
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', 
                        color: '#fff', 
                        border: 0, 
                        borderRadius: 12, 
                        fontWeight: 800, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 8, 
                        fontSize: 13, 
                        boxShadow: '0 4px 12px rgba(124,58,237,0.15)',
                        transition: 'opacity 0.15s'
                      }}
                    >
                      {summarizing ? (
                        <>
                          <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'dg-spin 0.8s linear infinite' }} />
                          Generating Summary...
                        </>
                      ) : (
                        <>✨ Summarize Profile with Claude AI</>
                      )}
                    </button>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>General Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Email Address</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Phone Number</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Phone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600, alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Portal Access PIN</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: selectedCandidate.AccessPassword ? 'var(--primary)' : 'var(--muted)', fontWeight: 800, fontFamily: 'monospace' }}>
                          {selectedCandidate.AccessPassword || 'Not Generated'}
                        </span>
                        <button
                          type="button"
                          onClick={handleGeneratePIN}
                          style={{
                            background: 'var(--soft)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🔑 Generate PIN
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600, alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Requisition</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text)' }}>{selectedCandidate.PositionTitle}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReassignFormData({
                              CandidateID: String(selectedCandidate.CandidateID),
                              RequestID: String(selectedCandidate.RequestID)
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
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Department || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Source</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Source}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Government</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Government || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>City</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.City || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Address</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.Address || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Registered By</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.CreatedBy}</span>
                    </div>
                    {selectedCandidate.DateOfBirth && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Date of Birth</span>
                        <span style={{ color: 'var(--text)' }}>{new Date(selectedCandidate.DateOfBirth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedCandidate.ExpectedJoiningDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Expected Joining Date</span>
                        <span style={{ color: 'var(--text)' }}>{new Date(selectedCandidate.ExpectedJoiningDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedCandidate.ExpectedSalary && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Expected Salary</span>
                        <span style={{ color: 'var(--green)', fontWeight: 800 }}>{selectedCandidate.ExpectedSalary}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--muted)' }}>Created Date</span>
                      <span style={{ color: 'var(--text)' }}>{selectedCandidate.CreatedDate ? new Date(selectedCandidate.CreatedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Education Section */}
                {(() => {
                  if (!selectedCandidate.EducationDetails) return null;
                  try {
                    const edu = typeof selectedCandidate.EducationDetails === 'string' ? JSON.parse(selectedCandidate.EducationDetails) : selectedCandidate.EducationDetails;
                    if (!edu || (!edu.Degree && !edu.University)) return null;

                    return (
                      <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                          🎓 Education Background
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, fontWeight: 600 }}>
                          <div><span style={{ color: 'var(--muted)' }}>Qualification:</span> {edu.Degree || '—'}</div>
                          <div><span style={{ color: 'var(--muted)' }}>University:</span> {edu.University || '—'}</div>
                          <div><span style={{ color: 'var(--muted)' }}>Major:</span> {edu.Major || '—'}</div>
                          <div><span style={{ color: 'var(--muted)' }}>Graduation Year:</span> {edu.GraduationYear || '—'}</div>
                          {edu.Grade && <div><span style={{ color: 'var(--muted)' }}>Grade / GPA:</span> {edu.Grade}</div>}
                        </div>
                      </div>
                    );
                  } catch (e) { return null; }
                })()}

                {/* Work Experience Section */}
                {(() => {
                  if (!selectedCandidate.WorkExperienceDetails) return null;
                  try {
                    const exps = typeof selectedCandidate.WorkExperienceDetails === 'string' ? JSON.parse(selectedCandidate.WorkExperienceDetails) : selectedCandidate.WorkExperienceDetails;
                    if (!Array.isArray(exps) || exps.length === 0) return null;

                    return (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                          💼 Work Experience History ({exps.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {exps.map((w, idx) => (
                            <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                                  {w.JobTitle} @ {w.CompanyName}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: w.IsCurrent ? 'var(--green)' : 'var(--muted)', background: w.IsCurrent ? 'var(--green-soft)' : 'var(--soft)', padding: '2px 8px', borderRadius: 6 }}>
                                  {w.IsCurrent ? 'Current Job' : `${w.StartDate || '—'} to ${w.EndDate || '—'}`}
                                </span>
                              </div>
                              {w.Responsibilities && (
                                <p style={{ margin: '6px 0 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                                  {w.Responsibilities}
                                </p>
                              )}
                              {w.ReasonForLeaving && (
                                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                                  Reason for leaving: {w.ReasonForLeaving}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch (e) { return null; }
                })()}

                {selectedCandidate.RejectionReason && (
                  <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', marginBottom: 4, textTransform: 'uppercase' }}>Disqualification Details</div>
                    <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>"{selectedCandidate.RejectionReason}"</p>
                  </div>
                )}

                {/* Interviewer Feedback & Comments at bottom of Details tab */}
                {(() => {
                  const completedInts = interviews.filter(i => i.FeedbackComments || i.Rating);
                  if (completedInts.length === 0) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        💬 Interviewer Feedback & Comments ({completedInts.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {completedInts.map((inv, idx) => {
                          const roundNames = { 1: 'HR Round', 2: 'Technical Round', 3: 'Manager Round', 4: 'Final Round' };
                          const rName = roundNames[inv.RoundNumber] || `Round ${inv.RoundNumber}`;

                          return (
                            <div key={idx} style={{
                              background: 'var(--soft)',
                              border: '1px solid var(--border)',
                              borderRadius: 14,
                              padding: 14,
                              borderLeft: '4px solid var(--primary)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                                  {rName} — Interviewer: {inv.InterviewerUser || 'Unassigned'}
                                </span>
                                {inv.Rating && (
                                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--amber)' }}>
                                    ⭐ {inv.Rating} / 10
                                  </span>
                                )}
                              </div>
                              {inv.FeedbackComments && (
                                <p style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                                  "{inv.FeedbackComments}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeDrawerTab === 'attachments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Uploaded Attachments ({attachments.length})</div>
                {attachments.length === 0 ? (
                  <div style={{ padding: '24px 12px', background: 'var(--soft)', border: '1px dotted var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    📂 No files uploaded for this candidate.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {attachments.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', boxShadow: 'var(--shadow)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, marginRight: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📄 {file.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Attachment #{idx + 1}</span>
                        </div>
                        <button type="button" onClick={() => handleDownloadCV(file)} style={{ height: 32, padding: '0 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, fontSize: 12, fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          Open File
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === 'interviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Interview History ({interviews.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFormData({ CandidateID: selectedCandidate.CandidateID, RequestID: selectedCandidate.RequestID || '', RoundNumber: 1, InterviewerUser: '', ScheduledDate: '' });
                      setShowScheduleModal(true);
                    }}
                    style={{
                      background: 'var(--primary-soft)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Schedule Round
                  </button>
                </div>

                {interviews.length === 0 ? (
                  <div style={{ padding: '36px 16px', background: 'var(--soft)', border: '1.5px dashed var(--border)', borderRadius: 16, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                    No interview rounds scheduled yet for this candidate.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {interviews.map((item, idx) => {
                      const roundLabels = {
                        1: { text: 'HR Round', icon: '👤', bg: 'var(--blue-soft)', color: 'var(--blue)' },
                        2: { text: 'Technical Round', icon: '⚡', bg: '#e0e7ff', color: '#6366f1' },
                        3: { text: 'Manager Round', icon: '💼', bg: 'var(--orange-soft)', color: 'var(--orange)' },
                        4: { text: 'Final Round', icon: '🏆', bg: 'var(--green-soft)', color: 'var(--green)' }
                      };
                      const rLbl = roundLabels[item.RoundNumber] || { text: `Round ${item.RoundNumber}`, icon: '📅', bg: 'var(--soft)', color: 'var(--muted)' };

                      const recs = {
                        0: { text: 'Proceed ✓', color: 'var(--green)', bg: 'var(--green-soft)' },
                        1: { text: 'Reject ❌', color: 'var(--red)', bg: 'var(--red-soft)' },
                        2: { text: 'Hold ⏸️', color: 'var(--muted)', bg: 'var(--soft)' }
                      };
                      const rec = recs[item.Recommendation];

                      const states = {
                        0: { text: 'Scheduled', dot: '●', color: 'var(--blue)', bg: 'var(--blue-soft)' },
                        1: { text: 'Completed', dot: '●', color: 'var(--text)', bg: 'var(--soft)' },
                        2: { text: 'Passed', dot: '●', color: 'var(--green)', bg: 'var(--green-soft)' },
                        3: { text: 'Delayed', dot: '●', color: 'var(--orange)', bg: 'var(--orange-soft)' },
                        4: { text: 'Canceled', dot: '●', color: 'var(--red)', bg: 'var(--red-soft)' }
                      };
                      const state = states[item.InterviewState] || { text: 'Unknown', dot: '●', color: 'var(--muted)', bg: 'var(--soft)' };

                      const reqTitle = item.PositionTitle ? `${item.PositionTitle}${item.Department ? ` (${item.Department})` : ''}` : (selectedCandidate?.PositionTitle ? `${selectedCandidate.PositionTitle}${selectedCandidate.Department ? ` (${selectedCandidate.Department})` : ''}` : '—');

                      return (
                        <div key={idx} style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 18,
                          padding: 18,
                          boxShadow: 'var(--shadow)',
                          transition: 'all 0.2s ease'
                        }}>
                          {/* Top Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontSize: 12,
                                fontWeight: 900,
                                padding: '4px 10px',
                                borderRadius: 8,
                                color: rLbl.color,
                                background: rLbl.bg,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                {rLbl.icon} {rLbl.text}
                              </span>
                            </div>
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 8,
                              color: state.color,
                              background: state.bg,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
                            }}>
                              <span style={{ fontSize: 9 }}>{state.dot}</span> {state.text}
                            </span>
                          </div>

                          {/* Metadata Grid */}
                          <div style={{
                            background: 'var(--soft)',
                            borderRadius: 14,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            fontSize: 12.5
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📋 Job Requisition:
                              </span>
                              <span style={{ color: 'var(--text)', fontWeight: 800 }}>
                                {reqTitle}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                👤 Interviewer:
                              </span>
                              <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                                {(() => {
                                  const sysUser = systemUsers.find(u => u.Username.toLowerCase() === (item.InterviewerUser || '').toLowerCase());
                                  return sysUser ? sysUser.Name : item.InterviewerUser;
                                })()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📅 Date & Time:
                              </span>
                              <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                                {item.ScheduledDate ? new Date(item.ScheduledDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                            {item.Rating !== null && item.Rating !== undefined && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  ⭐ Rating Score:
                                </span>
                                <span style={{ color: 'var(--amber)', fontWeight: 900, fontSize: 13.5 }}>
                                  ⭐ {item.Rating} / 10
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Scheduled Action Controls */}
                          {Number(item.InterviewState) === 0 ? (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedbackFormData({
                                    InterviewID: String(item.InterviewID),
                                    Rating: '8',
                                    FeedbackComments: item.FeedbackComments || '',
                                    Recommendation: String(item.Recommendation ?? 0)
                                  });
                                  setShowFeedbackModal(true);
                                }}
                                style={{
                                  flex: 1.3,
                                  height: 32,
                                  border: 0,
                                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                  color: '#fff',
                                  borderRadius: 8,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: 11.5,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4
                                }}
                              >
                                ⭐ Rate & Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusFormData({
                                    InterviewID: String(item.InterviewID),
                                    InterviewState: 3,
                                    DelayCancelReason: ''
                                  });
                                  setShowStatusModal(true);
                                }}
                                style={{
                                  flex: 1,
                                  height: 32,
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--text)',
                                  borderRadius: 8,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: 11.5,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4
                                }}
                              >
                                ⚠️ Delay
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusFormData({
                                    InterviewID: String(item.InterviewID),
                                    InterviewState: 4,
                                    DelayCancelReason: ''
                                  });
                                  setShowStatusModal(true);
                                }}
                                style={{
                                  flex: 1,
                                  height: 32,
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--red)',
                                  borderRadius: 8,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: 11.5,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4
                                }}
                              >
                                🚫 Cancel
                              </button>
                            </div>
                          ) : (
                            <div>
                              {/* Details Toggle Button */}
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleInterviewDetails(item.InterviewID)}
                                  style={{
                                    height: 28,
                                    padding: '0 12px',
                                    border: '1px solid var(--primary)',
                                    background: expandedInterviews[item.InterviewID] ? 'var(--soft)' : 'var(--primary-soft)',
                                    color: 'var(--primary)',
                                    borderRadius: 7,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontSize: 11.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  {expandedInterviews[item.InterviewID] ? '🔼 Hide Details' : '👁️ View Details'}
                                </button>
                              </div>

                              {/* Expanded Details Content */}
                              {expandedInterviews[item.InterviewID] && (
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                  {(Number(item.InterviewState) === 1 || Number(item.InterviewState) === 2) && (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Rating:</span>
                                          <span style={{ color: 'var(--amber)', fontWeight: 900, fontSize: 14, background: 'var(--soft)', padding: '3px 9px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            ⭐ {item.Rating} / 10
                                          </span>
                                        </div>
                                        {rec && (
                                          <span style={{ fontSize: 11.5, fontWeight: 900, padding: '4px 10px', borderRadius: 8, color: rec.color, background: rec.bg }}>
                                            {rec.text}
                                          </span>
                                        )}
                                      </div>
                                      {item.FeedbackComments && (
                                        <div style={{
                                          marginTop: 4,
                                          background: 'var(--soft)',
                                          padding: '10px 14px',
                                          borderRadius: 12,
                                          borderLeft: '4px solid var(--primary)',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                        }}>
                                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
                                            💬 Interviewer Feedback & Comments
                                          </div>
                                          <p style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                                            "{item.FeedbackComments}"
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {item.DelayCancelReason && (
                                    <div style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: 12, borderLeft: '4px solid var(--orange)', fontSize: 12 }}>
                                      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                                        {Number(item.InterviewState) === 3 ? '⚠️ Delay Reason' : '🚫 Cancellation Reason'}
                                      </div>
                                      <p style={{ color: 'var(--text)', fontWeight: 600, lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
                                        "{item.DelayCancelReason}"
                                      </p>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFeedbackFormData({
                                          InterviewID: String(item.InterviewID),
                                          Rating: String(item.Rating || 8),
                                          FeedbackComments: item.FeedbackComments || '',
                                          Recommendation: String(item.Recommendation ?? 0)
                                        });
                                        setShowFeedbackModal(true);
                                      }}
                                      style={{
                                        height: 28,
                                        padding: '0 12px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        color: 'var(--primary)',
                                        borderRadius: 7,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5
                                      }}
                                    >
                                      ✏️ Edit Rating & Feedback
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeDrawerTab === 'tests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Assigned Assessment Tests ({assignedTests.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTestFormData({ CandidateID: String(selectedCandidate.CandidateID), TestID: '' });
                      setShowAssignTestModal(true);
                    }}
                    style={{
                      background: 'var(--primary-soft)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Assign New Test
                  </button>
                </div>

                {assignedTests.length === 0 ? (
                  <div style={{ padding: '24px 12px', background: 'var(--soft)', border: '1px dotted var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    📝 No tests assigned to this candidate yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assignedTests.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.015)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                            {item.TestTitle}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--soft)', padding: '2px 8px', borderRadius: 6, color: 'var(--muted)' }}>
                              {item.TestType}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              Assigned: {item.TestDate ? new Date(item.TestDate).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          {item.Score !== null && item.Score !== undefined ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: item.Score >= 60 ? 'var(--green)' : 'var(--red)',
                                background: item.Score >= 60 ? 'var(--green-soft)' : 'var(--red-soft)',
                                padding: '4px 10px',
                                borderRadius: 8
                              }}>
                                Score: {item.Score}% {item.Score >= 60 ? '✓' : '⚠️'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenAnswerModal(item)}
                                style={{
                                  background: 'var(--primary-soft)',
                                  color: 'var(--primary)',
                                  border: '1px solid var(--primary)',
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                👁️ View Answer Breakdown
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--orange)', background: 'var(--orange-soft)', padding: '4px 8px', borderRadius: 6 }}>
                              {item.Status || 'Assigned'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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
                    🔄 No reassignment records found for this candidate.
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
        </div>
      </>
    );
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
      <style>{`
        .ai-summary-card {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%);
          border: 1.5px solid rgba(124, 58, 237, 0.12);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 20px -2px rgba(124, 58, 237, 0.03);
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .ai-summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #7c3aed, #6366f1);
        }
        .ai-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.06);
          padding-bottom: 8px;
        }
        .ai-summary-title {
          font-size: 12px;
          font-weight: 850;
          color: #7c3aed;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ai-summary-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .ai-summary-action-btn {
          background: none;
          border: 0;
          color: #6366f1;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.2s;
          text-decoration: none;
        }
        .ai-summary-action-btn:hover {
          background: rgba(99, 102, 241, 0.08);
          color: #4f46e5;
        }
        .ai-summary-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ai-summary-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 8px 10px;
          border-radius: 10px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .ai-summary-row:hover {
          background-color: rgba(124, 58, 237, 0.03);
          border-color: rgba(124, 58, 237, 0.05);
          transform: translateX(3px);
        }
        .ai-summary-bullet {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
          font-size: 10px;
          margin-top: 1px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .ai-summary-row:hover .ai-summary-bullet {
          transform: scale(1.15) rotate(15deg);
          background: rgba(124, 58, 237, 0.15);
        }
        .ai-summary-badge-row {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
          border: 1px dashed rgba(124, 58, 237, 0.2);
        }
        .ai-summary-badge-row:hover {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
          border-color: rgba(124, 58, 237, 0.3);
        }
        .ai-summary-score-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 950;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          margin-left: 6px;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.15);
        }
        .ai-summary-row-label {
          font-weight: 850;
          color: var(--text-dark, #1f2937);
          font-size: 13px;
          margin-right: 4px;
        }
        .ai-summary-row-text {
          color: var(--text, #4b5563);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 600;
        }
      `}</style>
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
          onRowClick={async (row) => {
            setSelectedCandidate(row);
            setActiveLanguage('en');
            setActiveDrawerTab('details');
            setInterviews([]);
            setAssignmentHistory([]);
            setShowDetailDrawer(true);
            loadInterviewsAndHistory(row.CandidateID);
          }}
          onAdd={() => {
            setSelectedFiles([]);
            setFormData({
              CandidateID: '',
              RequestID: '',
              FullName: '',
              Email: '',
              Phone: '',
              CVFileName: '',
              CVFileContent: '',
              Source: 'Job Board',
              Government: '',
              City: '',
              Address: '',
              DateOfBirth: '',
              ExpectedJoiningDate: '',
              ExpectedSalary: '',
              EducationDetails: {
                Degree: '',
                University: '',
                Major: '',
                GraduationYear: '',
                Grade: ''
              },
              WorkExperienceDetails: []
            });
            setModalError('');
            setShowAddModal(true);
          }}
          extraRowActions={[
            {
              label: '📝 Edit Details',
              show: (row) => row.CandidateState === 0,
              onClick: (row) => {
                let parsedEdu = { Degree: '', University: '', Major: '', GraduationYear: '', Grade: '' };
                if (row.EducationDetails) {
                  try {
                    parsedEdu = typeof row.EducationDetails === 'string' ? JSON.parse(row.EducationDetails) : row.EducationDetails;
                  } catch (e) {}
                }

                let parsedExps = [];
                if (row.WorkExperienceDetails) {
                  try {
                    parsedExps = typeof row.WorkExperienceDetails === 'string' ? JSON.parse(row.WorkExperienceDetails) : row.WorkExperienceDetails;
                  } catch (e) {}
                }

                setFormData({
                  CandidateID: String(row.CandidateID),
                  RequestID: String(row.RequestID),
                  FullName: row.FullName || '',
                  Email: row.Email || '',
                  Phone: row.Phone || '',
                  CVFileName: row.CVFileName || '',
                  CVFileContent: row.CVFileContent || '',
                  Source: row.Source || 'Job Board',
                  Government: row.Government || '',
                  City: row.City || '',
                  Address: row.Address || '',
                  DateOfBirth: row.DateOfBirth ? row.DateOfBirth.split('T')[0] : '',
                  ExpectedJoiningDate: row.ExpectedJoiningDate ? row.ExpectedJoiningDate.split('T')[0] : '',
                  ExpectedSalary: row.ExpectedSalary || '',
                  EducationDetails: parsedEdu || { Degree: '', University: '', Major: '', GraduationYear: '', Grade: '' },
                  WorkExperienceDetails: Array.isArray(parsedExps) ? parsedExps : []
                });
                setSelectedFiles([]);
                setModalError('');
                setShowAddModal(true);
              }
            },
            {
              label: '📋 Shortlist Candidate',
              show: (row) => row.CandidateState === 0,
              onClick: (row) => handleShortlist(row.CandidateID)
            },
            {
              label: '📝 Assign Assessment Test',
              show: (row) => row.CandidateState !== 2,
              onClick: (row) => {
                setAssignTestFormData({
                  CandidateID: String(row.CandidateID),
                  TestID: ''
                });
                setShowAssignTestModal(true);
              }
            },
            {
              label: '📅 Schedule Interview',
              show: (row) => row.CandidateState === 1 || row.CandidateState === 3 || row.CandidateState === 4,
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
              label: '⚠️ Delay Interview Round',
              show: (row) => row.CandidateState === 3,
              onClick: async (row) => {
                try {
                  const res = await apiCall('Get Interviews', { CandidateID: row.CandidateID }, {}, 'recruitment_requests');
                  const activeInt = (res.List0 || []).find(i => Number(i.InterviewState) === 0);
                  if (!activeInt) {
                    alert('No scheduled/active interview rounds found for this candidate.');
                    return;
                  }
                  setStatusFormData({
                    InterviewID: String(activeInt.InterviewID),
                    InterviewState: 3,
                    DelayCancelReason: ''
                  });
                  setShowStatusModal(true);
                } catch (err) {
                  alert('Error loading interview: ' + err.message);
                }
              }
            },
            {
              label: '🚫 Cancel Interview Round',
              show: (row) => row.CandidateState === 3,
              onClick: async (row) => {
                try {
                  const res = await apiCall('Get Interviews', { CandidateID: row.CandidateID }, {}, 'recruitment_requests');
                  const activeInt = (res.List0 || []).find(i => Number(i.InterviewState) === 0);
                  if (!activeInt) {
                    alert('No scheduled/active interview rounds found for this candidate.');
                    return;
                  }
                  setStatusFormData({
                    InterviewID: String(activeInt.InterviewID),
                    InterviewState: 4,
                    DelayCancelReason: ''
                  });
                  setShowStatusModal(true);
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
              label: '🔄 Reassign Requisition',
              show: (row) => true,
              onClick: (row) => {
                setReassignFormData({
                  CandidateID: String(row.CandidateID),
                  RequestID: String(row.RequestID)
                });
                setShowReassignModal(true);
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ width: 'min(780px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 26, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                {formData.CandidateID ? '📝 Edit Candidate Details' : '👤 Register Candidate'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            {modalError && (
              <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{modalError}</div>
            )}

            <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Section 1: Personal & Contact Info */}
              <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  1. Personal & Contact Details
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Hiring Requisition *</label>
                  <select value={formData.RequestID} onChange={e => setFormData({ ...formData, RequestID: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} required>
                    <option value="">Select Requisition</option>
                    {hiringRequests.map(r => (
                      <option key={r.RequestID} value={r.RequestID}>{r.PositionTitle} ({r.Department})</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Full Name *</label>
                  <input type="text" value={formData.FullName} onChange={e => setFormData({ ...formData, FullName: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Email *</label>
                    <input type="email" value={formData.Email} onChange={e => setFormData({ ...formData, Email: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Phone</label>
                    <input type="text" value={formData.Phone} onChange={e => setFormData({ ...formData, Phone: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Source</label>
                    <select value={formData.Source} onChange={e => setFormData({ ...formData, Source: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}>
                      <option value="Job Board">Job Board</option>
                      <option value="Agency">Agency</option>
                      <option value="Referral">Referral</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Government *</label>
                    <select
                      value={formData.Government}
                      onChange={e => setFormData({ ...formData, Government: e.target.value, City: '' })}
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                      required
                    >
                      <option value="">Select Government</option>
                      {Object.keys(EGYPT_LOCATIONS).map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>City *</label>
                    <select
                      value={formData.City}
                      onChange={e => setFormData({ ...formData, City: e.target.value })}
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                      disabled={!formData.Government}
                      required
                    >
                      <option value="">Select City</option>
                      {(EGYPT_LOCATIONS[formData.Government] || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Date of Birth</label>
                    <input type="date" value={formData.DateOfBirth} onChange={e => setFormData({ ...formData, DateOfBirth: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Expected Joining Date</label>
                    <input type="date" value={formData.ExpectedJoiningDate} onChange={e => setFormData({ ...formData, ExpectedJoiningDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Expected Salary</label>
                    <input type="text" value={formData.ExpectedSalary} onChange={e => setFormData({ ...formData, ExpectedSalary: e.target.value })} placeholder="e.g. 25,000 EGP" style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Address</label>
                  <input type="text" value={formData.Address} onChange={e => setFormData({ ...formData, Address: e.target.value })} placeholder="e.g. Street 9, Maadi" style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>

              {/* Section 2: Education Background */}
              <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  🎓 2. Education Background
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Degree / Qualification</label>
                    <input
                      type="text"
                      value={formData.EducationDetails?.Degree || ''}
                      onChange={e => setFormData({
                        ...formData,
                        EducationDetails: { ...(formData.EducationDetails || {}), Degree: e.target.value }
                      })}
                      placeholder="e.g. Bachelor's Degree"
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>University / Institute</label>
                    <input
                      type="text"
                      value={formData.EducationDetails?.University || ''}
                      onChange={e => setFormData({
                        ...formData,
                        EducationDetails: { ...(formData.EducationDetails || {}), University: e.target.value }
                      })}
                      placeholder="e.g. Cairo University"
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Major / Field of Study</label>
                    <input
                      type="text"
                      value={formData.EducationDetails?.Major || ''}
                      onChange={e => setFormData({
                        ...formData,
                        EducationDetails: { ...(formData.EducationDetails || {}), Major: e.target.value }
                      })}
                      placeholder="e.g. Computer Science"
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Graduation Year</label>
                    <input
                      type="text"
                      value={formData.EducationDetails?.GraduationYear || ''}
                      onChange={e => setFormData({
                        ...formData,
                        EducationDetails: { ...(formData.EducationDetails || {}), GraduationYear: e.target.value }
                      })}
                      placeholder="e.g. 2022"
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Grade / GPA</label>
                    <input
                      type="text"
                      value={formData.EducationDetails?.Grade || ''}
                      onChange={e => setFormData({
                        ...formData,
                        EducationDetails: { ...(formData.EducationDetails || {}), Grade: e.target.value }
                      })}
                      placeholder="e.g. Very Good / 3.4"
                      style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Work Experience History */}
              <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    💼 3. Work Experience ({formData.WorkExperienceDetails?.length || 0})
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    style={{
                      height: 30,
                      padding: '0 12px',
                      border: '1px solid var(--primary)',
                      background: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    + Add Work Experience
                  </button>
                </div>

                {(!formData.WorkExperienceDetails || formData.WorkExperienceDetails.length === 0) ? (
                  <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                    💼 No work experiences added yet. Click above to add employment history.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {formData.WorkExperienceDetails.map((exp, idx) => (
                      <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Experience #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(idx)}
                            style={{ border: 0, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                          >
                            🗑️ Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Company Name</label>
                            <input
                              type="text"
                              value={exp.CompanyName || ''}
                              onChange={e => handleUpdateExperience(idx, 'CompanyName', e.target.value)}
                              placeholder="e.g. Acme Corp"
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Job Title</label>
                            <input
                              type="text"
                              value={exp.JobTitle || ''}
                              onChange={e => handleUpdateExperience(idx, 'JobTitle', e.target.value)}
                              placeholder="e.g. Software Engineer"
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Start Date</label>
                            <input
                              type="date"
                              value={exp.StartDate || ''}
                              onChange={e => handleUpdateExperience(idx, 'StartDate', e.target.value)}
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>End Date</label>
                            <input
                              type="date"
                              value={exp.EndDate || ''}
                              onChange={e => handleUpdateExperience(idx, 'EndDate', e.target.value)}
                              disabled={exp.IsCurrent}
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, opacity: exp.IsCurrent ? 0.5 : 1 }}
                            />
                          </div>
                          <div style={{ paddingTop: 16 }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={exp.IsCurrent || false}
                                onChange={e => handleUpdateExperience(idx, 'IsCurrent', e.target.checked)}
                              />
                              Current Job
                            </label>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Main Responsibilities</label>
                            <input
                              type="text"
                              value={exp.Responsibilities || ''}
                              onChange={e => handleUpdateExperience(idx, 'Responsibilities', e.target.value)}
                              placeholder="e.g. Developed Web APIs"
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Reason for Leaving</label>
                            <input
                              type="text"
                              value={exp.ReasonForLeaving || ''}
                              onChange={e => handleUpdateExperience(idx, 'ReasonForLeaving', e.target.value)}
                              placeholder="e.g. Career Growth"
                              style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Attachments */}
              <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                  📎 4. Upload Attachments (CV, Certificates, etc.)
                </div>
                <input type="file" onChange={handleFileChange} multiple style={{ fontSize: 13, display: 'block', marginBottom: 10 }} />
                
                {selectedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'var(--surface)' }}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text)', background: 'var(--soft)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>📄 {file.name}</span>
                        <button type="button" onClick={() => handleRemoveFile(idx)} style={{ border: 0, background: 'none', color: 'var(--red)', fontSize: 16, cursor: 'pointer', fontWeight: 900, padding: '0 4px' }}>&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ height: 40, padding: '0 20px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 40, padding: '0 24px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Saving...' : (formData.CandidateID ? 'Save Changes' : 'Register Candidate')}
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
                <select value={interviewFormData.RoundNumber} onChange={e => setInterviewFormData({ ...interviewFormData, RoundNumber: e.target.value, InterviewerUser: '' })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="1">Round 1: HR</option>
                  <option value="2">Round 2: Technical</option>
                  <option value="3">Round 3: Manager</option>
                  <option value="4">Round 4: Final</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Interviewer User</label>
                <select
                  value={interviewFormData.InterviewerUser}
                  onChange={e => setInterviewFormData({ ...interviewFormData, InterviewerUser: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                  required
                >
                  <option value="">Select Interviewer</option>
                  {getInterviewerOptions().map(opt => (
                    <option key={opt.Username} value={opt.Username}>
                      {opt.Username} ({opt.RoleName}{opt.Department ? ` - ${opt.Department}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Scheduled Date & Time</label>
                <input type="datetime-local" step="1800" value={interviewFormData.ScheduledDate} onChange={e => setInterviewFormData({ ...interviewFormData, ScheduledDate: e.target.value })} style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} required />
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

      {/* Candidate Detail Drawer */}
      {showDetailDrawer && renderDetailDrawer()}

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
      {showAssignTestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Assign Assessment Test</h3>
              <button onClick={() => setShowAssignTestModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAssignTestSubmit}>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Select Test</label>
                  <select
                    value={assignTestFormData.TestID}
                    onChange={e => setAssignTestFormData({ ...assignTestFormData, TestID: e.target.value })}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                    required
                  >
                    <option value="">Select Test...</option>
                    {availableTests.map(t => (
                      <option key={t.TestID} value={t.TestID}>
                        {t.TestTitle} ({t.TestType}) - {t.QuestionCount || 0} Questions
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
                  💡 Assigning a test links it to the candidate's recruitment profile. You will be able to review their score once completed.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', background: 'var(--soft)', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowAssignTestModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Assigning...' : 'Assign Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Answer Breakdown Modal */}
      {showAnswerModal && selectedAnswerTest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxWidth: 760,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--soft)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>
                  Candidate Answer Breakdown: {selectedAnswerTest.TestTitle}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>
                  Candidate: {selectedCandidate?.FullName} | Score: <strong style={{ color: selectedAnswerTest.Score >= 60 ? 'var(--green)' : 'var(--red)' }}>{selectedAnswerTest.Score}%</strong>
                </div>
              </div>
              <button
                onClick={() => setShowAnswerModal(false)}
                style={{ background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'var(--muted)', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content - Question List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {loadingAnswerDetails ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                  Loading test question breakdown...
                </div>
              ) : modalQuestions.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No question breakdown details available for this test.
                </div>
              ) : (
                modalQuestions.map((q, idx) => {
                  const isCorrect = q.IsCorrect;

                  return (
                    <div key={idx} style={{
                      background: 'var(--surface)',
                      border: isCorrect ? '1.5px solid var(--green)' : '1.5px solid var(--red)',
                      borderRadius: 14,
                      padding: 16,
                      boxShadow: 'var(--shadow)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Question #{idx + 1}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: isCorrect ? 'var(--green)' : 'var(--red)',
                          background: isCorrect ? 'var(--green-soft)' : 'var(--red-soft)',
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {isCorrect ? '✓ Correct' : '❌ Incorrect'}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 12, lineHeight: 1.4 }}>
                        {q.QuestionText}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { key: 'A', text: q.OptionA },
                          { key: 'B', text: q.OptionB },
                          { key: 'C', text: q.OptionC },
                          { key: 'D', text: q.OptionD }
                        ].map(opt => {
                          const isCandidateChoice = q.SelectedAnswer === opt.key;
                          const isCorrectAnswer = q.CorrectAnswer === opt.key;

                          let bg = 'var(--soft)';
                          let border = '1px solid var(--border)';
                          let color = 'var(--text)';
                          let badgeText = '';

                          if (isCandidateChoice && isCorrectAnswer) {
                            bg = 'var(--green-soft)';
                            border = '1.5px solid var(--green)';
                            color = 'var(--green)';
                            badgeText = ' (Candidate Choice ✓)';
                          } else if (isCandidateChoice && !isCorrectAnswer) {
                            bg = 'var(--red-soft)';
                            border = '1.5px solid var(--red)';
                            color = 'var(--red)';
                            badgeText = ' (Candidate Selected ❌)';
                          } else if (isCorrectAnswer) {
                            bg = 'var(--green-soft)';
                            border = '1.5px solid var(--green)';
                            color = 'var(--green)';
                            badgeText = ' (Correct Key ✓)';
                          }

                          return (
                            <div key={opt.key} style={{
                              background: bg,
                              border: border,
                              color: color,
                              borderRadius: 10,
                              padding: '8px 12px',
                              fontSize: 12.5,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span><strong>{opt.key}:</strong> {opt.text}</span>
                              {badgeText && <span style={{ fontSize: 10, fontWeight: 800 }}>{badgeText}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--soft)' }}>
              <button
                onClick={() => setShowAnswerModal(false)}
                style={{
                  height: 38,
                  padding: '0 20px',
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
