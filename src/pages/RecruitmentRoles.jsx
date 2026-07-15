import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function RecruitmentRoles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Link Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    UserRoleID: '',
    Username: '',
    RoleName: 'Department Manager',
    Department: ''
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // System users for dropdown
  const [systemUsers, setSystemUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Departments for dropdown
  const [departments, setDepartments] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  useEffect(() => {
    loadData();
    loadSystemUsers();
    loadDepartments();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Recruitment User Roles', null, {}, 'recruitment_requests');
      if (res.State === 0) {
        setRows(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load user roles.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function loadSystemUsers() {
    try {
      const res = await apiCall('GetSystemUsers', {}, {}, 'plus');
      if (res.State === 0) {
        setSystemUsers(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load system users:', e);
    }
  }

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

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.Username) {
      setModalError('Please select a system user.');
      return;
    }
    if (formData.RoleName === 'Department Manager' && !formData.Department) {
      setModalError('Please select a department for Department Manager.');
      return;
    }

    const submitData = {
      ...formData,
      // Clear department if HR Responsible
      Department: formData.RoleName === 'Department Manager' ? formData.Department : ''
    };

    setSubmitting(true);
    setModalError('');
    try {
      const res = await apiCall('Save Recruitment User Role', submitData, {}, 'recruitment_requests');
      if (res.State === 0) {
        setShowModal(false);
        loadData();
      } else {
        setModalError(res.Message || 'Failed to save role link.');
      }
    } catch (err) {
      setModalError('Connection error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function handleDelete(row) {
    if (!window.confirm(`Are you sure you want to remove role link for user "${row.Username}"?`)) return;
    try {
      const res = await apiCall('Delete Recruitment User Role', { UserRoleID: row.UserRoleID }, {}, 'recruitment_requests');
      if (res.State === 0) {
        loadData();
      } else {
        alert(res.Message || 'Failed to delete role link.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  const columns = [
    { key: 'Username', label: 'Username' },
    { 
      key: 'RoleName', 
      label: 'Recruitment Role',
      render: (val) => (
        <span style={{
          fontSize: 11.5,
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: 8,
          background: val === 'Department Manager' ? 'var(--blue-soft)' : 'var(--orange-soft)',
          color: val === 'Department Manager' ? 'var(--blue)' : 'var(--orange)'
        }}>
          {val}
        </span>
      )
    },
    { 
      key: 'Department', 
      label: 'Linked Department',
      render: (val) => val || 'All / NA'
    },
    { key: 'CreatedBy', label: 'Linked By' },
    { 
      key: 'CreatedDate', 
      label: 'Linked Date',
      render: (val) => val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && (
        <div style={{ marginBottom: 20, background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DataGrid
          title="User Roles Setup"
          subtitle="Map active system users to Recruitment module roles & departments"
          columns={columns}
          rows={rows}
          loading={loading}
          onRefresh={loadData}
          onAdd={() => {
            setFormData({
              UserRoleID: '',
              Username: '',
              RoleName: 'Department Manager',
              Department: ''
            });
            setUserSearch('');
            setDeptSearch('');
            setModalError('');
            setShowModal(true);
          }}
          extraRowActions={[
            {
              label: '❌ Remove Link',
              show: () => true,
              onClick: handleDelete
            }
          ]}
        />
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(440px, calc(100vw - 28px))', background: 'var(--surface)', borderRadius: 22, boxShadow: 'var(--shadow)', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Link User Role</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>

            {modalError && (
              <div style={{ marginBottom: 16, background: 'var(--red-soft)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>{modalError}</div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>System User</label>
                <div 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{
                    width: '100%', 
                    height: 38, 
                    padding: '0 12px', 
                    border: '1.5px solid var(--border)', 
                    borderRadius: 10, 
                    background: 'var(--bg)', 
                    color: formData.Username ? 'var(--text)' : 'var(--muted)', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <span>
                    {formData.Username 
                      ? `${systemUsers.find(u => u.Username === formData.Username)?.Name || formData.Username} (${formData.Username})` 
                      : 'Select System User'}
                  </span>
                  <span>▾</span>
                </div>

                {showUserDropdown && (
                  <>
                    <div 
                      onClick={() => {
                        setShowUserDropdown(false);
                        setUserSearch('');
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
                        placeholder="Search users..." 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
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
                        {systemUsers
                          .filter(u => 
                            (u.Username || '').toLowerCase().includes(userSearch.toLowerCase()) || 
                            (u.Name || '').toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map(u => (
                            <button
                              key={u.Username}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, Username: u.Username });
                                setShowUserDropdown(false);
                                setUserSearch('');
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: formData.Username === u.Username ? 'var(--primary-soft)' : 'transparent',
                                border: 0,
                                borderRadius: 6,
                                textAlign: 'left',
                                color: formData.Username === u.Username ? 'var(--primary)' : 'var(--text)',
                                fontSize: 13,
                                fontWeight: formData.Username === u.Username ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => {
                                if (formData.Username !== u.Username) {
                                  e.target.style.background = 'var(--soft)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (formData.Username !== u.Username) {
                                  e.target.style.background = 'transparent';
                                }
                              }}
                            >
                              {u.Name || u.Username} ({u.Username})
                            </button>
                          ))
                        }
                        {systemUsers.filter(u => 
                          (u.Username || '').toLowerCase().includes(userSearch.toLowerCase()) || 
                          (u.Name || '').toLowerCase().includes(userSearch.toLowerCase())
                        ).length === 0 && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>No matching users found</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Recruitment Role</label>
                <select 
                  value={formData.RoleName} 
                  onChange={e => setFormData({ ...formData, RoleName: e.target.value })} 
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                >
                  <option value="Department Manager">Department Manager</option>
                  <option value="HR Responsible">HR Responsible</option>
                </select>
              </div>

              {formData.RoleName === 'Department Manager' && (
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Linked Department</label>
                  <div 
                    onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                    style={{
                      width: '100%', 
                      height: 38, 
                      padding: '0 12px', 
                      border: '1.5px solid var(--border)', 
                      borderRadius: 10, 
                      background: 'var(--bg)', 
                      color: formData.Department ? 'var(--text)' : 'var(--muted)', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    <span>{formData.Department || 'Select Department'}</span>
                    <span>▾</span>
                  </div>

                  {showDeptDropdown && (
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
                          {departments
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
                          {departments.filter(d => d.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase())).length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>No matching departments found</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ height: 38, padding: '0 18px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 38, padding: '0 20px', border: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                  {submitting ? 'Linking...' : 'Link Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
