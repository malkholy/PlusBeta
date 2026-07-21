import { useState, useEffect } from 'react';
import { apiCall, getAnthropicAPIKey } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function RecruitmentTests(props) {
  const [rows, setRows] = useState([]);
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

  const columns = [
    { field: 'TestID', headerName: 'ID', width: 70 },
    { field: 'TestTitle', headerName: 'Test Title', flex: 1 },
    { field: 'TestType', headerName: 'Type', width: 120 },
    { field: 'CreatedBy', headerName: 'Created By', width: 120 },
    { field: 'CreatedDate', headerName: 'Date', width: 150 },
    { field: 'QuestionCount', headerName: 'Questions', width: 100 }
  ];

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetRecruitmentTests', {}, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setRows(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load tests.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRowDoubleClick(params) {
    const testRow = params.row;
    setEditingTest({
      TestID: testRow.TestID,
      TestTitle: testRow.TestTitle || '',
      TestType: testRow.TestType || ''
    });
    setShowDrawer(true);
    setQuestions([]);
    
    // Load questions
    try {
      const res = await apiCall('GetTestQuestions', { TestID: testRow.TestID }, {}, 'recruitment_tests');
      if (res.State === 0 || res.List0) {
        setQuestions(res.List0 || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleCreateNew() {
    setEditingTest({
      TestID: 0,
      TestTitle: '',
      TestType: 'IQ'
    });
    setQuestions([]);
    setShowDrawer(true);
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
            // strip markdown formatting if claude ignored the prompt
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

  return (
    <div className="rt-container">
      <div className="rt-header">
        <div className="rt-title-area">
          <h1>Candidate Tests & Assessments</h1>
          <p>Manage multiple-choice tests and generate questions with AI.</p>
        </div>
        <button className="rt-btn-primary" onClick={handleCreateNew}>
          <span className="material-icons" style={{fontSize: '18px'}}>add</span>
          Create New Test
        </button>
      </div>

      {error && (
        <div className="err-page">
          {error}
        </div>
      )}

      <div className="table-panel" style={{ flex: 1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          onRowDoubleClick={handleRowDoubleClick}
          getRowId={(r) => r.TestID}
        />
      </div>

      {/* Side Drawer */}
      <div className={`rt-drawer ${showDrawer ? 'open' : ''}`}>
        {editingTest && (
          <>
            <div className="rt-drawer-header">
              <h2>{editingTest.TestID === 0 ? 'New Test' : `Edit Test #${editingTest.TestID}`}</h2>
              <button className="rt-close-btn" onClick={() => setShowDrawer(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="rt-drawer-body">
              <div className="rt-form-grid">
                <div className="rt-field">
                  <label>Test Title</label>
                  <input 
                    type="text" 
                    value={editingTest.TestTitle}
                    onChange={(e) => setEditingTest({...editingTest, TestTitle: e.target.value})}
                    placeholder="Enter test title..."
                  />
                </div>
                <div className="rt-field">
                  <label>Test Type</label>
                  <select
                    value={editingTest.TestType}
                    onChange={(e) => setEditingTest({...editingTest, TestType: e.target.value})}
                  >
                    <option value="IQ">IQ Test</option>
                    <option value="English">English Proficiency</option>
                    <option value="Technical">Technical Skills</option>
                    <option value="Personality">Personality Assessment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="rt-ai-box">
                <span className="material-icons" style={{position:'absolute', right: '10px', top: '10px', fontSize: '64px', opacity: 0.1, color: '#3730a3'}}>psychology</span>
                <h3>
                  <span className="material-icons" style={{fontSize: '18px'}}>auto_awesome</span>
                  Generate with Claude AI
                </h3>
                <div className="rt-ai-input-row" style={{position: 'relative', zIndex: 2}}>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g. Generate 5 intermediate English questions about past perfect tense"
                  />
                  <button
                    className="rt-btn-primary"
                    onClick={generateWithAI}
                    disabled={generating}
                  >
                    {generating ? (
                      <><span className="material-icons spinner" style={{fontSize: '16px', width: '16px', height:'16px', borderTopColor: '#fff', marginRight: '4px'}}></span> Generating...</>
                    ) : (
                      <><span className="material-icons" style={{fontSize: '18px'}}>magic_button</span> Generate</>
                    )}
                  </button>
                </div>
                {aiError && <p style={{color: 'var(--red)', fontSize: '13px', marginTop: '12px'}}>{aiError}</p>}
              </div>

              <div className="rt-questions-section">
                <div className="rt-questions-header">
                  <h3>Questions <span style={{background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: 'var(--muted)'}}>{questions.length}</span></h3>
                  <button className="rt-add-btn" onClick={handleAddEmptyQuestion}>
                    <span className="material-icons" style={{fontSize: '16px'}}>add</span>
                    Add Manual Question
                  </button>
                </div>
                
                <div className="rt-questions-list">
                  {questions.map((q, idx) => (
                    <div key={idx} className="rt-question-card">
                      <button className="rt-del-q-btn" onClick={() => removeQuestion(idx)} title="Remove Question">
                        <span className="material-icons">delete</span>
                      </button>
                      
                      <span className="rt-q-label">Question {idx + 1}</span>
                      <textarea
                        className="rt-q-text"
                        value={q.QuestionText}
                        onChange={(e) => updateQuestion(idx, 'QuestionText', e.target.value)}
                        rows="2"
                        placeholder="Type your question here..."
                      />

                      <div className="rt-options-grid">
                        {[
                          { key: 'OptionA', label: 'A' },
                          { key: 'OptionB', label: 'B' },
                          { key: 'OptionC', label: 'C' },
                          { key: 'OptionD', label: 'D' }
                        ].map((opt) => (
                          <div key={opt.key} className={`rt-opt-row ${q.CorrectAnswer === opt.label ? 'is-correct' : ''}`}>
                            <div className="rt-opt-letter">{opt.label}</div>
                            <input 
                              type="text" 
                              value={q[opt.key]} 
                              onChange={(e) => updateQuestion(idx, opt.key, e.target.value)} 
                              placeholder={`Option ${opt.label}...`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="rt-correct-ans-row">
                        <span className="rt-correct-ans-label">Correct Answer:</span>
                        <div className="rt-ans-btns">
                          {['A', 'B', 'C', 'D'].map(val => (
                            <button
                              key={val}
                              onClick={() => updateQuestion(idx, 'CorrectAnswer', val)}
                              className={`rt-ans-btn ${q.CorrectAnswer === val ? 'active' : ''}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <div style={{textAlign: 'center', padding: '40px', border: '2px dashed var(--border)', borderRadius: '12px', background: '#f8fafc', color: 'var(--muted)'}}>
                      <span className="material-icons" style={{fontSize: '48px', opacity: 0.3, marginBottom: '12px'}}>quiz</span>
                      <div style={{fontWeight: '600', color: 'var(--text)'}}>No questions added yet.</div>
                      <div style={{fontSize: '13px', marginTop: '4px'}}>Add one manually or let Claude AI generate them for you.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rt-drawer-footer">
              <button className="rt-btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button>
              <button className="rt-btn-primary" onClick={handleSaveTest} disabled={saving}>
                {saving ? (
                  <><span className="material-icons spinner" style={{fontSize: '16px', width: '16px', height:'16px', borderTopColor: '#fff'}}></span> Saving...</>
                ) : (
                  <><span className="material-icons" style={{fontSize: '18px'}}>save</span> Save Test</>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {showDrawer && (
        <div className="rt-drawer-overlay" onClick={() => setShowDrawer(false)} />
      )}
    </div>
  );
}
