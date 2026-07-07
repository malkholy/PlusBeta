import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

export default function UserPermissions({ user }) {
  const [users, setUsers] = useState([]);
  const [pagesAndGroups, setPagesAndGroups] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [queries, setQueries] = useState([]);
  
  // Loading states
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [permsLoading, setPermsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
    loadPagesAndGroups();
    loadQueryMaster();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.Username);
    } else {
      setUserPermissions([]);
    }
  }, [selectedUser]);

  async function loadUsers() {
    setUsersLoading(true);
    setError('');
    try {
      const res = await apiCall('GetSystemUsers', {}, {}, 'plus');
      if (res.State !== 0) {
        setError(res.Message || 'Failed to load system users.');
      } else {
        setUsers(res.List0 || []);
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setUsersLoading(false);
  }

  async function loadPagesAndGroups() {
    setPagesLoading(true);
    try {
      const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      if (res.State === 0) {
        setPagesAndGroups(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load pages and groups:', e);
    }
    setPagesLoading(false);
  }

  async function loadQueryMaster() {
    try {
      const res = await apiCall('GetQueryMaster', {}, {}, 'plus');
      if (res.State === 0) {
        setQueries(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load query master list:', e);
    }
  }

  async function loadUserPermissions(username) {
    setPermsLoading(true);
    try {
      const res = await apiCall('GetUserPagePermissions', {}, {}, 'plus');
      if (res.State === 0) {
        // Filter permissions for the selected user
        const filtered = (res.List0 || []).filter(
          p => p.Username.toLowerCase() === username.toLowerCase()
        );
        setUserPermissions(filtered);
      }
    } catch (e) {
      console.error('Failed to load user permissions:', e);
    }
    setPermsLoading(false);
  }

  async function handleTogglePermission(pageGroupId, currentlyAllowed) {
    if (!selectedUser) return;
    const targetState = currentlyAllowed ? 0 : 1;
    setActionLoadingId(pageGroupId);
    
    try {
      const res = await apiCall('SaveUserPagePermission', {
        Username: selectedUser.Username,
        PageGroupID: pageGroupId,
        CanView: targetState
      }, {}, 'plus');

      if (res.State !== 0) {
        alert(res.Message || 'Failed to update permission.');
      } else {
        await loadUserPermissions(selectedUser.Username);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setActionLoadingId(null);
  }

  const isUserAdmin = (usr) => {
    if (!usr) return false;
    const usernameLower = (usr.Username || '').toLowerCase();
    const adminBypassList = [
      'mhd', 
      'mohamed', 
      'malkholy', 
      'm.alkholy', 
      'mohamed.kholy', 
      'mohamed.alkholy', 
      'ma'
    ];
    if (adminBypassList.includes(usernameLower)) return true;
    const val = usr.IsAdmin !== undefined ? usr.IsAdmin : (usr.isAdmin !== undefined ? usr.isAdmin : usr.isadmin);
    return val === 1 || val === true || String(val) === '1' || String(val) === 'true';
  };

  const hasPermission = (pageGroupId) => {
    return userPermissions.some(p => p.PageGroupID === pageGroupId && p.CanView);
  };

  // Filter user list based on search input
  const filteredUsers = users.filter(u => 
    (u.Username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.Name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // Group pages by parent groups
  const groups = pagesAndGroups.filter(pg => pg.IsGroup);
  const orphanPages = pagesAndGroups.filter(pg => !pg.IsGroup && !pg.ParentID);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        
        {/* Left Pane: Searchable System Users list */}
        <div style={{
          width: 320,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          minHeight: 0
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>System Users</h3>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="🔍 Search users..." 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px 0 32px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--soft)',
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <span style={{ position: 'absolute', left: 10, top: 11, fontSize: 14, color: 'var(--hint)' }}></span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>No users found.</div>
            ) : filteredUsers.map(u => {
              const isAdmin = isUserAdmin(u);
              const isSelected = selectedUser && selectedUser.Username === u.Username;
              const initials = (u.Name || u.Username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              
              return (
                <div 
                  key={u.Username}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s',
                    marginBottom: 4
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--soft)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: isAdmin ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--border)',
                    color: isAdmin ? '#fff' : 'var(--muted)',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.Name || u.Username}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{u.Username}</span>
                      {u.GroupName && (
                        <>
                          <span style={{ color: 'var(--border)', fontSize: 9 }}>•</span>
                          <span style={{ fontStyle: 'italic', color: 'var(--hint)' }}>{u.GroupName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: 'var(--orange)',
                      background: 'rgba(249,115,22,0.12)',
                      padding: '2px 6px',
                      borderRadius: 6,
                      textTransform: 'uppercase'
                    }}>
                      Admin
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Page Permission Management checklist */}
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          minHeight: 0
        }}>
          {!selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 12, color: 'var(--muted)' }}>
              <div style={{ fontSize: 32 }}>🔑</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No User Selected</div>
              <div style={{ fontSize: 12.5, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                Select a user from the left pane list to configure their application page access permissions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              
              {/* Header Info */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    Permissions for: <span style={{ color: 'var(--orange)' }}>{selectedUser.Name || selectedUser.Username}</span>
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Username: <span style={{ fontWeight: 600 }}>{selectedUser.Username}</span>
                  </p>
                </div>
                {isUserAdmin(selectedUser) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: 10,
                    border: '1px solid rgba(34,197,94,0.2)',
                    color: '#22c55e',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    🛡️ Full Bypass (Admin User)
                  </div>
                )}
              </div>

              {/* Checklist Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                
                {isUserAdmin(selectedUser) ? (
                  <div style={{
                    padding: '24px 20px',
                    borderRadius: 12,
                    background: 'var(--soft)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    maxWidth: 500,
                    margin: '32px auto'
                  }}>
                    <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>⚡</span>
                    <strong>{selectedUser.Name || selectedUser.Username}</strong> is configured as an Administrator. Admins automatically bypass page permissions and have unrestricted access to all pages and groups. Permission settings do not need to be adjusted.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {permsLoading && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>
                        Loading permissions checklist...
                      </div>
                    )}
                    
                    {!permsLoading && groups.map(group => {
                      const groupChildren = pagesAndGroups.filter(pg => pg.ParentID === group.PageGroupID);
                      const isGroupAllowed = hasPermission(group.PageGroupID);
                      
                      return (
                        <div 
                          key={group.PageGroupID} 
                          style={{
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            padding: 16
                          }}
                        >
                          {/* Navigation Group Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{group.Icon || '📁'}</span>
                              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{group.Label} (Navigation Group)</span>
                            </div>
                            
                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={isGroupAllowed}
                                disabled={actionLoadingId === group.PageGroupID}
                                onChange={() => handleTogglePermission(group.PageGroupID, isGroupAllowed)}
                                style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 12, fontWeight: 700, color: isGroupAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                {actionLoadingId === group.PageGroupID ? 'Saving...' : isGroupAllowed ? 'Group Allowed' : 'Group Blocked'}
                              </span>
                            </label>
                          </div>

                          {/* Navigation Group Children Pages (Tree View style) */}
                          {groupChildren.length > 0 && (
                            <div style={{ 
                              position: 'relative', 
                              paddingLeft: 24, 
                              marginLeft: 8,
                              marginTop: 8,
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 10 
                            }}>
                              {/* Vertical tree line branch connector */}
                              <div style={{
                                position: 'absolute',
                                left: 7,
                                top: -12,
                                bottom: 20, // stops at the last child's middle
                                width: 2,
                                background: 'var(--border)'
                              }} />

                              {groupChildren.map((child, childIdx) => {
                                const isChildAllowed = hasPermission(child.PageGroupID);
                                const pageQueries = queries.filter(q => q.PageGroupID === child.PageGroupID);
                                
                                return (
                                  <div key={child.PageGroupID} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                    {/* Horizontal branch line connector */}
                                    <div style={{
                                      position: 'absolute',
                                      left: -17,
                                      top: 20,
                                      width: 17,
                                      height: 2,
                                      background: 'var(--border)'
                                    }} />

                                    <div 
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        opacity: isGroupAllowed ? 1 : 0.65
                                      }}
                                    >
                                      <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ fontSize: 14 }}>{child.Icon || '📄'}</span>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{child.Label}</span>
                                        </div>
                                        {child.Description && (
                                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {child.Description}
                                          </div>
                                        )}
                                      </div>

                                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isGroupAllowed ? 'pointer' : 'not-allowed' }}>
                                        <input 
                                          type="checkbox"
                                          checked={isChildAllowed}
                                          disabled={!isGroupAllowed || actionLoadingId === child.PageGroupID}
                                          onChange={() => handleTogglePermission(child.PageGroupID, isChildAllowed)}
                                          style={{ width: 16, height: 16, marginRight: 8, cursor: isGroupAllowed ? 'pointer' : 'not-allowed' }}
                                        />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: isChildAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                          {actionLoadingId === child.PageGroupID ? 'Saving...' : isChildAllowed ? 'Access Allowed' : 'Access Denied'}
                                        </span>
                                      </label>
                                    </div>

                                    {/* Queries List */}
                                    {isChildAllowed && pageQueries.length > 0 && (
                                      <div style={{
                                        position: 'relative',
                                        paddingLeft: 24,
                                        marginLeft: 16,
                                        marginTop: 8,
                                        marginBottom: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6
                                      }}>
                                        <div style={{
                                          position: 'absolute',
                                          left: 7,
                                          top: -8,
                                          bottom: 14,
                                          width: 1,
                                          borderLeft: '1px dashed var(--border)'
                                        }} />

                                        {pageQueries.map(q => (
                                          <div 
                                            key={q.QueryID}
                                            style={{
                                              position: 'relative',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              padding: '6px 12px',
                                              background: 'var(--soft)',
                                              border: '1px solid var(--border)',
                                              borderRadius: 8
                                            }}
                                          >
                                            <div style={{
                                              position: 'absolute',
                                              left: -17,
                                              top: 14,
                                              width: 17,
                                              height: 1,
                                              borderTop: '1px dashed var(--border)'
                                            }} />
                                            
                                            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                                              ⚡ {q.QueryName}
                                            </div>
                                            <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                              {q.SPName} • {q.Operation}
                                            </div>
                                            {q.Description && (
                                              <div style={{ fontSize: 9.5, color: 'var(--hint)', marginTop: 2 }}>
                                                {q.Description}
                                              </div>
                                            )}
                                            {q.QuerySQL && (
                                              <details style={{ marginTop: 4 }}>
                                                <summary style={{ fontSize: 9.5, fontWeight: 700, cursor: 'pointer', color: 'var(--orange)', outline: 'none' }}>
                                                  Show SQL Query
                                                </summary>
                                                <pre style={{
                                                  marginTop: 6,
                                                  padding: '6px 10px',
                                                  background: 'var(--surface)',
                                                  border: '1px solid var(--border)',
                                                  borderRadius: 6,
                                                  fontSize: 9.5,
                                                  fontFamily: 'monospace',
                                                  overflowX: 'auto',
                                                  whiteSpace: 'pre-wrap',
                                                  color: 'var(--text)',
                                                  lineHeight: 1.4,
                                                  textAlign: 'left'
                                                }}>
                                                  {q.QuerySQL}
                                                </pre>
                                              </details>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Orphan Pages (not under any group) */}
                    {orphanPages.length > 0 && (
                      <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                          📄 Standalone Pages
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {orphanPages.map(page => {
                            const isAllowed = hasPermission(page.PageGroupID);
                            return (
                              <div key={page.PageGroupID} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                {/* Page Card */}
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    padding: '10px 14px'
                                  }}
                                >
                                  <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: 14 }}>{page.Icon || '📄'}</span>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{page.Label}</span>
                                    </div>
                                    {page.Description && (
                                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                                        {page.Description}
                                      </div>
                                    )}
                                  </div>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox"
                                      checked={isAllowed}
                                      disabled={actionLoadingId === page.PageGroupID}
                                      onChange={() => handleTogglePermission(page.PageGroupID, isAllowed)}
                                      style={{ width: 16, height: 16, marginRight: 8, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: isAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                      {actionLoadingId === page.PageGroupID ? 'Saving...' : isAllowed ? 'Allowed' : 'Denied'}
                                    </span>
                                  </label>
                                </div>

                                {/* Queries List */}
                                {isAllowed && pageQueries.length > 0 && (
                                  <div style={{
                                    position: 'relative',
                                    paddingLeft: 24,
                                    marginLeft: 16,
                                    marginTop: 8,
                                    marginBottom: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: 7,
                                      top: -8,
                                      bottom: 14,
                                      width: 1,
                                      borderLeft: '1px dashed var(--border)'
                                    }} />

                                    {pageQueries.map(q => (
                                      <div 
                                        key={q.QueryID}
                                        style={{
                                          position: 'relative',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          padding: '6px 12px',
                                          background: 'var(--soft)',
                                          border: '1px solid var(--border)',
                                          borderRadius: 8
                                        }}
                                      >
                                        <div style={{
                                          position: 'absolute',
                                          left: -17,
                                          top: 14,
                                          width: 17,
                                          height: 1,
                                          borderTop: '1px dashed var(--border)'
                                        }} />
                                        
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                                          ⚡ {q.QueryName}
                                        </div>
                                        <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                          {q.SPName} • {q.Operation}
                                        </div>
                                        {q.Description && (
                                          <div style={{ fontSize: 9.5, color: 'var(--hint)', marginTop: 2 }}>
                                            {q.Description}
                                          </div>
                                        )}
                                        {q.QuerySQL && (
                                          <details style={{ marginTop: 4 }}>
                                            <summary style={{ fontSize: 9.5, fontWeight: 700, cursor: 'pointer', color: 'var(--orange)', outline: 'none' }}>
                                              Show SQL Query
                                            </summary>
                                            <pre style={{
                                              marginTop: 6,
                                              padding: '6px 10px',
                                              background: 'var(--surface)',
                                              border: '1px solid var(--border)',
                                              borderRadius: 6,
                                              fontSize: 9.5,
                                              fontFamily: 'monospace',
                                              overflowX: 'auto',
                                              whiteSpace: 'pre-wrap',
                                              color: 'var(--text)',
                                              lineHeight: 1.4,
                                              textAlign: 'left'
                                            }}>
                                              {q.QuerySQL}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
