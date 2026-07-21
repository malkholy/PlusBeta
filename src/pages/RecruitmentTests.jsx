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
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6 bg-white/60 p-4 rounded-2xl shadow-sm backdrop-blur-md border border-white/50">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-tight drop-shadow-sm">
            Candidate Tests & Assessments
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Manage multiple-choice tests and generate questions with AI.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center gap-2"
        >
          <span className="material-icons text-sm">add</span>
          Create New Test
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100 flex items-center">
          <span className="material-icons mr-2">error_outline</span>
          {error}
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          onRowDoubleClick={handleRowDoubleClick}
          getRowId={(r) => r.TestID}
        />
      </div>

      {/* Side Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${showDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
        {editingTest && (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingTest.TestID === 0 ? 'New Test' : `Edit Test #${editingTest.TestID}`}
              </h2>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-5 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Test Title</label>
                  <input 
                    type="text" 
                    value={editingTest.TestTitle}
                    onChange={(e) => setEditingTest({...editingTest, TestTitle: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm p-3 transition-all outline-none"
                    placeholder="Enter test title..."
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Test Type</label>
                  <select
                    value={editingTest.TestType}
                    onChange={(e) => setEditingTest({...editingTest, TestType: e.target.value})}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm p-3 transition-all outline-none"
                  >
                    <option value="IQ">IQ Test</option>
                    <option value="English">English Proficiency</option>
                    <option value="Technical">Technical Skills</option>
                    <option value="Personality">Personality Assessment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* AI Generator Box */}
              <div className="relative overflow-hidden p-6 rounded-2xl border border-indigo-100 shadow-sm group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-icons text-6xl text-indigo-600">psychology</span>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <span className="material-icons text-indigo-600">auto_awesome</span>
                    Generate with Claude AI
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 bg-white/80 backdrop-blur border border-indigo-200 rounded-xl text-sm p-3 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      placeholder="E.g. Generate 5 intermediate English questions about past perfect tense"
                    />
                    <button
                      onClick={generateWithAI}
                      disabled={generating}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap flex items-center gap-2"
                    >
                      {generating ? (
                        <><span className="material-icons animate-spin text-sm">refresh</span> Generating...</>
                      ) : (
                        <><span className="material-icons text-sm">magic_button</span> Generate</>
                      )}
                    </button>
                  </div>
                  {aiError && <p className="text-red-500 text-sm font-medium mt-3 bg-red-50 p-2 rounded-lg border border-red-100">{aiError}</p>}
                </div>
              </div>

              {/* Questions List */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="material-icons text-gray-400">help_outline</span>
                    Questions <span className="bg-gray-200 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">{questions.length}</span>
                  </h3>
                  <button 
                    onClick={handleAddEmptyQuestion}
                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">add</span>
                    Add Manual Question
                  </button>
                </div>
                
                <div className="space-y-5">
                  {questions.map((q, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative group hover:border-indigo-200 hover:shadow-md transition-all duration-300">
                      <button 
                        onClick={() => removeQuestion(idx)}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                        title="Remove Question"
                      >
                        <span className="material-icons text-[20px]">delete</span>
                      </button>
                      
                      <div className="mb-4 pr-10">
                        <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Question {idx + 1}</label>
                        <textarea
                          value={q.QuestionText}
                          onChange={(e) => updateQuestion(idx, 'QuestionText', e.target.value)}
                          className="w-full text-sm p-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-y"
                          rows="2"
                          placeholder="Type your question here..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { key: 'OptionA', label: 'A' },
                          { key: 'OptionB', label: 'B' },
                          { key: 'OptionC', label: 'C' },
                          { key: 'OptionD', label: 'D' }
                        ].map((opt) => (
                          <div key={opt.key} className="flex items-center gap-3 bg-gray-50/50 p-2 border border-gray-100 rounded-xl focus-within:border-indigo-300 focus-within:bg-white transition-colors">
                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg shadow-sm ${q.CorrectAnswer === opt.label ? 'bg-green-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                              {opt.label}
                            </span>
                            <input 
                              type="text" 
                              value={q[opt.key]} 
                              onChange={(e) => updateQuestion(idx, opt.key, e.target.value)} 
                              className="w-full text-sm bg-transparent border-none p-1 focus:ring-0 outline-none" 
                              placeholder={`Option ${opt.label}...`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Correct Answer:</label>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map(val => (
                            <button
                              key={val}
                              onClick={() => updateQuestion(idx, 'CorrectAnswer', val)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                q.CorrectAnswer === val 
                                  ? 'bg-green-500 text-white shadow-md shadow-green-200 transform scale-110' 
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <div className="text-center py-12 bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                      <span className="material-icons text-5xl text-gray-300 mb-3 group-hover:text-indigo-300 transition-colors">quiz</span>
                      <p className="text-gray-500 font-medium">No questions added yet.</p>
                      <p className="text-sm text-gray-400 mt-1">Add one manually or let Claude AI generate them for you.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-end gap-3 z-10">
              <button 
                onClick={() => setShowDrawer(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTest}
                disabled={saving}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 shadow-md shadow-blue-200 transition-all flex items-center gap-2"
              >
                {saving ? (
                  <><span className="material-icons animate-spin text-[18px]">autorenew</span> Saving...</>
                ) : (
                  <><span className="material-icons text-[18px]">save</span> Save Test</>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overlay */}
      {showDrawer && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
