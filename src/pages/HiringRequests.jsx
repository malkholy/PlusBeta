import { useState, useEffect } from 'react';
import { apiCall, getAnthropicAPIKey } from '../shared/api.js';
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

  // Candidates for selected hiring request
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Interviews for selected hiring request
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  // AI Comparison state variables
  const [selectedCompareCandidates, setSelectedCompareCandidates] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonReport, setComparisonReport] = useState('');
  const [compareFocus, setCompareFocus] = useState('general');
  const [customFocusText, setCustomFocusText] = useState('');
  const [translatingCompare, setTranslatingCompare] = useState(false);
  const [compareLanguage, setCompareLanguage] = useState('en');
  const [translatedComparisonReport, setTranslatedComparisonReport] = useState('');
  const [systemUsers, setSystemUsers] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [candidateLanguages, setCandidateLanguages] = useState({});
  const [candidateTranslating, setCandidateTranslating] = useState({});
  const [translatedCandidateSummaries, setTranslatedCandidateSummaries] = useState({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusFormData, setStatusFormData] = useState({
    InterviewID: '',
    InterviewState: 3, // 3: Delayed, 4: Canceled
    DelayCancelReason: ''
  });

  async function loadCandidates(reqId) {
    if (!reqId) {
      setCandidates([]);
      return;
    }
    setLoadingCandidates(true);
    try {
      const res = await apiCall('Get Candidates', { RequestID: Number(reqId) }, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        setCandidates(res.List0 || []);
      } else {
        setCandidates([]);
      }
    } catch (e) {
      console.error('Failed to load candidates:', e);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function loadInterviews(reqId) {
    if (!reqId) {
      setInterviews([]);
      return;
    }
    setLoadingInterviews(true);
    try {
      const res = await apiCall('Get Interviews', { RequestID: Number(reqId) }, {}, 'recruitment_requests');
      if (res.State === 0 || res.List0) {
        setInterviews(res.List0 || []);
      } else {
        setInterviews([]);
      }
    } catch (e) {
      console.error('Failed to load interviews:', e);
      setInterviews([]);
    } finally {
      setLoadingInterviews(false);
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
        if (formData.RequestID) {
          loadInterviews(formData.RequestID);
        }
      } else {
        alert(res.Message || 'Failed to update interview status.');
      }
    } catch (err) {
      alert('Error updating interview: ' + err.message);
    }
    setSubmitting(false);
  }

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
    loadSystemUsers();
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
          const excludedKeys = [
            'RequestID',
            'JobDescription',
            'RequiredSkills',
            'CreatedBy',
            'LastMaintBy',
            'LastMaintDate',
            'ReturnComments'
          ];
          const keys = Object.keys(list[0]).filter(k => !excludedKeys.includes(k));
          const cols = keys.map(k => {
            let label = k.replace(/([A-Z])/g, ' $1').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);
            
            if (k === 'RequestState') label = 'Status';
            if (k === 'SalaryMin') label = 'Min Salary';
            if (k === 'SalaryMax') label = 'Max Salary';
            if (k === 'TotalDaysForOpening') label = 'Days Open';
            if (k === 'CreatorName') label = 'Requested By';
            if (k === 'CreatedDate') label = 'Created Date';
            if (k === 'TargetStartDate') label = 'Target Start';
            if (k === 'TotalCandidates') label = 'Candidates';
            if (k === 'HiredCount') label = 'Hired';
            if (k === 'TotalInterviews') label = 'Interviews';

            return {
              key: k,
              label,
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
                if (k === 'TotalDaysForOpening') {
                  return <span style={{ fontWeight: 600, color: 'var(--text)' }}>{val} Days</span>;
                }
                if (k.toLowerCase().includes('salary') && val) {
                  return Number(val).toLocaleString('en-US');
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
        SalaryMax: formData.SalaryMax ? Number(formData.SalaryMax) : null,
        CreatorName: sessionStorage.getItem('FullName') || sessionStorage.getItem('Username')
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
    alert('Comparison report copied to clipboard!');
  };

  async function handleAICompare() {
    if (selectedCompareCandidates.length < 2) {
      alert("Please select at least 2 candidates to compare.");
      return;
    }

    let apiKey = await getAnthropicAPIKey();
    if (!apiKey) {
      apiKey = window.prompt("Please enter your Anthropic API Key to call Claude AI:");
      if (!apiKey || !apiKey.trim()) return;
      localStorage.setItem('Anthropic_API_Key', apiKey.trim());
    }

    setComparing(true);
    setComparisonReport('');
    setCompareLanguage('en');
    setTranslatedComparisonReport('');

    try {
      const candidatesToCompare = candidates.filter(c => selectedCompareCandidates.includes(c.CandidateID));
      
      const candidatesInfo = candidatesToCompare.map((c, idx) => {
        return `Candidate #${idx + 1}:
Name: ${c.FullName}
Source: ${c.Source || 'Unknown'}
State: ${c.CandidateState === 0 ? 'New' : c.CandidateState === 1 ? 'Shortlisted' : c.CandidateState === 2 ? 'Rejected' : c.CandidateState === 3 ? 'Interviewing' : c.CandidateState === 4 ? 'Selected' : c.CandidateState === 5 ? 'On Hold' : c.CandidateState === 6 ? 'Hired' : 'Active'}
AI Profile Summary: ${c.Summary || 'No AI profile summary generated yet.'}
`;
      }).join('\n---\n\n');

      let focusInstruction = "Generate a comprehensive, professional side-by-side comparison of the candidates for this role.";
      if (compareFocus === 'technical') {
        focusInstruction = "Focus heavily on their technical skills, comparing their core tech stack directly to the required skills. Highlight who meets the technical requirements best.";
      } else if (compareFocus === 'experience') {
        focusInstruction = "Focus heavily on their experience levels, work history, and key accomplishments. Compare their seniority and past achievements.";
      } else if (compareFocus === 'custom' && customFocusText.trim()) {
        focusInstruction = `Focus custom analysis on: "${customFocusText.trim()}"`;
      }

      const promptText = `You are a professional HR consulting system. Compare the following candidates for the target job requisition.

Job Requisition Details:
Position Title: ${formData.PositionTitle}
Department: ${formData.Department}
Job Description: ${formData.JobDescription || '—'}
Required Skills: ${formData.RequiredSkills || '—'}

Candidates to Compare:
${candidatesInfo}

Comparison Focus:
${focusInstruction}

Please output your response as a beautifully structured report:
1. Start with a brief, high-level **Executive Summary & Recommendation** (under 100 words).
2. Render a side-by-side **Comparative Table** with these columns:
   - Candidate Name
   - Core Strengths
   - Key Skill Gaps / Concerns
   - Suitability Match (e.g. High, Medium, Low)
   - Fit Rating (out of 10)
3. Provide a brief bulleted breakdown of **Pros & Cons** or **Individual Fit Assessment** for each candidate.
4. Keep the output professional, objective, and clear.`;

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
      let reportText = '';

      for (const currentModel of modelsToTry) {
        try {
          console.log(`Attempting comparison using Claude model: ${currentModel}`);
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
              max_tokens: 1500,
              system: "You are an expert HR recruiter and talent advisor. Your job is to compare candidates objectively and present a highly structured, clean comparison report using standard Markdown syntax. Output tables and bullet points with clear formatting.",
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: promptText
                    }
                  ]
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
          reportText = json.content
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

      if (!reportText.trim()) {
        throw lastError || new Error("No report returned from Claude AI.");
      }

      setComparisonReport(reportText);
    } catch (err) {
      console.error("Claude Comparison failure:", err);
      alert("Failed to compare candidates with Claude: " + err.message);
    } finally {
      setComparing(false);
    }
  }

  async function handleTranslateComparison() {
    if (!comparisonReport) return;

    if (compareLanguage === 'ar') {
      setCompareLanguage('en');
      return;
    }

    if (translatedComparisonReport) {
      setCompareLanguage('ar');
      return;
    }

    let apiKey = await getAnthropicAPIKey();
    if (!apiKey) {
      apiKey = window.prompt("Please enter your Anthropic API Key to call Claude AI:");
      if (!apiKey || !apiKey.trim()) return;
      localStorage.setItem('Anthropic_API_Key', apiKey.trim());
    }

    setTranslatingCompare(true);

    try {
      const promptText = `Please translate the following candidate comparison report into professional, clear business Arabic. Retain all markdown formatting (especially the markdown table structure, lists, bold text, and score badges) exactly as they are. Keep the translated lines aligned to the original structure. Do not add any conversational filler, just return the translated report.

English Report:
${comparisonReport}`;

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
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
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
          console.log(`Attempting comparison translation using Claude model: ${currentModel}`);
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
              max_tokens: 1500,
              system: "You are a professional translator. Translate the provided markdown candidate comparison report into clear business Arabic. Make sure to keep all markdown formatting, tables, bullets, and bold phrases exactly intact. Do not add any introductory or concluding conversational filler text, just return the translated text.",
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

      setTranslatedComparisonReport(translatedText);
      setCompareLanguage('ar');
    } catch (err) {
      console.error("Claude Comparison Translation failure:", err);
      alert("Failed to translate comparison with Claude: " + err.message);
    } finally {
      setTranslatingCompare(false);
    }
  }

  async function handleTranslateCandidateSummary(candidateID, englishSummary) {
    if (!englishSummary) return;

    const currentLang = candidateLanguages[candidateID] || 'en';
    if (currentLang === 'ar') {
      setCandidateLanguages(prev => ({ ...prev, [candidateID]: 'en' }));
      return;
    }

    if (translatedCandidateSummaries[candidateID]) {
      setCandidateLanguages(prev => ({ ...prev, [candidateID]: 'ar' }));
      return;
    }

    let apiKey = await getAnthropicAPIKey();
    if (!apiKey) {
      apiKey = window.prompt("Please enter your Anthropic API Key to call Claude AI:");
      if (!apiKey || !apiKey.trim()) return;
      localStorage.setItem('Anthropic_API_Key', apiKey.trim());
    }

    setCandidateTranslating(prev => ({ ...prev, [candidateID]: true }));

    try {
      const promptText = `Please translate the following candidate summary into professional, clear business Arabic. Retain all markdown formatting (especially bold text and bullet points starting with ✨) exactly as they are. Keep the translated lines aligned to the original structure. Do not add any conversational filler, just return the translated summary.

English Summary:
${englishSummary}`;

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
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
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
          console.log(`Attempting candidate summary translation using Claude model: ${currentModel}`);
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
              system: "You are a professional translator. Translate the provided markdown candidate summary into clear business Arabic. Make sure to keep all markdown formatting and bold phrases exactly intact. Do not add any introductory or concluding conversational filler text, just return the translated text.",
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

      setTranslatedCandidateSummaries(prev => ({ ...prev, [candidateID]: translatedText }));
      setCandidateLanguages(prev => ({ ...prev, [candidateID]: 'ar' }));
    } catch (err) {
      console.error("Claude Candidate Translation failure:", err);
      alert("Failed to translate candidate summary with Claude: " + err.message);
    } finally {
      setCandidateTranslating(prev => ({ ...prev, [candidateID]: false }));
    }
  }

  const handleViewDetails = (row) => {
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
    loadCandidates(row.RequestID);
    loadInterviews(row.RequestID);
    setExpandedComments({});
    setExpandedSummaries({});
    setCandidateLanguages({});
    setCandidateTranslating({});
    setTranslatedCandidateSummaries({});
    setModalError('');
    setSelectedCompareCandidates([]);
    setComparisonReport('');
    setCompareFocus('general');
    setCustomFocusText('');
    setCompareLanguage('en');
    setTranslatedComparisonReport('');
    setShowAddModal(true);
  };

  async function handleApprovalSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiCall('Approve Reject Request', {
        RequestID: approvalRow.RequestID,
        Decision: Number(approvalDecision),
        Comments: approvalComments,
        UserFullName: sessionStorage.getItem('FullName') || sessionStorage.getItem('Username')
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
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>👤 {ap.ActionedBy ? `${ap.ActionedBy} (${ap.ApproverUser})` : ap.ApproverUser}</span>
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
          user: ap.ActionedBy ? `${ap.ActionedBy} (${ap.ApproverUser})` : ap.ApproverUser,
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

  const renderCandidatesTab = () => {
    if (loadingCandidates) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0', color: 'var(--muted)', fontWeight: 800 }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'dg-spin 0.8s linear infinite' }} />
          Loading candidates...
        </div>
      );
    }

    if (candidates.length === 0) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>No Applicants Yet</div>
          <p style={{ fontSize: 12.5, fontWeight: 600 }}>There are no candidates registered under this requisition.</p>
        </div>
      );
    }

    const states = {
      0: { text: 'New', color: 'var(--blue)', bg: 'var(--blue-soft)' },
      1: { text: 'Shortlisted', color: 'var(--orange)', bg: 'var(--orange-soft)' },
      2: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
      3: { text: 'Interviewing', color: '#6366f1', bg: '#e0e7ff' },
      4: { text: 'Selected', color: 'var(--green)', bg: 'var(--green-soft)' },
      5: { text: 'On Hold', color: 'var(--muted)', bg: 'var(--soft)' },
      6: { text: 'Hired', color: 'var(--green)', bg: 'var(--green-soft)' }
    };

    const handleDownloadCV = (c) => {
      if (!c.CVFileContent || !c.CVFileName) {
        alert('No CV file uploaded for this candidate.');
        return;
      }
      if (c.CVFileContent.startsWith('http')) {
        window.open(c.CVFileContent, '_blank');
        return;
      }
      try {
        const byteCharacters = atob(c.CVFileContent);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = c.CVFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert('Failed to download CV file.');
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          Linked Candidates ({candidates.length})
        </div>
        {candidates.map(c => {
          const state = states[c.CandidateState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
          const initials = c.FullName ? c.FullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
          
          return (
            <div key={c.CandidateID} style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.FullName}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: state.color, background: state.bg, padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
                    {state.text}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✉️</span>
                    <a href={`mailto:${c.Email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.Email}</a>
                  </div>
                  {c.Phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📞</span>
                      <a href={`tel:${c.Phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.Phone}</a>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🌱 Source:</span>
                    <span style={{ color: 'var(--text)' }}>{c.Source}</span>
                  </div>
                  {(c.Government || c.City) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📍 Location:</span>
                      <span style={{ color: 'var(--text)' }}>
                        {c.City ? `${c.City}, ` : ''}{c.Government}
                      </span>
                    </div>
                  )}
                  {c.RejectionReason && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 8, fontSize: 11.5 }}>
                      <strong>Rejection Reason:</strong> {c.RejectionReason}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  {c.Summary ? (
                    <button
                      type="button"
                      onClick={() => setExpandedSummaries(prev => ({ ...prev, [c.CandidateID]: !prev[c.CandidateID] }))}
                      style={{
                        height: 28,
                        padding: 0,
                        background: 'none',
                        border: 0,
                        color: 'var(--primary)',
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        outline: 'none',
                        textDecoration: 'underline'
                      }}
                    >
                      {expandedSummaries[c.CandidateID] ? '✨ Hide AI Summary' : '✨ View AI Summary'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>No AI summary generated</span>
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(() => {
                      if (c.CVFileContent && c.CVFileContent.trim().startsWith('[')) {
                        try {
                          const files = JSON.parse(c.CVFileContent);
                          return files.map((file, idx) => (
                            <button key={idx} type="button" onClick={() => window.open(file.url, '_blank')} style={{ height: 28, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              📄 {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                            </button>
                          ));
                        } catch (e) {}
                      }

                      if (c.CVFileName) {
                        return (
                          <button type="button" onClick={() => handleDownloadCV(c)} style={{ height: 28, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            📄 CV ({c.CVFileName.length > 15 ? c.CVFileName.substring(0, 12) + '...' : c.CVFileName})
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {c.Summary && expandedSummaries[c.CandidateID] && (() => {
                  const isAr = candidateLanguages[c.CandidateID] === 'ar';
                  const displayText = isAr ? (translatedCandidateSummaries[c.CandidateID] || c.Summary) : c.Summary;
                  const items = parseAISummary(displayText);
                  return (
                    <div style={{ 
                      marginTop: 10, 
                      background: 'var(--surface)', 
                      border: '1.5px dashed rgba(124, 58, 237, 0.15)', 
                      borderRadius: 10, 
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      direction: isAr ? 'rtl' : 'ltr',
                      textAlign: isAr ? 'right' : 'left'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <div style={{ fontSize: 10, fontWeight: 850, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          ✨ Candidate Profile Summary
                        </div>
                        <button
                          type="button"
                          disabled={candidateTranslating[c.CandidateID]}
                          onClick={() => handleTranslateCandidateSummary(c.CandidateID, c.Summary)}
                          style={{
                            background: 'none',
                            border: 0,
                            color: '#6366f1',
                            fontSize: 10.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: 4,
                            transition: 'background 0.2s',
                            textDecoration: 'underline',
                            outline: 'none'
                          }}
                        >
                          {candidateTranslating[c.CandidateID] ? '⏳ Translating...' : isAr ? '🌐 English' : '🌐 Translate to Arabic'}
                        </button>
                      </div>
                      {items.map((item, idx) => {
                        const isScore = item.label.toLowerCase().includes('score') || !!item.score;
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              gap: 8, 
                              alignItems: 'flex-start',
                              fontSize: 12,
                              color: 'var(--text)',
                              fontWeight: 550,
                              lineHeight: 1.4,
                              background: isScore ? 'linear-gradient(90deg, rgba(124, 58, 237, 0.04), rgba(99, 102, 241, 0.04))' : 'none',
                              padding: isScore ? '6px 10px' : '0',
                              borderRadius: isScore ? '8px' : '0',
                              border: isScore ? '1px solid rgba(124, 58, 237, 0.08)' : 'none',
                              marginTop: isScore ? '4px' : '0'
                            }}
                          >
                            <span style={{ color: '#7c3aed', fontSize: 12, marginTop: 1 }}>✨</span>
                            <div style={{ flex: 1 }}>
                              {item.label && (
                                <strong style={{ fontWeight: 800, color: 'var(--text-dark)' }}>
                                  {item.label}
                                  {item.score ? (
                                    <span style={{ 
                                      display: 'inline-block',
                                      marginLeft: 6,
                                      padding: '1px 6px',
                                      borderRadius: 10,
                                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                      color: '#fff',
                                      fontSize: 10,
                                      fontWeight: 800
                                    }}>
                                      {item.score}
                                    </span>
                                  ) : ':'}
                                  {" "}
                                </strong>
                              )}
                              {item.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInterviewsTab = () => {
    if (loadingInterviews) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0', color: 'var(--muted)', fontWeight: 800 }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'dg-spin 0.8s linear infinite' }} />
          Loading interviews...
        </div>
      );
    }

    if (interviews.length === 0) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>No Interviews Scheduled</div>
          <p style={{ fontSize: 12.5, fontWeight: 600 }}>There are no interview rounds scheduled under this requisition.</p>
        </div>
      );
    }

    const totalScheduled = interviews.filter(i => Number(i.InterviewState) === 0).length;
    const totalPassed = interviews.filter(i => Number(i.InterviewState) === 2).length;
    const completedInts = interviews.filter(i => Number(i.InterviewState) !== 0 && i.Rating !== null);
    const avgRating = completedInts.length > 0 
      ? (completedInts.reduce((sum, i) => sum + Number(i.Rating), 0) / completedInts.length).toFixed(1) 
      : '—';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Mini Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: 'var(--soft)', padding: 12, borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Scheduled</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{totalScheduled}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Passed</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--green)', marginTop: 2 }}>{totalPassed}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Avg Rating</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--amber)', marginTop: 2 }}>⭐ {avgRating}</div>
          </div>
        </div>

        {/* Timeline List */}
        <div style={{ position: 'relative', marginLeft: 10, paddingLeft: 24, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {interviews.map((item, idx) => {
            const roundLabels = {
              1: { text: 'Round 1: HR', bg: 'var(--blue-soft)', color: 'var(--blue)' },
              2: { text: 'Round 2: Technical', bg: '#e0e7ff', color: '#6366f1' },
              3: { text: 'Round 3: Manager', bg: 'var(--orange-soft)', color: 'var(--orange)' },
              4: { text: 'Round 4: Final', bg: 'var(--green-soft)', color: 'var(--green)' }
            };
            const rLbl = roundLabels[item.RoundNumber] || { text: `Round ${item.RoundNumber}`, bg: 'var(--soft)', color: 'var(--muted)' };

            const recs = {
              0: { text: 'Proceed', color: 'var(--green)', bg: 'var(--green-soft)' },
              1: { text: 'Reject', color: 'var(--red)', bg: 'var(--red-soft)' },
              2: { text: 'Hold', color: 'var(--muted)', bg: 'var(--soft)' }
            };
            const rec = recs[item.Recommendation];

            const states = {
              0: { text: 'Scheduled', color: 'var(--muted)', bg: 'var(--soft)', bullet: 'var(--muted)' },
              1: { text: 'Completed', color: 'var(--text)', bg: 'var(--soft)', bullet: 'var(--border2)' },
              2: { text: 'Passed', color: 'var(--green)', bg: 'var(--green-soft)', bullet: 'var(--green)' },
              3: { text: 'Delayed', color: 'var(--orange)', bg: 'var(--orange-soft)', bullet: 'var(--orange)' },
              4: { text: 'Canceled', color: 'var(--red)', bg: 'var(--red-soft)', bullet: 'var(--red)' }
            };
            const state = states[item.InterviewState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)', bullet: 'var(--muted)' };

            const sysUser = systemUsers.find(u => u.Username.toLowerCase() === (item.InterviewerUser || '').toLowerCase());
            const interviewerName = sysUser ? sysUser.Name : item.InterviewerUser;

            return (
              <div key={idx} style={{ position: 'relative' }}>
                {/* Timeline Bullet Node */}
                <div style={{
                  position: 'absolute',
                  left: -31,
                  top: 14,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: `3px solid ${state.bullet}`,
                  boxShadow: '0 0 0 3px var(--surface)'
                }} />

                {/* Card Container */}
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `4.5px solid ${rLbl.color}`,
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: '0 2px 8px rgba(15,23,42,0.02)'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: rLbl.color, background: rLbl.bg }}>
                      {rLbl.text}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: state.color, background: state.bg }}>
                      {state.text}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>👤 Candidate</span>
                      <span style={{ color: 'var(--text)', fontWeight: 800 }}>{item.FullName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>💼 Interviewer</span>
                      <span style={{ color: 'var(--text)' }}>{interviewerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>📅 Date & Time</span>
                      <span style={{ color: 'var(--text)' }}>
                        {item.ScheduledDate ? new Date(item.ScheduledDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Evaluation Section */}
                  {(Number(item.InterviewState) === 1 || Number(item.InterviewState) === 2) && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 600 }}>
                        <span style={{ color: 'var(--muted)' }}>Score / Rating</span>
                        <span style={{ color: 'var(--amber)', fontWeight: 800 }}>⭐ {item.Rating} / 10</span>
                      </div>
                      {rec && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 600 }}>
                          <span style={{ color: 'var(--muted)' }}>Recommendation</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, color: rec.color, background: rec.bg }}>
                            {rec.text}
                          </span>
                        </div>
                      )}
                      {item.FeedbackComments && (
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setExpandedComments(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            style={{
                              background: 'none',
                              border: 0,
                              padding: '4px 0',
                              color: 'var(--primary)',
                              fontSize: 11.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              outline: 'none'
                            }}
                          >
                            {expandedComments[idx] ? '📖 Hide Comments' : '📘 View Comments'}
                          </button>
                          
                          {expandedComments[idx] && (
                            <div style={{ marginTop: 8, background: 'var(--soft)', padding: 10, borderRadius: 10, borderLeft: '3px solid var(--primary)', fontSize: 12 }}>
                              <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Interviewer Comments</div>
                              <p style={{ color: 'var(--text)', fontWeight: 600, lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
                                "{item.FeedbackComments}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {item.DelayCancelReason && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                      <div style={{ background: 'var(--soft)', padding: 10, borderRadius: 10, borderLeft: '3px solid var(--orange)', fontSize: 12 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                          {Number(item.InterviewState) === 3 ? 'Delay Reason' : 'Cancellation Reason'}
                        </div>
                        <p style={{ color: 'var(--text)', fontWeight: 600, lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
                          "{item.DelayCancelReason}"
                        </p>
                      </div>
                    </div>
                  )}

                  {Number(item.InterviewState) === 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)', display: 'flex', gap: 10 }}>
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
                          height: 30,
                          border: '1.5px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          borderRadius: 8,
                          fontWeight: 700,
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
                          height: 30,
                          border: '1.5px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--red)',
                          borderRadius: 8,
                          fontWeight: 700,
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAICompareTab = () => {
    const states = {
      0: { text: 'New', color: 'var(--blue)', bg: 'var(--blue-soft)' },
      1: { text: 'Shortlisted', color: 'var(--orange)', bg: 'var(--orange-soft)' },
      2: { text: 'Rejected', color: 'var(--red)', bg: 'var(--red-soft)' },
      3: { text: 'Interviewing', color: '#6366f1', bg: '#e0e7ff' },
      4: { text: 'Selected', color: 'var(--green)', bg: 'var(--green-soft)' },
      5: { text: 'On Hold', color: 'var(--muted)', bg: 'var(--soft)' },
      6: { text: 'Hired', color: 'var(--green)', bg: 'var(--green-soft)' }
    };

    if (candidates.length < 2) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Insufficient Applicants</div>
          <p style={{ fontSize: 12.5, fontWeight: 600 }}>Please link at least 2 candidates to this requisition to perform an AI comparison analysis.</p>
        </div>
      );
    }

    const renderMarkdown = (md) => {
      if (!md) return null;
      const lines = md.split('\n');
      const elements = [];
      
      let inTable = false;
      let tableHeaders = [];
      let tableRows = [];
      let listItems = [];
      let inList = false;

      const flushTable = (key) => {
        if (tableRows.length > 0 || tableHeaders.length > 0) {
          elements.push(
            <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '16px 0', borderRadius: 12, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'var(--surface)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.05), rgba(99, 102, 241, 0.05))', borderBottom: '2px solid var(--border)' }}>
                    {tableHeaders.map((h, i) => (
                      <th key={i} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#7c3aed' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ borderBottom: rowIndex === tableRows.length - 1 ? 0 : '1px solid var(--border)', transition: 'background 0.15s' }} className="compare-table-tr">
                      {row.map((cell, cellIndex) => {
                        const cleanCell = cell.trim();
                        const isBadge = cleanCell.toLowerCase() === 'high' || cleanCell.toLowerCase() === 'medium' || cleanCell.toLowerCase() === 'low';
                        
                        let badgeStyle = {};
                        if (isBadge) {
                          const colors = {
                            high: { bg: 'var(--green-soft)', color: 'var(--green)' },
                            medium: { bg: 'var(--orange-soft)', color: 'var(--orange)' },
                            low: { bg: 'var(--red-soft)', color: 'var(--red)' }
                          };
                          const c = colors[cleanCell.toLowerCase()];
                          badgeStyle = {
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontWeight: 800,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            background: c.bg,
                            color: c.color
                          };
                        }

                        const boldParts = cleanCell.split(/\*\*(.*?)\*\*/g);
                        const formattedCell = boldParts.map((part, partIdx) => {
                          if (partIdx % 2 === 1) {
                            return <strong key={partIdx} style={{ fontWeight: 850, color: 'var(--text-dark)' }}>{part}</strong>;
                          }
                          return part;
                        });

                        return (
                          <td key={cellIndex} style={{ padding: '12px 14px', color: 'var(--text)', fontWeight: 550, lineHeight: 1.4 }}>
                            {isBadge ? <span style={badgeStyle}>{formattedCell}</span> : formattedCell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          tableHeaders = [];
          tableRows = [];
          inTable = false;
        }
      };

      const flushList = (key) => {
        if (listItems.length > 0) {
          elements.push(
            <ul key={`list-${key}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0 16px 6px', listStyleType: 'none', padding: 0 }}>
               {listItems.map((item, i) => (
                 <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: 'var(--text)', fontWeight: 550 }}>
                   <span style={{ color: '#7c3aed', fontSize: 13, marginTop: 1 }}>✨</span>
                   <div>{item}</div>
                 </li>
               ))}
            </ul>
          );
          listItems = [];
          inList = false;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('|')) {
          flushList(i);
          const cells = line.split('|').map(c => c.trim()).slice(1, -1);
          if (cells.length > 0 && cells[0].startsWith('---')) {
            continue;
          }
          if (!inTable) {
            inTable = true;
            tableHeaders = cells;
          } else {
            tableRows.push(cells);
          }
          continue;
        } else if (inTable) {
          flushTable(i);
        }

        if (line.startsWith('###')) {
          flushList(i);
          const title = line.replace(/^###\s*/, '');
          elements.push(
            <h4 key={`h3-${i}`} style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-dark)', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
              {title}
            </h4>
          );
          continue;
        } else if (line.startsWith('##')) {
          flushList(i);
          const title = line.replace(/^##\s*/, '');
          elements.push(
            <h3 key={`h2-${i}`} style={{ fontSize: 15, fontWeight: 950, color: '#7c3aed', marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔹 {title}
            </h3>
          );
          continue;
        } else if (line.startsWith('#')) {
          flushList(i);
          const title = line.replace(/^#\s*/, '');
          elements.push(
            <h2 key={`h1-${i}`} style={{ fontSize: 18, fontWeight: 950, color: '#7c3aed', marginTop: 16, marginBottom: 12 }}>
              {title}
            </h2>
          );
          continue;
        }

        if (line.startsWith('-') || line.startsWith('*')) {
          inList = true;
          const cleanItem = line.replace(/^[-*]\s*(✨)?\s*/, '').trim();
          const boldParts = cleanItem.split(/\*\*(.*?)\*\*/g);
          const formattedItem = boldParts.map((part, partIdx) => {
            if (partIdx % 2 === 1) {
              return <strong key={partIdx} style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{part}</strong>;
            }
            return part;
          });
          listItems.push(formattedItem);
          continue;
        } else if (inList) {
          flushList(i);
        }

        if (line === '') {
          continue;
        }

        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        const formattedParagraph = boldParts.map((part, partIdx) => {
          if (partIdx % 2 === 1) {
            return <strong key={partIdx} style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{part}</strong>;
          }
          return part;
        });

        elements.push(
          <p key={`p-${i}`} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontWeight: 550, marginBottom: 12 }}>
            {formattedParagraph}
          </p>
        );
      }

      if (inTable) flushTable(lines.length);
      if (inList) flushList(lines.length);

      return elements;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Select Candidates to Compare ({selectedCompareCandidates.length} / {candidates.length} Selected)
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button" 
                onClick={() => setSelectedCompareCandidates(candidates.map(c => c.CandidateID))}
                style={{ background: 'none', border: 0, color: 'var(--primary)', fontSize: 11, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Select All
              </button>
              <span style={{ color: 'var(--border2)' }}>|</span>
              <button 
                type="button" 
                onClick={() => setSelectedCompareCandidates([])}
                style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: 11, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {candidates.map(c => {
              const isSelected = selectedCompareCandidates.includes(c.CandidateID);
              const initials = c.FullName ? c.FullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
              const state = states[c.CandidateState] || { text: 'Unknown', color: 'var(--muted)', bg: 'var(--soft)' };
              return (
                <div 
                  key={c.CandidateID}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCompareCandidates(prev => prev.filter(id => id !== c.CandidateID));
                    } else {
                      setSelectedCompareCandidates(prev => [...prev, c.CandidateID]);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isSelected ? 'var(--primary-soft)' : 'var(--soft)',
                    border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="compare-candidate-card"
                >
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{ 
                      width: 16, 
                      height: 16, 
                      accentColor: 'var(--primary)',
                      cursor: 'pointer' 
                    }}
                  />
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.FullName}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span>{c.Source || 'Direct'}</span>
                      <span>•</span>
                      <span style={{ color: state.color }}>{state.text}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Comparison Focus Area</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { id: 'general', text: '🎯 General Suitability' },
              { id: 'technical', text: '💻 Technical Skill Match' },
              { id: 'experience', text: '💼 Experience & History' },
              { id: 'custom', text: '✍️ Custom Focus' }
            ].map(focus => {
              const isSel = compareFocus === focus.id;
              return (
                <button
                  key={focus.id}
                  type="button"
                  onClick={() => setCompareFocus(focus.id)}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: isSel ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isSel ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--surface)',
                    color: isSel ? '#fff' : 'var(--muted)',
                    boxShadow: isSel ? '0 2px 6px rgba(124,58,237,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {focus.text}
                </button>
              );
            })}
          </div>
          {compareFocus === 'custom' && (
            <textarea
              rows="3"
              value={customFocusText}
              onChange={e => setCustomFocusText(e.target.value)}
              placeholder="e.g. Focus on who has the strongest experience leading teams, or who has worked with AWS..."
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontSize: 13, marginTop: 4 }}
            />
          )}
        </div>

        <button
          type="button"
          disabled={comparing || selectedCompareCandidates.length < 2}
          onClick={handleAICompare}
          style={{
            width: '100%',
            height: 42,
            background: (comparing || selectedCompareCandidates.length < 2) ? 'var(--border2)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            border: 0,
            borderRadius: 12,
            fontWeight: 800,
            cursor: (comparing || selectedCompareCandidates.length < 2) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13.5,
            boxShadow: (comparing || selectedCompareCandidates.length < 2) ? 'none' : '0 4px 12px rgba(124,58,237,0.15)',
            transition: 'all 0.15s ease'
          }}
        >
          {comparing ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'dg-spin 0.8s linear infinite' }} />
              Running AI Comparative Analysis...
            </>
          ) : (
            <>✨ Compare Candidates with Claude AI</>
          )}
        </button>

        {comparisonReport && (() => {
          const displayText = compareLanguage === 'ar' 
            ? (translatedComparisonReport || comparisonReport) 
            : comparisonReport;
          return (
            <div className="ai-compare-card">
              <div className="ai-compare-header">
                <div className="ai-compare-title">
                  <span>✨ AI Candidate Comparison Report</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button 
                    type="button" 
                    disabled={translatingCompare}
                    onClick={handleTranslateComparison}
                    className="ai-compare-action-btn"
                    title={compareLanguage === 'ar' ? "Show English report" : "Translate report to Arabic"}
                  >
                    {translatingCompare ? '⏳ Translating...' : compareLanguage === 'ar' ? '🌐 English' : '🌐 Translate to Arabic'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleCopySummary(displayText)}
                    className="ai-compare-action-btn"
                    title="Copy Comparison Report"
                  >
                    📋 Copy Report
                  </button>
                </div>
              </div>
              <div 
                className="ai-compare-content" 
                style={{ 
                  direction: compareLanguage === 'ar' ? 'rtl' : 'ltr', 
                  textAlign: compareLanguage === 'ar' ? 'right' : 'left' 
                }}
              >
                {renderMarkdown(displayText)}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <style>{`
        .compare-candidate-card {
          transition: all 0.15s ease;
        }
        .compare-candidate-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15,23,42,0.03);
          border-color: var(--primary) !important;
        }
        .compare-table-tr:hover {
          background-color: rgba(124, 58, 237, 0.02);
        }
        .ai-compare-card {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%);
          border: 1.5px solid rgba(124, 58, 237, 0.12);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 20px -2px rgba(124, 58, 237, 0.03);
          position: relative;
          overflow: hidden;
          margin-top: 10px;
        }
        .ai-compare-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #7c3aed, #6366f1);
        }
        .ai-compare-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.06);
          padding-bottom: 10px;
        }
        .ai-compare-title {
          font-size: 12.5px;
          font-weight: 850;
          color: #7c3aed;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ai-compare-action-btn {
          background: none;
          border: 0;
          color: #6366f1;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          transition: all 0.2s;
          text-decoration: none;
        }
        .ai-compare-action-btn:hover {
          background: rgba(99, 102, 241, 0.08);
          color: #4f46e5;
        }
        .ai-compare-content {
          color: var(--text);
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
          onRowDoubleClick={handleViewDetails}
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
            setCandidates([]);
            setActiveTab('form');
            setModalError('');
            setShowAddModal(true);
          }}
          extraRowActions={[
            {
              label: '👁️ View Details',
              show: (row) => true,
              onClick: handleViewDetails
            },
            {
              label: '🚀 Submit Request',
              show: (row) => row.RequestState === 0 || row.RequestState === 4,
              onClick: (row) => handleSubmitRequest(row.RequestID)
            },
            {
              label: '📝 Edit Draft',
              show: (row) => row.RequestState === 0 || row.RequestState === 4,
              onClick: handleViewDetails
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
            },
            {
              label: '🔗 Copy Public Apply Link',
              show: (row) => row.RequestState === 2 || row.RequestState === 5,
              onClick: (row) => {
                const link = `${window.location.origin}${window.location.pathname}?apply=${row.RequestID}`;
                navigator.clipboard.writeText(link);
                alert(`Public Application URL copied to clipboard!\n${link}`);
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
            width: 'min(850px, 100vw)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                  {(() => {
                    const r = rows.find(x => Number(x.RequestID) === Number(formData.RequestID));
                    const isEd = r ? (r.RequestState === 0 || r.RequestState === 4) : true;
                    return isEd ? 'Edit Hiring Request' : 'View Hiring Request';
                  })()}
                </h3>
                {(() => {
                  const r = rows.find(x => Number(x.RequestID) === Number(formData.RequestID));
                  if (r && (r.RequestState === 2 || r.RequestState === 5)) {
                    return (
                      <button 
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}${window.location.pathname}?apply=${r.RequestID}`;
                          navigator.clipboard.writeText(link);
                          alert(`Public Application URL copied to clipboard!\n${link}`);
                        }}
                        style={{
                          height: 28,
                          padding: '0 10px',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          background: 'var(--soft)',
                          color: 'var(--orange)',
                          fontWeight: 700,
                          fontSize: 11.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        🔗 Copy Public Link
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'var(--muted)', fontWeight: 'bold' }}>&times;</button>
            </div>
            {(() => {
              if (!formData.RequestID) return null;
              const currentReq = rows.find(x => Number(x.RequestID) === Number(formData.RequestID)) || formData;
              const targetHeadCount = Number(currentReq.HeadCount || formData.HeadCount || 1);
              const totalApplicants = candidates.length;
              const activePipeline = candidates.filter(c => c.CandidateState === 1 || c.CandidateState === 3 || c.CandidateState === 4).length;
              const hiredCount = candidates.filter(c => c.CandidateState === 6).length;
              const fulfillmentPct = Math.min(100, Math.round((hiredCount / targetHeadCount) * 100));

              let daysActive = 0;
              if (currentReq.CreatedDate || currentReq.RequestDate) {
                const createdDate = new Date(currentReq.CreatedDate || currentReq.RequestDate);
                const diffTime = Math.abs(new Date() - createdDate);
                daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }

              return (
                <div style={{
                  background: 'var(--soft)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '14px 18px',
                  marginBottom: 18,
                  boxShadow: 'var(--shadow)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>🎯 Target Headcount</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{targetHeadCount} {targetHeadCount === 1 ? 'Opening' : 'Openings'}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>👥 Total Applicants</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--blue)' }}>{totalApplicants} Candidates</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>⚡ Active Pipeline</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#6366f1' }}>{activePipeline} Active</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>🏆 Hired / Fulfilled</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>{hiredCount} / {targetHeadCount} ({fulfillmentPct}%)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>⏱️ Days Active</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--amber)' }}>{daysActive} Days</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>
                      <span>Requisition Fulfillment Rate</span>
                      <span>{fulfillmentPct}% Completed</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--green))', width: `${fulfillmentPct}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 16 }}>
              {['form', 'comments', 'timeline', formData.RequestID ? 'candidates' : null, formData.RequestID ? 'interviews' : null, formData.RequestID ? 'ai-compare' : null].filter(Boolean).map(tab => (
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
                  {tab === 'form' ? '📄 Details' : tab === 'comments' ? '💬 Comments' : tab === 'timeline' ? '⏳ Timeline' : tab === 'candidates' ? '🔍 Candidates' : tab === 'ai-compare' ? '✨ AI Compare' : `📅 Interviews (${interviews.length})`}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
              {activeTab === 'form' && renderFormContent()}
              {activeTab === 'comments' && renderCommentsTab()}
              {activeTab === 'timeline' && renderTimelineTab()}
              {activeTab === 'candidates' && renderCandidatesTab()}
              {activeTab === 'interviews' && renderInterviewsTab()}
              {activeTab === 'ai-compare' && renderAICompareTab()}
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
    </div>
  );
}
