import { useState, useEffect } from 'react';
import { apiCall, uploadToCloudinary } from '../shared/api.js';

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

export default function CandidatePortal() {
  const [candidate, setCandidate] = useState(() => {
    const saved = sessionStorage.getItem('CandidatePortalUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Login Form State
  const [phone, setPhone] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Portal View State
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'tests'
  const [assignedTests, setAssignedTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // Helper to parse JSON string safely
  function parseJSON(str, fallback) {
    if (!str) return fallback;
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      return fallback;
    }
  }

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    FullName: '',
    Email: '',
    Government: '',
    City: '',
    Address: '',
    CVFileName: '',
    CVFileContent: '',
    ProfilePhoto: '',
    DateOfBirth: '',
    ExpectedJoiningDate: '',
    ExpectedSalary: '',
    Education: {
      Degree: '',
      University: '',
      Major: '',
      GraduationYear: '',
      Grade: ''
    },
    WorkExperiences: []
  });

  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Active Quiz / Test-Taking State
  const [activeQuiz, setActiveQuiz] = useState(null); // { test, questions: [] }
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionID]: 'A' }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null); // { score, total, percentage }

  useEffect(() => {
    if (candidate) {
      const edu = parseJSON(candidate.EducationDetails, { Degree: '', University: '', Major: '', GraduationYear: '', Grade: '' });
      const workExps = parseJSON(candidate.WorkExperienceDetails, []);

      setProfileForm({
        FullName: candidate.FullName || '',
        Email: candidate.Email || '',
        Government: candidate.Government || '',
        City: candidate.City || '',
        Address: candidate.Address || '',
        CVFileName: candidate.CVFileName || '',
        CVFileContent: candidate.CVFileContent || '',
        ProfilePhoto: candidate.ProfilePhoto || '',
        DateOfBirth: candidate.DateOfBirth ? candidate.DateOfBirth.split('T')[0] : '',
        ExpectedJoiningDate: candidate.ExpectedJoiningDate ? candidate.ExpectedJoiningDate.split('T')[0] : '',
        ExpectedSalary: candidate.ExpectedSalary || '',
        Education: edu || { Degree: '', University: '', Major: '', GraduationYear: '', Grade: '' },
        WorkExperiences: Array.isArray(workExps) ? workExps : []
      });
      loadAssignedTests(candidate.CandidateID);
    }
  }, [candidate]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!phone || !accessPassword) {
      setLoginError('Please enter both your mobile number and access password.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');

    try {
      const res = await apiCall('CandidateLogin', { Phone: phone.trim(), AccessPassword: accessPassword.trim() }, {}, 'recruitment_tests');
      if (res.State === 0 && res.List0 && res.List0.length > 0) {
        const candData = res.List0[0];
        setCandidate(candData);
        sessionStorage.setItem('CandidatePortalUser', JSON.stringify(candData));
      } else {
        setLoginError(res.Message || 'Invalid mobile number or access password.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    setCandidate(null);
    sessionStorage.removeItem('CandidatePortalUser');
    setActiveQuiz(null);
    setQuizResult(null);
  }

  async function loadAssignedTests(candId) {
    setLoadingTests(true);
    try {
      const res = await apiCall('GetCandidateAssignedTests', { CandidateID: candId }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setAssignedTests(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load tests:', e);
    } finally {
      setLoadingTests(false);
    }
  }

  async function handleStartTest(testItem) {
    try {
      const res = await apiCall('GetTestQuestions', { TestID: testItem.TestID }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        const qs = res.List0 || [];
        if (qs.length === 0) {
          alert('This test has no questions configured yet.');
          return;
        }
        setActiveQuiz({
          testItem,
          questions: qs
        });
        setCurrentQIndex(0);
        setUserAnswers({});
        setQuizResult(null);
      } else {
        alert('Failed to load test questions.');
      }
    } catch (err) {
      alert('Error starting test: ' + err.message);
    }
  }

  function handleSelectOption(questionId, answerKey) {
    setUserAnswers({
      ...userAnswers,
      [questionId]: answerKey
    });
  }

  async function handleSubmitQuiz() {
    if (!activeQuiz) return;
    const { questions, testItem } = activeQuiz;
    
    // Calculate total correct & build detailed breakdown
    let correctCount = 0;
    const breakdown = questions.map(q => {
      const selected = userAnswers[q.QuestionID] || null;
      const isCorrect = selected === q.CorrectAnswer;
      if (isCorrect) correctCount++;
      return {
        QuestionID: q.QuestionID,
        QuestionText: q.QuestionText,
        OptionA: q.OptionA,
        OptionB: q.OptionB,
        OptionC: q.OptionC,
        OptionD: q.OptionD,
        CorrectAnswer: q.CorrectAnswer,
        SelectedAnswer: selected,
        IsCorrect: isCorrect
      };
    });

    const totalQs = questions.length;
    const percentage = Math.round((correctCount / totalQs) * 100);

    setSubmittingQuiz(true);
    try {
      const res = await apiCall('SaveCandidateTestResult', {
        ResultID: testItem.ResultID,
        Score: percentage,
        Status: 'Completed',
        AnswersDetails: JSON.stringify(breakdown)
      }, {}, 'recruitment_tests');

      if (res.State === 0) {
        setQuizResult({
          score: correctCount,
          total: totalQs,
          percentage
        });
        loadAssignedTests(candidate.CandidateID);
      } else {
        alert(res.Message || 'Failed to submit test result.');
      }
    } catch (e) {
      alert('Error submitting test: ' + e.message);
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCV(true);
    try {
      const url = await uploadToCloudinary(file);
      setProfileForm(prev => ({
        ...prev,
        CVFileName: file.name,
        CVFileContent: url
      }));
    } catch (err) {
      alert('File upload failed: ' + err.message);
    } finally {
      setUploadingCV(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(file);
      setProfileForm(prev => ({
        ...prev,
        ProfilePhoto: url
      }));
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleAddWorkExp() {
    setProfileForm(prev => ({
      ...prev,
      WorkExperiences: [
        ...prev.WorkExperiences,
        {
          CompanyName: '',
          JobTitle: '',
          StartDate: '',
          EndDate: '',
          IsCurrent: false,
          Responsibilities: '',
          ReasonForLeaving: ''
        }
      ]
    }));
  }

  function handleUpdateWorkExp(index, field, value) {
    const updated = [...profileForm.WorkExperiences];
    updated[index][field] = value;
    setProfileForm(prev => ({ ...prev, WorkExperiences: updated }));
  }

  function handleRemoveWorkExp(index) {
    const updated = [...profileForm.WorkExperiences];
    updated.splice(index, 1);
    setProfileForm(prev => ({ ...prev, WorkExperiences: updated }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');

    if (!profileForm.FullName || !profileForm.Email || !profileForm.Government || !profileForm.City || !profileForm.Address || !profileForm.DateOfBirth || !profileForm.ExpectedJoiningDate || !profileForm.ExpectedSalary) {
      setProfileMsg('❌ All Personal & Expectations fields (Full Name, Email, Government, City, Address, Date of Birth, Expected Joining Date, Expected Salary) are mandatory.');
      setSavingProfile(false);
      return;
    }
    try {
      const res = await apiCall('UpdateCandidateProfile', {
        CandidateID: candidate.CandidateID,
        FullName: profileForm.FullName,
        Email: profileForm.Email,
        Government: profileForm.Government,
        City: profileForm.City,
        Address: profileForm.Address,
        CVFileName: profileForm.CVFileName,
        CVFileContent: profileForm.CVFileContent,
        ProfilePhoto: profileForm.ProfilePhoto,
        DateOfBirth: profileForm.DateOfBirth,
        ExpectedJoiningDate: profileForm.ExpectedJoiningDate,
        ExpectedSalary: profileForm.ExpectedSalary,
        EducationDetails: JSON.stringify(profileForm.Education),
        WorkExperienceDetails: JSON.stringify(profileForm.WorkExperiences)
      }, {}, 'recruitment_tests');

      if (res.State === 0) {
        setProfileMsg('✅ Profile updated successfully!');
        const updatedCand = {
          ...candidate,
          ...profileForm,
          EducationDetails: JSON.stringify(profileForm.Education),
          WorkExperienceDetails: JSON.stringify(profileForm.WorkExperiences)
        };
        setCandidate(updatedCand);
        sessionStorage.setItem('CandidatePortalUser', JSON.stringify(updatedCand));
      } else {
        setProfileMsg('❌ ' + (res.Message || 'Failed to update profile.'));
      }
    } catch (err) {
      setProfileMsg('❌ Error updating profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  // 1. Render Login Screen
  if (!candidate) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          width: '100%',
          maxWidth: 440,
          padding: 36,
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
              marginBottom: 16,
              boxShadow: '0 10px 20px rgba(37,99,235,0.3)'
            }}>
              📝
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
              Candidate Web Portal
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#64748b' }}>
              Sign in with your mobile number and HR access PIN to complete your application.
            </p>
          </div>

          {loginError && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 01012345678"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Access Password (6-Digit PIN)
              </label>
              <input
                type="password"
                value={accessPassword}
                onChange={e => setAccessPassword(e.target.value)}
                placeholder="e.g. 784920"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              style={{
                height: 46,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 0,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: 8,
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                opacity: loggingIn ? 0.7 : 1
              }}
            >
              {loggingIn ? 'Authenticating...' : 'Sign In to Candidate Portal'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            Don't have an Access PIN? Please contact your HR Recruiter.
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Quiz Interface if an active quiz is running
  if (activeQuiz) {
    const { questions, testItem } = activeQuiz;

    if (quizResult) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)',
            maxWidth: 520,
            width: '100%',
            padding: 40,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
              Test Completed!
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 24px 0' }}>
              Thank you for completing the <strong>{testItem.TestTitle}</strong>. Your score has been submitted to HR.
            </p>

            <div style={{
              background: '#f1f5f9',
              borderRadius: 20,
              padding: 24,
              marginBottom: 28,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                Your Final Score
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: quizResult.percentage >= 60 ? '#16a34a' : '#dc2626' }}>
                {quizResult.percentage}%
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginTop: 4 }}>
                {quizResult.score} out of {quizResult.total} questions answered correctly
              </div>
            </div>

            <button
              onClick={() => setActiveQuiz(null)}
              style={{
                height: 44,
                padding: '0 28px',
                background: '#2563eb',
                color: '#ffffff',
                border: 0,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const currentQ = questions[currentQIndex];
    const progressPct = Math.round(((currentQIndex + 1) / questions.length) * 100);

    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Quiz Top Header */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              {testItem.TestTitle}
            </h3>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Question {currentQIndex + 1} of {questions.length}
            </span>
          </div>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit this test? Progress will be lost.')) {
                setActiveQuiz(null);
              }
            }}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 800,
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            Exit Test
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 4, background: '#e2e8f0', width: '100%' }}>
          <div style={{ height: '100%', background: '#2563eb', width: `${progressPct}%`, transition: 'width 0.3s' }} />
        </div>

        {/* Quiz Question Body */}
        <div style={{ flex: 1, maxWidth: 720, width: '100%', margin: '32px auto', padding: '0 20px', boxSizing: 'border-box' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            padding: 32,
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 12 }}>
              Question {currentQIndex + 1}
            </div>

            <h2 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.5 }}>
              {currentQ.QuestionText}
            </h2>

            {/* Answer Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'A', text: currentQ.OptionA },
                { key: 'B', text: currentQ.OptionB },
                { key: 'C', text: currentQ.OptionC },
                { key: 'D', text: currentQ.OptionD }
              ].map(opt => {
                const isSelected = userAnswers[currentQ.QuestionID] === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleSelectOption(currentQ.QuestionID, opt.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: isSelected ? '#2563eb' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13
                    }}>
                      {opt.key}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? '#1e40af' : '#1e293b' }}>
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(prev => prev - 1)}
              style={{
                height: 42,
                padding: '0 20px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                color: '#475569',
                cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentQIndex === 0 ? 0.5 : 1
              }}
            >
              Previous
            </button>

            {currentQIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(prev => prev + 1)}
                style={{
                  height: 42,
                  padding: '0 24px',
                  border: 0,
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz}
                style={{
                  height: 42,
                  padding: '0 28px',
                  border: 0,
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                  opacity: submittingQuiz ? 0.7 : 1
                }}
              >
                {submittingQuiz ? 'Submitting...' : 'Submit Test Results ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Main Portal Dashboard
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Top Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 32px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {profileForm.ProfilePhoto ? (
            <img
              src={profileForm.ProfilePhoto}
              alt="Avatar"
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
            />
          ) : (
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800
            }}>
              {candidate.FullName ? candidate.FullName.charAt(0).toUpperCase() : '👤'}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              {candidate.FullName}
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Requisition: {candidate.PositionTitle} ({candidate.Department})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>
            📞 {candidate.Phone}
          </div>
          <button
            onClick={handleLogout}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 800,
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 960, margin: '32px auto', padding: '0 24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1.5px solid #e2e8f0', marginBottom: 24 }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              border: 0,
              background: 'none',
              borderBottom: activeTab === 'profile' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'profile' ? '#2563eb' : '#64748b',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            👤 My Extended Profile & Resume
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            style={{
              border: 0,
              background: 'none',
              borderBottom: activeTab === 'tests' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'tests' ? '#2563eb' : '#64748b',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            📝 My Assigned Tests ({assignedTests.length})
          </button>
        </div>

        {/* TAB 1: ASSIGNED TESTS */}
        {activeTab === 'tests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                Assigned Assessment Tests
              </h3>
              <button
                onClick={() => loadAssignedTests(candidate.CandidateID)}
                style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Refresh
              </button>
            </div>

            {loadingTests ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                Loading assigned tests...
              </div>
            ) : assignedTests.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: 20,
                padding: 48,
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                  No Active Tests Assigned
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                  Your HR Recruiter has not assigned any assessment tests yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {assignedTests.map((t, idx) => {
                  const isCompleted = t.Status === 'Completed' || (t.Score !== null && t.Score !== undefined);

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 18,
                        padding: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between'
                      }}
                    >
                      <div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase'
                        }}>
                          {t.TestType}
                        </span>
                        <h4 style={{ margin: '10px 0 6px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          {t.TestTitle}
                        </h4>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Assigned: {t.TestDate ? new Date(t.TestDate).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isCompleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 8 }}>
                              Completed: {t.Score}%
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartTest(t)}
                            style={{
                              width: '100%',
                              height: 38,
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#ffffff',
                              border: 0,
                              borderRadius: 10,
                              fontWeight: 800,
                              fontSize: 13,
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                            }}
                          >
                            Start Assessment Test →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXTENDED PROFILE FORM */}
        {activeTab === 'profile' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              My Candidate Extended Profile
            </h3>

            {profileMsg && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* SECTION 1: PROFILE PHOTO */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                {profileForm.ProfilePhoto ? (
                  <img
                    src={profileForm.ProfilePhoto}
                    alt="Profile Avatar"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }}
                  />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#64748b' }}>
                    📷
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    style={{ fontSize: 13 }}
                  />
                  {uploadingPhoto && <span style={{ fontSize: 12, color: '#2563eb', marginLeft: 8 }}>Uploading Photo...</span>}
                </div>
              </div>

              {/* SECTION 2: PERSONAL & COMPENSATION INFO */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  1. Personal & Expectations
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Full Name <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.FullName}
                      onChange={e => setProfileForm({ ...profileForm, FullName: e.target.value })}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Email Address <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={profileForm.Email}
                      onChange={e => setProfileForm({ ...profileForm, Email: e.target.value })}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Date of Birth <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={profileForm.DateOfBirth}
                      onChange={e => setProfileForm({ ...profileForm, DateOfBirth: e.target.value })}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Expected Joining Date <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={profileForm.ExpectedJoiningDate}
                      onChange={e => setProfileForm({ ...profileForm, ExpectedJoiningDate: e.target.value })}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Expected Salary <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.ExpectedSalary}
                      onChange={e => setProfileForm({ ...profileForm, ExpectedSalary: e.target.value })}
                      placeholder="e.g. 25,000 EGP"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      Government / State <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <select
                      value={profileForm.Government}
                      onChange={e => {
                        const gov = e.target.value;
                        const availableCities = EGYPT_LOCATIONS[gov] || [];
                        setProfileForm({
                          ...profileForm,
                          Government: gov,
                          City: availableCities.length > 0 ? availableCities[0] : ''
                        });
                      }}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
                      required
                    >
                      <option value="">Select Government / State...</option>
                      {Object.keys(EGYPT_LOCATIONS).map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      City / Area <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                    </label>
                    <select
                      value={profileForm.City}
                      onChange={e => setProfileForm({ ...profileForm, City: e.target.value })}
                      disabled={!profileForm.Government}
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, background: '#fff', boxSizing: 'border-box', opacity: !profileForm.Government ? 0.6 : 1 }}
                      required
                    >
                      <option value="">Select City / Area...</option>
                      {(EGYPT_LOCATIONS[profileForm.Government] || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                    Detailed Address <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.Address}
                    onChange={e => setProfileForm({ ...profileForm, Address: e.target.value })}
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              {/* SECTION 3: EDUCATION */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. Education Background
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Degree / Qualification</label>
                    <input
                      type="text"
                      value={profileForm.Education.Degree}
                      onChange={e => setProfileForm({
                        ...profileForm,
                        Education: { ...profileForm.Education, Degree: e.target.value }
                      })}
                      placeholder="e.g. Bachelor's Degree"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>University / Institute</label>
                    <input
                      type="text"
                      value={profileForm.Education.University}
                      onChange={e => setProfileForm({
                        ...profileForm,
                        Education: { ...profileForm.Education, University: e.target.value }
                      })}
                      placeholder="e.g. Cairo University"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Major / Field of Study</label>
                    <input
                      type="text"
                      value={profileForm.Education.Major}
                      onChange={e => setProfileForm({
                        ...profileForm,
                        Education: { ...profileForm.Education, Major: e.target.value }
                      })}
                      placeholder="e.g. Computer Science"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Graduation Year</label>
                    <input
                      type="text"
                      value={profileForm.Education.GraduationYear}
                      onChange={e => setProfileForm({
                        ...profileForm,
                        Education: { ...profileForm.Education, GraduationYear: e.target.value }
                      })}
                      placeholder="e.g. 2022"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Grade / GPA</label>
                    <input
                      type="text"
                      value={profileForm.Education.Grade}
                      onChange={e => setProfileForm({
                        ...profileForm,
                        Education: { ...profileForm.Education, Grade: e.target.value }
                      })}
                      placeholder="e.g. Very Good / 3.4"
                      style={{ width: '100%', height: 40, padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: 10, outline: 'none', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: WORK EXPERIENCE REPEATER */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    3. Work Experience ({profileForm.WorkExperiences.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddWorkExp}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Work Experience
                  </button>
                </div>

                {profileForm.WorkExperiences.length === 0 ? (
                  <div style={{ padding: 24, background: '#f8fafc', border: '1px stroke #cbd5e1', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                    💼 No work experiences added yet. Click above to add your employment history.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {profileForm.WorkExperiences.map((exp, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase' }}>
                            Experience #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveWorkExp(idx)}
                            style={{ background: 'none', border: 0, color: '#dc2626', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Company Name</label>
                            <input
                              type="text"
                              value={exp.CompanyName}
                              onChange={e => handleUpdateWorkExp(idx, 'CompanyName', e.target.value)}
                              placeholder="e.g. GLC Paints"
                              style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Job Title</label>
                            <input
                              type="text"
                              value={exp.JobTitle}
                              onChange={e => handleUpdateWorkExp(idx, 'JobTitle', e.target.value)}
                              placeholder="e.g. Senior Accountant"
                              style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 12, alignItems: 'center' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Start Date</label>
                            <input
                              type="date"
                              value={exp.StartDate}
                              onChange={e => handleUpdateWorkExp(idx, 'StartDate', e.target.value)}
                              style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>End Date</label>
                            <input
                              type="date"
                              value={exp.EndDate}
                              disabled={exp.IsCurrent}
                              onChange={e => handleUpdateWorkExp(idx, 'EndDate', e.target.value)}
                              style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none', opacity: exp.IsCurrent ? 0.5 : 1 }}
                            />
                          </div>
                          <div style={{ paddingTop: 18 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!exp.IsCurrent}
                                onChange={e => handleUpdateWorkExp(idx, 'IsCurrent', e.target.checked)}
                              />
                              Current Job
                            </label>
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Main Responsibilities</label>
                          <textarea
                            rows="2"
                            value={exp.Responsibilities}
                            onChange={e => handleUpdateWorkExp(idx, 'Responsibilities', e.target.value)}
                            placeholder="Key duties and achievements..."
                            style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none', resize: 'vertical' }}
                          />
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>Reason for Leaving</label>
                          <input
                            type="text"
                            value={exp.ReasonForLeaving}
                            onChange={e => handleUpdateWorkExp(idx, 'ReasonForLeaving', e.target.value)}
                            placeholder="e.g. Career growth / relocation"
                            style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12.5, outline: 'none' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: CV ATTACHMENT */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>CV / Resume Attachment</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,image/*"
                    style={{ fontSize: 13 }}
                  />
                  {uploadingCV && <span style={{ fontSize: 12, color: '#2563eb' }}>Uploading...</span>}
                </div>
                {profileForm.CVFileContent && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    📎 Current Attachment:{' '}
                    <a href={profileForm.CVFileContent} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>
                      {profileForm.CVFileName || 'Download CV'}
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{
                    height: 44,
                    padding: '0 28px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                  }}
                >
                  {savingProfile ? 'Saving...' : 'Save Extended Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
