import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

export default function UserPermissions({ user }) {
  const [permissions, setPermissions] = useState([]);
  const [pagesAndGroups, setPagesAndGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPageGroupID, setNewPageGroupID] = useState('');
  const [newCanView, setNewCanView] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadPagesAndGroups();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetUserPagePermissions', {}, {}, 'plus');
      if (res.State !== 0) {
        setError(res.Message || 'Failed to load permissions.');
      } else {
        setPermissions(res.List0 || []);
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setLoading(false);
  }

  async function loadPagesAndGroups() {
    try {
      const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      if (res.State === 0) {
        setPagesAndGroups(res.List0 || []);
        if (res.List0?.length > 0) {
          setNewPageGroupID(res.List0[0].PageGroupID);
        }
      }
    } catch (e) {
      console.error('Failed to load pages and groups:', e);
    }
  }

  async function handleAddPermission(e) {
    e.preventDefault();
    if (!newUsername.trim()) {
      alert('Please enter a username.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await apiCall('SaveUserPagePermission', {
        Username: newUsername.trim(),
        PageGroupID: newPageGroupID,
        CanView: newCanView ? 1 : 0
      }, {}, 'plus');

      if (res.State !== 0) {
        alert(res.Message || 'Failed to save permission.');
      } else {
        setNewUsername('');
        loadData();
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setSubmitLoading(false);
  }

  async function handleDeletePermission(permId) {
    if (!window.confirm('Are you sure you want to revoke this permission?')) {
      return;
    }
    try {
      const res = await apiCall('DeleteUserPagePermission', { PermissionID: permId }, {}, 'plus');
      if (res.State !== 0) {
        alert(res.Message || 'Failed to delete permission.');
      } else {
        loadData();
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
  }

  const columns = [
    { key: 'Username', label: 'Username', sortable: true, filterable: true },
    { key: 'PageLabel', label: 'Page / Group Name', sortable: true, filterable: true },
    { 
      key: 'IsGroup', 
      label: 'Type', 
      render: (val) => (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: 12,
          background: val ? 'rgba(59,130,246,0.15)' : 'rgba(139,148,158,0.15)',
          color: val ? '#3b82f6' : 'var(--muted)'
        }}>
          {val ? '📁 Group' : '📄 Page'}
        </span>
      )
    },
    { 
      key: 'CanView', 
      label: 'Can View', 
      render: (val) => (
        <span style={{
          fontWeight: 700,
          color: val ? '#22c55e' : '#ef4444'
        }}>
          {val ? 'Allowed' : 'Blocked'}
        </span>
      )
    },
    { key: 'GrantedBy', label: 'Granted By' },
    { 
      key: 'GrantedDate', 
      label: 'Granted Date', 
      render: (val) => val ? new Date(val).toLocaleDateString() : '—' 
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => handleDeletePermission(row.PermissionID)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 800,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          Revoke
        </button>
      )
    }
  ];

  const controlPanel = (
    <form onSubmit={handleAddPermission} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--soft)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Username / Login Code</label>
        <input 
          type="text" 
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="e.g. mhd"
          required
          style={{
            height: 38,
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontSize: 13
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Select Target Page / Group</label>
        <select 
          value={newPageGroupID}
          onChange={(e) => setNewPageGroupID(e.target.value)}
          style={{
            height: 38,
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontSize: 13
          }}
        >
          {pagesAndGroups.map(pg => (
            <option key={pg.PageGroupID} value={pg.PageGroupID}>
              {pg.IsGroup ? '📁 ' : '📄 '} {pg.Label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, paddingBottom: 2 }}>
        <input 
          type="checkbox"
          id="chkCanView"
          checked={newCanView}
          onChange={(e) => setNewCanView(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label htmlFor="chkCanView" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>Allow Access</label>
      </div>

      <button 
        type="submit" 
        disabled={submitLoading}
        style={{
          height: 38,
          padding: '0 20px',
          border: 'none',
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          marginLeft: 'auto'
        }}
      >
        {submitLoading ? 'Saving...' : 'Grant Permission'}
      </button>
    </form>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <DataGrid
        title="User Page Permissions"
        subtitle="Control access permissions for different users on navigation links and groups"
        columns={columns}
        rows={permissions}
        controlPanel={controlPanel}
        loading={loading}
        onRefresh={loadData}
      />
    </div>
  );
}
