import { useState, useEffect } from 'react';
import { apiCall, getAnthropicAPIKey } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function RecruitmentTests(props) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  // AI Generator State
  const [aiPrompt, setAiPrompt] = useState('Generate 5 intermediate-level multiple-choice questions about English grammar.');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetRecruitmentTests', {}, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        const data = res.List0 || [];
        setRows(data);
        if (data.length > 0) {
          generateColumns(data[0]);
        } else {
          generateColumns({ TestID: 0, TestTitle: '', TestType: '', CreatedBy: '', CreatedDate: '', QuestionCount: 0 });
        }
      } else {
        setError(res.Message || 'Failed to load tests.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function generateColumns(sample) {
    if (!sample) return;
    const keys = Object.keys(sample);
    const cols = keys.map(k => {
      let label = k.replace(/([A-Z])/g, ' $1').trim();
      label = label.charAt(0).toUpperCase() + label.slice(1);
      if (k === 'TestID') label = 'ID';
      if (k === 'TestTitle') label = 'Test Title';
      if (k === 'TestType') label = 'Category / Type';
      if (k === 'QuestionCount') label = 'Questions';

      return {
        key: k,
        label,
        render: (val, row, search, highlight) => {
          if (k === 'QuestionCount') {
            return (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'var(--primary-soft)',
                padding: '3px 8px',
                borderRadius: 6
              }}>
                📝 {val || 0} Questions
              </span>
            );
          }
          if (k === 'TestType') {
            return (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text)',
                background: 'var(--soft)',
                padding: '3px 8px',
                borderRadius: 6
              }}>
                {val}
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

    setColumns(cols);
  }

  function handleOpenDrawer(testRow) {
    if (testRow) {
      setEditingTest({
        TestID: testRow.TestID,
        TestTitle: testRow.TestTitle || '',
        TestType: testRow.TestType || ''
      });
      loadQuestions(testRow.TestID);
    } else {
      setEditingTest({
        TestID: 0,
        TestTitle: '',
        TestType: 'IQ'
      });
      setQuestions([]);
    }
    setShowDrawer(true);
  }

  async function loadQuestions(testId) {
    setQuestions([]);
    try {
      const res = await apiCall('GetTestQuestions', { TestID: testId }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setQuestions(res.List0 || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveTest() {
    if (!editingTest.TestTitle) return alert("Title is required");
    
    setSaving(true);
    try {
      // 1. Save Header
      const headerRes = await apiCall('SaveRecruitmentTest', editingTest, {}, 'recruitment_tests');
      if (headerRes.State !== 0) throw new Error(headerRes.Message);
      
      const newTestID = headerRes.List0[0].TestID;

      // 2. Save Questions
      const qsRes = await apiCall('SaveTestQuestions', {
        TestID: newTestID,
        Questions: JSON.stringify(questions)
      }, {}, 'recruitment_tests');

      if (qsRes.State !== 0) throw new Error(qsRes.Message);

      setShowDrawer(false);
      loadTests();
    } catch (e) {
      alert("Error saving test: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleAddEmptyQuestion() {
    setQuestions([
      ...questions,
      {
        QuestionText: '',
        OptionA: '', OptionB: '', OptionC: '', OptionD: '',
        CorrectAnswer: 'A'
      }
    ]);
  }

  function updateQuestion(index, field, value) {
    const newQs = [...questions];
    newQs[index][field] = value;
    setQuestions(newQs);
  }

  function removeQuestion(index) {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  }

  async function generateWithAI() {
    if (!aiPrompt) return;
    setGenerating(true);
    setAiError('');

    try {
      const apiKey = await getAnthropicAPIKey();
      if (!apiKey) {
        throw new Error("No Anthropic API key found. Please set it in Settings.");
      }

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
        console.warn("Failed to fetch models, using fallback.", e);
      }

      let generatedJson = null;
      let lastErr = null;

      const systemPrompt = `You are a test-generation AI. The user will ask you to generate multiple-choice questions. 
You MUST output strictly in raw JSON format, without any markdown formatting or code blocks. The JSON must be an array of objects, where each object has:
- QuestionText (string)
- OptionA (string)
- OptionB (string)
- OptionC (string)
- OptionD (string)
- CorrectAnswer (string: "A", "B", "C", or "D")`;

      for (const currentModel of modelsToTry) {
        try {
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
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content: aiPrompt
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            let parsedErr;
            try { parsedErr = JSON.parse(errText); } catch (e) {}
            if (response.status === 404 && parsedErr?.error?.type === 'not_found_error') {
              lastErr = new Error(`Model ${currentModel} not found.`);
              continue;
            }
            throw new Error(`Claude API error (${response.status}): ${errText}`);
          }

          const resJson = await response.json();
          const textResponse = resJson.content?.find(b => b.type === 'text')?.text || '';
          
          try {
            const cleanText = textResponse.replace(/^```json/g, '').replace(/```$/g, '').trim();
            generatedJson = JSON.parse(cleanText);
            break; 
          } catch(e) {
            throw new Error("Failed to parse Claude output as JSON: " + textResponse);
          }
        } catch (loopErr) {
          lastErr = loopErr;
          if (!loopErr.message.includes('not_found_error')) {
            throw loopErr;
          }
        }
      }

      if (generatedJson && Array.isArray(generatedJson)) {
        setQuestions(prev => [...prev, ...generatedJson]);
      } else if (lastErr) {
        throw lastErr;
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  const renderDrawer = () => {
    if (!editingTest) return null;

    return (
      <>
        <div
          onClick={() => setShowDrawer(false)}
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
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
              {editingTest.TestID === 0 ? 'Create New Test' : `Test Configuration #${editingTest.TestID}`}
            </h3>
            <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'var(--muted)', fontWeight: 'bold' }}>&times;</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Form */}
            <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Test Title</label>
                <input 
                  type="text" 
                  value={editingTest.TestTitle}
                  onChange={(e) => setEditingTest({...editingTest, TestTitle: e.target.value})}
                  placeholder="e.g. Senior Software Engineer IQ & Aptitude"
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13, fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Category / Type</label>
                <select
                  value={editingTest.TestType}
                  onChange={(e) => setEditingTest({...editingTest, TestType: e.target.value})}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="IQ">IQ & Aptitude Test</option>
                  <option value="English">English Proficiency</option>
                  <option value="Technical">Technical Skills</option>
                  <option value="Personality">Personality Assessment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* AI Generator Box */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✨ Generate Questions with Claude AI
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Generate 5 intermediate English questions about past perfect tense"
                  style={{ flex: 1, height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={generating}
                  style={{
                    height: 38,
                    padding: '0 18px',
                    border: 0,
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: '#fff',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    opacity: generating ? 0.7 : 1
                  }}
                >
                  {generating ? 'Generating...' : '✨ Auto-Generate'}
                </button>
              </div>
              {aiError && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                  ⚠️ {aiError}
                </div>
              )}
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Questions List ({questions.length})
                </div>
                <button
                  type="button"
                  onClick={handleAddEmptyQuestion}
                  style={{
                    background: 'var(--soft)',
                    border: '1px solid var(--border)',
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                >
                  + Add Question
                </button>
              </div>

              {questions.length === 0 ? (
                <div style={{ padding: '32px 16px', background: 'var(--soft)', border: '1px stroke var(--border)', borderRadius: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                  📝 No questions configured yet. Add questions manually or use AI to generate them.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {questions.map((q, idx) => (
                    <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.015)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>
                          Question #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          style={{ background: 'none', border: 0, color: 'var(--red)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>

                      <textarea
                        rows="2"
                        value={q.QuestionText}
                        onChange={(e) => updateQuestion(idx, 'QuestionText', e.target.value)}
                        placeholder="Type question text..."
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontSize: 13, marginBottom: 12, resize: 'vertical' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        {[
                          { key: 'OptionA', label: 'A' },
                          { key: 'OptionB', label: 'B' },
                          { key: 'OptionC', label: 'C' },
                          { key: 'OptionD', label: 'D' }
                        ].map((opt) => (
                          <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: q.CorrectAnswer === opt.label ? 'var(--green)' : 'var(--muted)' }}>
                              {opt.label}.
                            </span>
                            <input
                              type="text"
                              value={q[opt.key]}
                              onChange={(e) => updateQuestion(idx, opt.key, e.target.value)}
                              placeholder={`Option ${opt.label}...`}
                              style={{ width: '100%', border: 0, background: 'transparent', outline: 'none', fontSize: 12.5, color: 'var(--text)' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Correct Answer:</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['A', 'B', 'C', 'D'].map((ans) => (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => updateQuestion(idx, 'CorrectAnswer', ans)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: q.CorrectAnswer === ans ? 'var(--green)' : 'var(--soft)',
                                color: q.CorrectAnswer === ans ? '#fff' : 'var(--text)',
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {ans}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTest}
              disabled={saving}
              style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}
            >
              {saving ? 'Saving...' : 'Save Test'}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div className="err-page">
          {error}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Candidate Tests & Assessments"
          subtitle="Manage multiple-choice tests, IQ assessments, and generate question sets with AI"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadTests}
          addText="+ Create New Test"
          onAdd={() => handleOpenDrawer(null)}
          onRowClick={(row) => handleOpenDrawer(row)}
        />
      </div>

      {showDrawer && renderDrawer()}
    </div>
  );
}
