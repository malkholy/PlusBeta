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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Candidate Tests & Assessments
          </h1>
          <p className="text-gray-500 mt-1">Manage multiple-choice tests and generate questions with AI.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          + Create New Test
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
                  <input 
                    type="text" 
                    value={editingTest.TestTitle}
                    onChange={(e) => setEditingTest({...editingTest, TestTitle: e.target.value})}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2.5 border"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                  <select
                    value={editingTest.TestType}
                    onChange={(e) => setEditingTest({...editingTest, TestType: e.target.value})}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2.5 border"
                  >
                    <option value="IQ">IQ Test</option>
                    <option value="English">English</option>
                    <option value="Technical">Technical</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* AI Generator Box */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center">
                  <span className="material-icons mr-1 text-base">auto_awesome</span>
                  Generate with Claude AI
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 border-indigo-200 rounded-lg text-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 border"
                    placeholder="E.g. Generate 5 intermediate English questions"
                  />
                  <button
                    onClick={generateWithAI}
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                {aiError && <p className="text-red-500 text-xs mt-2">{aiError}</p>}
              </div>

              {/* Questions List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Questions ({questions.length})</h3>
                  <button 
                    onClick={handleAddEmptyQuestion}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    + Add Manual Question
                  </button>
                </div>
                
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group">
                      <button 
                        onClick={() => removeQuestion(idx)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                      <div className="mb-3 pr-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Question {idx + 1}</label>
                        <textarea
                          value={q.QuestionText}
                          onChange={(e) => updateQuestion(idx, 'QuestionText', e.target.value)}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          rows="2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-4 text-gray-400">A</span>
                          <input type="text" value={q.OptionA} onChange={(e) => updateQuestion(idx, 'OptionA', e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-4 text-gray-400">B</span>
                          <input type="text" value={q.OptionB} onChange={(e) => updateQuestion(idx, 'OptionB', e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-4 text-gray-400">C</span>
                          <input type="text" value={q.OptionC} onChange={(e) => updateQuestion(idx, 'OptionC', e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-4 text-gray-400">D</span>
                          <input type="text" value={q.OptionD} onChange={(e) => updateQuestion(idx, 'OptionD', e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mr-2">Correct Answer:</label>
                        <select 
                          value={q.CorrectAnswer} 
                          onChange={(e) => updateQuestion(idx, 'CorrectAnswer', e.target.value)}
                          className="text-sm border border-gray-300 rounded p-1"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                      No questions yet. Add one manually or generate with AI.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowDrawer(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTest}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Test'}
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
