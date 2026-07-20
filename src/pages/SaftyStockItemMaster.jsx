import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import * as XLSX from 'xlsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return '—';
  }
}

function formatQty(val) {
  if (val == null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function isFlagActive(val) {
  if (val === true || val === 1) return true;
  const s = String(val || '').trim().toLowerCase();
  return s === 'true' || s === 'y' || s === 'yes' || s === '1' || s === 't';
}

function getInventoryStatus(inventory, reorderLimit, safetyStock, openPO, leadTime, activeLeadTime, minHistLT) {
  const inv = Number(inventory || 0);
  if (inv <= 0) {
    return {
      label: 'Out of Stock',
      color: '#8b949e',
      dot: '⚫'
    };
  }

  const lt = Number(leadTime || 0);
  const alt = Number(activeLeadTime || 0);
  const mhl = minHistLT !== undefined && minHistLT !== null ? Number(minHistLT) : -1;

  if (lt <= 0 && (alt <= 0 || mhl === 0)) {
    return {
      label: 'Error',
      color: '#ef4444',
      dot: '❌'
    };
  }

  const ss = Number(safetyStock || 0);

  if (ss <= 0) {
    return {
      label: 'Error',
      color: '#ef4444',
      dot: '❌'
    };
  }

  const rl = Number(reorderLimit || 0);
  const po = Number(openPO || 0);
  if (inv < ss) {
    if (po <= 0) {
      return {
        label: 'Critical',
        color: '#ef4444',
        dot: '🔴'
      };
    } else {
      return {
        label: 'Safety Stock',
        color: '#fb923c',
        dot: '🟠'
      };
    }
  }
  if (inv <= rl) {
    if (po > 0) {
      return {
        label: 'On Order',
        color: '#3b82f6',
        dot: '🔵'
      };
    } else {
      return {
        label: 'Reorder Required',
        color: '#eab308',
        dot: '🟡'
      };
    }
  }
  return {
    label: 'Healthy',
    color: '#22c55e',
    dot: '🟢'
  };
}

export default function SaftyStockItemMasterPage({ user }) {
  const cache = window.__saftyStockCache = window.__saftyStockCache || {};
  const [rows, setRows] = useState(cache.rows || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedID, setSelectedID] = useState(null);
  const [itemID, setItemID] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [saftyStock, setSaftyStock] = useState('0');
  const [leadTime, setLeadTime] = useState('0');
  const [itemType, setItemType] = useState('R');
  const [purchasingWarehouse, setPurchasingWarehouse] = useState('');
  const [producationWarehouse, setProducationWarehouse] = useState('');

  const [stockUM, setStockUM] = useState('units');

  // Tab State
  const [activeTab, setActiveTab] = useState('summary');
  const [serviceLevelFactor, setServiceLevelFactor] = useState(1.65);
  const [simLeadTime, setSimLeadTime] = useState('');
  const [simLeadTimeStdDev, setSimLeadTimeStdDev] = useState('');

  // Item Balance States
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState('');

  // Item Consumption States
  const [consumption, setConsumption] = useState([]);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [consumptionError, setConsumptionError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // Open POs States
  const [openPos, setOpenPos] = useState([]);
  const [openPosLoading, setOpenPosLoading] = useState(false);
  const [openPosError, setOpenPosError] = useState('');

  // Lead Time States
  const [leadTimes, setLeadTimes] = useState([]);
  const [leadTimesLoading, setLeadTimesLoading] = useState(false);
  const [leadTimesError, setLeadTimesError] = useState('');

  // Status History States
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false);
  const [statusHistoryError, setStatusHistoryError] = useState('');

  // Receipts States
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('GetSaftyStockItems', null, {}, 'purchasing');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to retrieve safety stock records.');
        setRows([]);
      } else {
        const list = d.List0 || [];
        setRows(list);
        cache.rows = list;
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
      setRows([]);
    }
    setLoading(false);
  }

  async function loadBalances(code) {
    if (!code) {
      setBalances([]);
      return;
    }
    setBalancesLoading(true);
    setBalancesError('');
    try {
      const res = await apiCall('GetItemBalance', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setBalancesError(res.Message || 'Failed to load balances.');
      } else {
        setBalances(res.List0 || []);
      }
    } catch (e) {
      setBalancesError('Connection error: ' + e.message);
    }
    setBalancesLoading(false);
  }

  async function loadConsumption(code) {
    if (!code) {
      setConsumption([]);
      return;
    }
    setConsumptionLoading(true);
    setConsumptionError('');
    try {
      const res = await apiCall('GetItemConsumption', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setConsumptionError(res.Message || 'Failed to load consumption.');
      } else {
        const rawList = res.List0 || [];
        const maxYear = new Date().getFullYear();
        const maxMonth = new Date().getMonth() + 1;

        const filledList = [];
        let tempYear = maxYear;
        let tempMonth = maxMonth;

        for (let i = 0; i < 13; i++) {
          const matches = rawList.filter(c => Number(c.Yer) === tempYear && Number(c.Mnth) === tempMonth);
          if (matches.length > 0) {
            const totalQty = matches.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
            filledList.push({
              Yer: tempYear,
              Mnth: tempMonth,
              ItemCode: code,
              TotalQuantity: totalQty,
              details: matches.map(m => ({
                Facility: m.Facility || '—',
                Warehouse: m.Warehouse || '—',
                TotalQuantity: Number(m.TotalQuantity || 0)
              }))
            });
          } else {
            filledList.push({
              Yer: tempYear,
              Mnth: tempMonth,
              ItemCode: code,
              TotalQuantity: 0,
              details: []
            });
          }

          tempMonth--;
          if (tempMonth === 0) {
            tempMonth = 12;
            tempYear--;
          }
        }
        setConsumption(filledList);
      }
    } catch (e) {
      setConsumptionError('Connection error: ' + e.message);
    }
    setConsumptionLoading(false);
  }

  const handleExportConsumption = () => {
    if (consumption.length === 0) return;

    // Prepare array of objects for the worksheet
    const dataRows = [];

    // Build rows
    consumption.forEach(c => {
      const isCurrentMonth = c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1);
      const monthLabel = isCurrentMonth ? `${c.Mnth} (Current)` : c.Mnth;
      
      if (c.details && c.details.length > 0) {
        c.details.forEach(d => {
          dataRows.push({
            "Item Code": itemCode,
            "Year": c.Yer,
            "Month": monthLabel,
            "Facility": d.Facility || '',
            "Warehouse": d.Warehouse || '',
            "Quantity Consumed": d.TotalQuantity || 0
          });
        });
      } else {
        dataRows.push({
          "Item Code": itemCode,
          "Year": c.Yer,
          "Month": monthLabel,
          "Facility": "Total",
          "Warehouse": "Total",
          "Quantity Consumed": c.TotalQuantity || 0
        });
      }
    });

    // Create a new workbook and add the worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumption History");

    // Auto-fit column widths
    const maxLens = {};
    dataRows.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key] || '');
        maxLens[key] = Math.max(maxLens[key] || 10, val.length + 2, key.length + 2);
      });
    });
    worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] }));

    // Write file
    XLSX.writeFile(workbook, `Consumption_${itemCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  async function loadOpenPOs(code) {
    if (!code) {
      setOpenPos([]);
      return;
    }
    setOpenPosLoading(true);
    setOpenPosError('');
    try {
      const res = await apiCall('GetItemOpenPOs', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setOpenPosError(res.Message || 'Failed to load open POs.');
      } else {
        setOpenPos(res.List0 || []);
      }
    } catch (e) {
      setOpenPosError('Connection error: ' + e.message);
    }
    setOpenPosLoading(false);
  }

  async function loadLeadTimes(code) {
    if (!code) {
      setLeadTimes([]);
      return;
    }
    setLeadTimesLoading(true);
    setLeadTimesError('');
    try {
      const res = await apiCall('GetItemLeadTime', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setLeadTimesError(res.Message || 'Failed to load lead times.');
      } else {
        setLeadTimes(res.List0 || []);
      }
    } catch (e) {
      setLeadTimesError('Connection error: ' + e.message);
    }
    setLeadTimesLoading(false);
  }

  async function loadStatusHistory(code) {
    if (!code) {
      setStatusHistory([]);
      return;
    }
    setStatusHistoryLoading(true);
    setStatusHistoryError('');
    try {
      const res = await apiCall('GetItemStatusHistory', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setStatusHistoryError(res.Message || 'Failed to load status history.');
      } else {
        setStatusHistory(res.List0 || []);
      }
    } catch (e) {
      setStatusHistoryError('Connection error: ' + e.message);
    }
    setStatusHistoryLoading(false);
  }

  async function loadReceipts(code) {
    if (!code) {
      setReceipts([]);
      return;
    }
    setReceiptsLoading(true);
    setReceiptsError('');
    try {
      const res = await apiCall('GetItemReceipts', { ItemCode: code }, {}, 'purchasing');
      if (res.State !== 0) {
        setReceiptsError(res.Message || 'Failed to load receipts.');
      } else {
        setReceipts(res.List0 || []);
      }
    } catch (e) {
      setReceiptsError('Connection error: ' + e.message);
    }
    setReceiptsLoading(false);
  }

  function handlePrint() {
    const element = document.getElementById('drawer-summary-tab-content');
    if (!element) return;

    const win = window.open('', '_blank');
    if (win) {
      let styles = '';
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          const rules = sheet.cssRules || sheet.rules;
          for (let j = 0; j < rules.length; j++) {
            styles += rules[j].cssText;
          }
        } catch (e) {
          // Ignore cross-origin rules
        }
      }

      styles += `
        body { 
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          background: #fff !important; 
          padding: 24px !important; 
          color: #1e293b !important; 
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-hide { 
          display: none !important; 
        }
      `;

      win.document.write(`
        <html>
          <head>
            <title>Safety Stock Summary Report - ${itemCode}</title>
            <style>${styles}</style>
          </head>
          <body>
            <div style="margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1e293b;">Item Code: ${itemCode}</h1>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">GLC Paints - Safety Stock Report | Printed: ${new Date().toLocaleString()}</span>
            </div>
            <div style="font-family: system-ui, sans-serif;">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 250);
    } else {
      alert('Pop-up blocker is enabled. Please allow pop-ups for this site to print reports.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Parallel pre-fetching of all metrics when drawer is open
  useEffect(() => {
    if (isDrawerOpen && itemCode) {
      loadBalances(itemCode);
      loadConsumption(itemCode);
      loadOpenPOs(itemCode);
      loadLeadTimes(itemCode);
      loadStatusHistory(itemCode);
      loadReceipts(itemCode);
    } else {
      setBalances([]);
      setConsumption([]);
      setOpenPos([]);
      setLeadTimes([]);
      setStatusHistory([]);
      setReceipts([]);
    }
  }, [itemCode, isDrawerOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  const [saveLoading, setSaveLoading] = useState(false);

  async function handleSave() {
    try {
      setSaveLoading(true);
      const payload = {
        ID: selectedID,
        ItemID: itemID,
        ItemCode: itemCode,
        SaftyStock: Number(saftyStock),
        LeadTime: Number(leadTime),
        ServiceLevelFactor: Number(serviceLevelFactor),
        ItemType: itemType
      };
      const res = await apiCall('SaveSaftyStockItem', payload, { ItemCode: itemCode }, 'purchasing');
      if (res && res.State === 0) {
        await loadData();
        alert('Safety stock and lead time updated successfully.');
      } else {
        alert('Error saving: ' + (res?.Message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving safety stock item.');
    } finally {
      setSaveLoading(false);
    }
  }

  function handleOpenDrawer(row) {
    if (!row) return;
    setActiveTab('summary');
    setExpandedRow(null);
    setSelectedID(row.ID);
    setItemID(row.ItemID || '');
    setItemCode(row.ItemCode || '');
    setSaftyStock(String(row.SaftyStock || '0'));
    setLeadTime(String(row.LeadTime || '0'));
    const factor = row.ServiceLevelFactor != null ? Number(row.ServiceLevelFactor) : 1.65;
    setServiceLevelFactor(factor || 1.65);
    setSimLeadTime('');
    setSimLeadTimeStdDev('');
    setStockUM(row.StockUM || 'units');
    setItemType(row.ItemType || 'R');
    setPurchasingWarehouse(row.PurchasingWarehouse || '');
    setProducationWarehouse(row.ProducationWarehouse || '');
    setIsDrawerOpen(true);
  }

  const totalCount = rows.length;
  const kpiStats = rows.reduce((acc, r) => {
    const status = getInventoryStatus(
      r.TotalMonitored,
      r.ReorderLimitPoint,
      r.StatisticalTarget,
      r.TotalOpenPO,
      r.LeadTime,
      r.ActiveLeadTime,
      r.MinHistLT
    );
    acc[status.label] = (acc[status.label] || 0) + 1;
    return acc;
  }, {
    'Healthy': 0,
    'On Order': 0,
    'Reorder Required': 0,
    'Safety Stock': 0,
    'Critical': 0,
    'Out of Stock': 0,
    'Error': 0
  });

  const filteredRows = rows.filter(r => {
    const status = getInventoryStatus(
      r.TotalMonitored,
      r.ReorderLimitPoint,
      r.StatisticalTarget,
      r.TotalOpenPO,
      r.LeadTime,
      r.ActiveLeadTime,
      r.MinHistLT
    );
    if (statusFilter !== 'All' && status.label !== statusFilter) {
      return false;
    }
    return true;
  });

  const controlPanel = (
    <div style={{ padding: '16px 18px', background: 'var(--soft)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <div 
          onClick={() => setStatusFilter('All')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'All' ? '2px solid var(--orange)' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>All Items</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: 'var(--text)' }}>{totalCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Healthy')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Healthy' ? '2px solid #22c55e' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🟢</span> Healthy
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#22c55e' }}>{kpiStats['Healthy']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('On Order')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'On Order' ? '2px solid #3b82f6' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🔵</span> On Order
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#3b82f6' }}>{kpiStats['On Order']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Reorder Required')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Reorder Required' ? '2px solid #eab308' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🟡</span> Reorder Req.
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#eab308' }}>{kpiStats['Reorder Required']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Safety Stock')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Safety Stock' ? '2px solid #fb923c' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🟠</span> Safety Stock
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#fb923c' }}>{kpiStats['Safety Stock']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Critical')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Critical' ? '2px solid #ef4444' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🔴</span> Critical
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#ef4444' }}>{kpiStats['Critical']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Out of Stock')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Out of Stock' ? '2px solid #8b949e' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>⚫</span> Out of Stock
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#8b949e' }}>{kpiStats['Out of Stock']}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Error')}
          style={{ 
            background: 'var(--surface)', 
            padding: '12px 14px', 
            border: statusFilter === 'Error' ? '2px solid #ef4444' : '1px solid var(--border)', 
            borderRadius: 12, 
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow)'
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>❌</span> Error
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#ef4444' }}>{kpiStats['Error']}</div>
        </div>
      </div>

      {/* Filter Buttons row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 }}>Filters:</span>
        <button 
          onClick={() => setStatusFilter('All')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'All' ? '1.5px solid var(--orange)' : '1px solid var(--border)',
            background: statusFilter === 'All' ? 'var(--orange-soft)' : 'var(--surface)',
            color: statusFilter === 'All' ? 'var(--orange)' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          All
        </button>
        <button 
          onClick={() => setStatusFilter('Healthy')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Healthy' ? '1.5px solid #22c55e' : '1px solid var(--border)',
            background: statusFilter === 'Healthy' ? 'rgba(34,197,94,0.1)' : 'var(--surface)',
            color: statusFilter === 'Healthy' ? '#22c55e' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          🟢 Healthy
        </button>
        <button 
          onClick={() => setStatusFilter('On Order')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'On Order' ? '1.5px solid #3b82f6' : '1px solid var(--border)',
            background: statusFilter === 'On Order' ? 'rgba(59,130,246,0.1)' : 'var(--surface)',
            color: statusFilter === 'On Order' ? '#3b82f6' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          🔵 On Order
        </button>
        <button 
          onClick={() => setStatusFilter('Reorder Required')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Reorder Required' ? '1.5px solid #eab308' : '1px solid var(--border)',
            background: statusFilter === 'Reorder Required' ? 'rgba(234,179,8,0.1)' : 'var(--surface)',
            color: statusFilter === 'Reorder Required' ? '#eab308' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          🟡 Reorder Required
        </button>
        <button 
          onClick={() => setStatusFilter('Safety Stock')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Safety Stock' ? '1.5px solid #fb923c' : '1px solid var(--border)',
            background: statusFilter === 'Safety Stock' ? 'rgba(251,146,60,0.1)' : 'var(--surface)',
            color: statusFilter === 'Safety Stock' ? '#fb923c' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          🟠 Safety Stock
        </button>
        <button 
          onClick={() => setStatusFilter('Critical')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Critical' ? '1.5px solid #ef4444' : '1px solid var(--border)',
            background: statusFilter === 'Critical' ? 'rgba(239,68,68,0.1)' : 'var(--surface)',
            color: statusFilter === 'Critical' ? '#ef4444' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          🔴 Critical
        </button>
        <button 
          onClick={() => setStatusFilter('Out of Stock')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Out of Stock' ? '1.5px solid #8b949e' : '1px solid var(--border)',
            background: statusFilter === 'Out of Stock' ? 'rgba(139,148,158,0.1)' : 'var(--surface)',
            color: statusFilter === 'Out of Stock' ? '#8b949e' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          ⚫ Out of Stock
        </button>
        <button 
          onClick={() => setStatusFilter('Error')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            cursor: 'pointer',
            border: statusFilter === 'Error' ? '1.5px solid #ef4444' : '1px solid var(--border)',
            background: statusFilter === 'Error' ? 'rgba(239,68,68,0.1)' : 'var(--surface)',
            color: statusFilter === 'Error' ? '#ef4444' : 'var(--text)',
            transition: 'all 0.15s'
          }}
        >
          ❌ Error
        </button>
      </div>
    </div>
  );

  const columns = [
    { 
      key: 'ItemCode', 
      label: 'Item Code' 
    },
    {
      key: 'Status',
      label: 'Status',
      render: (val, row) => {
        const status = getInventoryStatus(
          row.TotalMonitored,
          row.ReorderLimitPoint,
          row.StatisticalTarget,
          row.TotalOpenPO,
          row.LeadTime,
          row.ActiveLeadTime,
          row.MinHistLT
        );
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            padding: '3px 10px', 
            borderRadius: 12, 
            fontSize: 11, 
            fontWeight: 700, 
            background: `${status.color}15`, 
            color: status.color,
            border: `1px solid ${status.color}30`,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: 10 }}>{status.dot}</span>
            {status.label}
          </span>
        );
      }
    },
    { 
      key: 'TotalMonitored', 
      label: 'Monitor Balance', 
      numeric: true,
      render: (val) => formatQty(val)
    },
    { 
      key: 'LeadTime', 
      label: 'Configured LT', 
      numeric: true,
      render: (val) => val > 0 ? `${val} Days` : '—'
    },

    {
      key: 'StatisticalTarget',
      label: 'Calculated Safety',
      numeric: true,
      render: (val, row) => row.ActiveLeadTime > 0 ? formatQty(val) : '—'
    },
    {
      key: 'ActiveLeadTime',
      label: 'Avg Lead Time',
      numeric: true,
      render: (val) => val > 0 ? `${Math.ceil(val)} Days` : '—'
    },
    {
      key: 'TotalOpenPO',
      label: 'Total Open PO',
      numeric: true,
      render: (val) => formatQty(val)
    },
    {
      key: 'AvgDailyConsumption',
      label: 'Avg Daily Consumption',
      numeric: true,
      render: (val) => formatQty(val)
    },
    {
      key: 'ReorderLimitPoint',
      label: 'Reorder Limit',
      numeric: true,
      render: (val, row) => row.ActiveLeadTime > 0 ? formatQty(val) : '—'
    },
    {
      key: 'ItemType',
      label: 'Item Type'
    },
    { 
      key: 'LastMaintDate', 
      label: 'Last Maint Date',
      render: (val) => formatDate(val) 
    }
  ];

  return (
    <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <DataGrid
        title="Safety Stock Item Master"
        subtitle="Manage and monitor item safety stocks and lead times"
        columns={columns}
        rows={filteredRows}
        controlPanel={controlPanel}
        loading={loading}
        onRefresh={loadData}
        onEdit={(row) => handleOpenDrawer(row)}
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Slide-out Drawer */}
      {isDrawerOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />
          
          {/* Drawer Body */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '50vw',
              maxWidth: '90vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.25s ease-out',
              fontFamily: 'var(--font)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--soft)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                Safety Stock Details
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeTab === 'summary' && (
                  <button
                    onClick={handlePrint}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>🖨️</span> Print / PDF
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{
                    background: 'var(--orange)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: saveLoading ? 0.6 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  {saveLoading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Drawer Content */}
            <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Form Fields Section (Permanently at the top) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                {/* Item Code */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Item Code</label>
                  <input 
                    type="text" 
                    value={itemCode} 
                    disabled 
                    style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--soft)', color: 'var(--muted)', outline: 'none' }}
                  />
                </div>

                {/* Safety Stock and Lead Time side-by-side */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Safety Stock ({stockUM})</label>
                    <input 
                      type="number" 
                      value={saftyStock} 
                      onChange={(e) => setSaftyStock(e.target.value)}
                      style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Lead Time (Days)</label>
                    <input 
                      type="number" 
                      value={leadTime} 
                      onChange={(e) => setLeadTime(e.target.value)}
                      style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs Selector Section */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--soft)', padding: '0 8px', gap: 4, overflowX: 'auto', minHeight: 42 }}>
                <button
                  onClick={() => setActiveTab('summary')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'summary' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'summary' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'summary' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('balance')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'balance' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'balance' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'balance' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Item Balance
                </button>
                <button
                  onClick={() => setActiveTab('consumption')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'consumption' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'consumption' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'consumption' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Consumption
                </button>
                <button
                  onClick={() => setActiveTab('openPos')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'openPos' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'openPos' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'openPos' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Open POs
                </button>
                <button
                  onClick={() => setActiveTab('leadTime')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'leadTime' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'leadTime' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'leadTime' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Lead Time
                </button>
                <button
                  onClick={() => setActiveTab('coverage')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'coverage' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'coverage' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'coverage' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Coverage
                </button>
                <button
                  onClick={() => setActiveTab('safetyStock')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'safetyStock' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'safetyStock' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'safetyStock' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Safety Stock
                </button>
                <button
                  onClick={() => setActiveTab('setup')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'setup' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'setup' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'setup' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Setup
                </button>
                <button
                  onClick={() => setActiveTab('terms')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'terms' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'terms' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'terms' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Terms
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'history' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'history' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'history' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Status History
                </button>
                <button
                  onClick={() => setActiveTab('receipts')}
                  style={{
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'receipts' ? '3px solid var(--orange)' : '3px solid transparent',
                    color: activeTab === 'receipts' ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeTab === 'receipts' ? 800 : 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Receipts
                </button>
              </div>

              {/* Tab Content: Summary Section */}
              {activeTab === 'summary' && (
                <div id="drawer-summary-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its summary dashboard.
                    </div>
                  ) : (balancesLoading || consumptionLoading || openPosLoading || leadTimesLoading) && 
                      (balances.length === 0 && consumption.length === 0 && openPos.length === 0 && leadTimes.length === 0) ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading summary metrics...
                    </div>
                  ) : (() => {
                    // Balance Calculations
                    const isPurchasingActive = isFlagActive(purchasingWarehouse);
                    const isProductionActive = isFlagActive(producationWarehouse);
                    const totalPhysical = balances.reduce((sum, b) => sum + Number(b.ItemBalance || 0), 0);
                    const totalMonitored = balances.reduce((sum, b) => {
                      const wPurchasing = isFlagActive(b.Purchasing);
                      const wProduction = isFlagActive(b.Production);
                      const monitored = b.Warehouse !== '999' && ((isPurchasingActive && wPurchasing) || (isProductionActive && wProduction));
                      return sum + (monitored ? Number(b.ItemBalance || 0) : 0);
                    }, 0);

                    // Consumption Calculations
                    const nonCurrentMonths = consumption.filter(c => !(c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1)));
                    const total12Months = nonCurrentMonths.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
                    const monthlyAverage = nonCurrentMonths.length > 0 ? (total12Months / nonCurrentMonths.length) : 0;
                    const values = nonCurrentMonths.map(c => Number(c.TotalQuantity || 0));
                    let variance = 0;
                    if (values.length > 1) {
                      const sqDiffs = values.map(v => Math.pow(v - monthlyAverage, 2));
                      variance = sqDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1);
                    }
                    const stdDev = Math.sqrt(variance);
                    const dailyAvg = Math.ceil(monthlyAverage / 26);

                    // Lead Time list by order, with ActualArrivalDate (take 3 most recent)
                    const sortedByArrival = [...leadTimes]
                      .filter(l => l.ActualArrivalDate && !isNaN(new Date(l.ActualArrivalDate).getTime()) && l.LeadTime != null && Number(l.OrderNumber) > 2499999 && Number(l.QuantityReceived) > 0)
                      .sort((a, b) => new Date(b.ActualArrivalDate) - new Date(a.ActualArrivalDate));
                    const recentThree = sortedByArrival.slice(0, 3);
                    
                    const configuredLT = Number(leadTime || 0);
                    const defaultLT = configuredLT > 0 
                      ? configuredLT 
                      : (recentThree.length > 0 
                          ? Math.ceil(recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length)
                          : 0);

                    let computedLeadTimeStdDev = 0;
                    if (configuredLT <= 0 && recentThree.length > 1) {
                      const ltMean = recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length;
                      const ltSqDiffs = recentThree.map(l => Math.pow(Number(l.LeadTime) - ltMean, 2));
                      const ltVar = ltSqDiffs.reduce((sum, d) => sum + d, 0) / (recentThree.length - 1);
                      computedLeadTimeStdDev = Math.sqrt(ltVar);
                    }

                    const activeLeadTime = defaultLT;
                    const activeLeadTimeStdDev = computedLeadTimeStdDev;

                    // Combined Std Dev
                    const dailyDemandStdDev = stdDev / 26;
                    const combinedStdDev = Math.sqrt(
                      activeLeadTime * Math.pow(dailyDemandStdDev, 2) +
                      Math.pow(dailyAvg, 2) * Math.pow(activeLeadTimeStdDev, 2)
                    );

                    const calculatedSafetyStock = activeLeadTime > 0 ? Math.ceil(combinedStdDev * serviceLevelFactor) : 0;
                    const demandUnderLeadTime = dailyAvg * activeLeadTime;
                    const reorderLimit = activeLeadTime > 0 ? Math.ceil(calculatedSafetyStock + demandUnderLeadTime) : 0;
                    const configuredSafetyStock = Number(saftyStock || 0);

                    // Open POs Calculations
                    const totalOpenQty = openPos.reduce((sum, p) => sum + Number(p.OpenQty || 0), 0);
                    const linesWithEta = openPos.filter(p => p.ETA && !isNaN(new Date(p.ETA).getTime()));
                    let lowestEtaDate = null;
                    let daysToArrive = null;
                    let lowestEtaQty = 0;
                    if (linesWithEta.length > 0) {
                      const dates = linesWithEta.map(p => new Date(p.ETA));
                      lowestEtaDate = new Date(Math.min(...dates));
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const lowestEtaTemp = new Date(lowestEtaDate.getTime());
                      lowestEtaTemp.setHours(0, 0, 0, 0);
                      const diffTime = lowestEtaTemp.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      daysToArrive = diffDays >= 0 ? diffDays : 0;
                      const matches = linesWithEta.filter(p => new Date(p.ETA).getTime() === lowestEtaDate.getTime());
                      lowestEtaQty = matches.reduce((sum, p) => sum + Number(p.OpenQty || 0), 0);
                    }

                    // Lead Time Calculations
                    const validLeadTimes = leadTimes.filter(l => l.LeadTime != null);
                    const avgLeadTime = validLeadTimes.length > 0
                      ? Math.round(validLeadTimes.reduce((sum, l) => sum + Number(l.LeadTime), 0) / validLeadTimes.length)
                      : null;
                    const minLeadTime = validLeadTimes.length > 0
                      ? Math.min(...validLeadTimes.map(l => Number(l.LeadTime)))
                      : null;
                    const maxLeadTime = validLeadTimes.length > 0
                      ? Math.max(...validLeadTimes.map(l => Number(l.LeadTime)))
                      : null;
                    let stdDevLeadTime = null;
                    if (validLeadTimes.length > 1) {
                      const mean = validLeadTimes.reduce((sum, l) => sum + Number(l.LeadTime), 0) / validLeadTimes.length;
                      const sqDiffs = validLeadTimes.map(l => Math.pow(Number(l.LeadTime) - mean, 2));
                      const avgSqDiff = sqDiffs.reduce((sum, d) => sum + d, 0) / (validLeadTimes.length - 1);
                      stdDevLeadTime = Math.sqrt(avgSqDiff);
                    } else if (validLeadTimes.length === 1) {
                      stdDevLeadTime = 0;
                    }
                    const validETS = leadTimes.filter(l => l.ETS != null);
                    const avgETS = validETS.length > 0
                      ? Math.round(validETS.reduce((sum, l) => sum + Number(l.ETS), 0) / validETS.length)
                      : null;

                    // Coverage calculations
                    const monitoredDays = dailyAvg > 0 ? (totalMonitored / dailyAvg) : 0;
                    const totalCoverageDays = dailyAvg > 0 ? ((totalMonitored + totalOpenQty) / dailyAvg) : 0;

                    const today = new Date();
                    
                    // Stock Covered Until Date
                    let stockCoveredUntilStr = '—';
                    if (dailyAvg > 0 && totalMonitored > 0) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + Math.ceil(monitoredDays));
                      stockCoveredUntilStr = date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    }
                    
                    // Total Covered Until Date
                    let totalCoveredUntilStr = '—';
                    if (dailyAvg > 0 && (totalMonitored + totalOpenQty) > 0) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + Math.ceil(totalCoverageDays));
                      totalCoveredUntilStr = date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    }
                    
                    const minHistLTVal = recentThree.length > 0 ? Math.min(...recentThree.map(l => Number(l.LeadTime))) : -1;
                    const row = rows.find(r => r.ID === selectedID) || {};
                    const statusObj = getInventoryStatus(
                      row.TotalMonitored !== undefined ? row.TotalMonitored : totalMonitored,
                      row.ReorderLimitPoint !== undefined ? row.ReorderLimitPoint : reorderLimit,
                      row.StatisticalTarget !== undefined ? row.StatisticalTarget : calculatedSafetyStock,
                      row.TotalOpenPO !== undefined ? row.TotalOpenPO : totalOpenQty,
                      row.LeadTime !== undefined ? row.LeadTime : leadTime,
                      row.ActiveLeadTime !== undefined ? row.ActiveLeadTime : activeLeadTime,
                      row.MinHistLT !== undefined ? row.MinHistLT : minHistLTVal
                    );
                    let healthStatus = `${statusObj.dot} ${statusObj.label}`;
                    let healthColor = statusObj.color;
                    let healthBg = `${statusObj.color}15`;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        
                        {/* Safety Stock KPIs Section */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            flex: 1,
                            background: `${statusObj.color}15`,
                            border: `1px solid ${statusObj.color}30`,
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: statusObj.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>Stock Health Status</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: statusObj.color, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                              <span>{statusObj.dot}</span> {statusObj.label}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Inventory condition</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--orange-soft)',
                            border: '1px solid rgba(249, 115, 22, 0.15)',
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Safety Stock</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>
                              {activeLeadTime > 0 ? `${formatQty(calculatedSafetyStock)} ${stockUM}` : '—'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{activeLeadTime > 0 ? 'Statistical target' : 'Lead Time is 0'}</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--amber-soft)',
                            border: '1px solid rgba(217, 119, 6, 0.15)',
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Reorder Limit</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                              {activeLeadTime > 0 ? `${formatQty(reorderLimit)} ${stockUM}` : '—'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{activeLeadTime > 0 ? 'SS + LT Demand' : 'Lead Time is 0'}</span>
                          </div>

                        </div>

                        {/* DEBUG DATA BLOCK FOR AI */}
                        <div style={{ padding: '8px', background: '#f8d7da', color: '#721c24', fontSize: '10px', fontFamily: 'monospace', borderRadius: '4px' }}>
                          DEBUG: stdDev={stdDev.toFixed(4)}, dailyDemandStdDev={dailyDemandStdDev.toFixed(4)}, monthlyAvg={monthlyAverage.toFixed(4)}, nonCurrentLength={nonCurrentMonths.length}, total12={total12Months}, activeLT={activeLeadTime}, LTStdDev={activeLeadTimeStdDev}, CombinedStdDev={combinedStdDev.toFixed(4)}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--green-soft)',
                            border: '1px solid rgba(22, 163, 74, 0.15)',
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Monitor Balance</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                              {formatQty(totalMonitored)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Monitored warehouses</span>
                          </div>
                        </div>
                        
                        {/* Section 1: Stock Balances */}
                        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Stock Balances</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Physical Balance</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{formatQty(totalPhysical)}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Monitored Balance</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>{formatQty(totalMonitored)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Coverage & Health */}
                        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Stock Coverage & Health</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Monitored Stock Coverage</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {dailyAvg > 0 ? `${Math.ceil(monitoredDays)} Days` : '—'}
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                                Covered until: {stockCoveredUntilStr}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Covered Until Date</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
                                {stockCoveredUntilStr}
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                                Date stock completely ends
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Earliest ETA</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {lowestEtaDate ? lowestEtaDate.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                                {daysToArrive !== null ? `Arriving in ${daysToArrive} day${daysToArrive === 1 ? '' : 's'}` : 'No open POs'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Stock Health Status</div>
                              <div style={{ marginTop: 6 }}>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '4px 8px',
                                  borderRadius: 8,
                                  background: healthBg,
                                  color: healthColor
                                }}>
                                  {healthStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Consumption & Demand */}
                        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Consumption & Demand (Excl. Current Month)</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Monthly Average</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>{formatQty(monthlyAverage)}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Daily Average</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{formatQty(monthlyAverage / 26)}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Standard Deviation (σ)</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{formatQty(stdDev)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Section 4: Open POs */}
                        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Open Purchase Orders</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Open Qty</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>{formatQty(totalOpenQty)}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Earliest ETA</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {lowestEtaDate ? lowestEtaDate.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Earliest Qty</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{lowestEtaQty > 0 ? formatQty(lowestEtaQty) : '—'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Days to Arrive</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {daysToArrive !== null ? `${daysToArrive} Day${daysToArrive === 1 ? '' : 's'}` : '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 5: Lead Time */}
                        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Lead Time Performance (Last 6 Orders)</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Average Lead Time</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
                                {avgLeadTime !== null ? `${avgLeadTime} Days` : '—'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Std Deviation (σ)</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {stdDevLeadTime !== null ? `${stdDevLeadTime.toFixed(1)} Days` : '—'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Min / Max Lead Time</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {minLeadTime !== null ? `${minLeadTime} / ${maxLeadTime} Days` : '—'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Avg Shipping Time</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                                {avgETS !== null ? `${avgETS} Days` : '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Balance Section */}
              {activeTab === 'balance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its warehouse stock balances.
                    </div>
                  ) : balancesLoading ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading balances...
                    </div>
                  ) : balancesError ? (
                    <div className="err-page" style={{ padding: 12 }}>⚠ {balancesError}</div>
                  ) : balances.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No balances found for item **{itemCode}**.
                    </div>
                  ) : (() => {
                    const isPurchasingActive = isFlagActive(purchasingWarehouse);
                    const isProductionActive = isFlagActive(producationWarehouse);
                    
                    const totalPhysical = balances.reduce((sum, b) => sum + Number(b.ItemBalance || 0), 0);
                    const totalMonitored = balances.reduce((sum, b) => {
                      const wPurchasing = isFlagActive(b.Purchasing);
                      const wProduction = isFlagActive(b.Production);
                      const monitored = (isPurchasingActive && wPurchasing) || (isProductionActive && wProduction);
                      return sum + (monitored ? Number(b.ItemBalance || 0) : 0);
                    }, 0);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* KPI Cards Section */}
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Physical Balance</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatQty(totalPhysical)}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Across all warehouses</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Monitored Balance</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{formatQty(totalMonitored)}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Based on safety stock setup</span>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Facility</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Warehouse</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center' }}>Purchasing</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center' }}>Production</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balances.map((b, idx) => (
                              <tr 
                                key={idx} 
                                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '10px 4px', fontWeight: 600 }}>{b.WarehouseFacility || '—'}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{b.Warehouse || '—'}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 8,
                                    background: isFlagActive(b.Purchasing) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: isFlagActive(b.Purchasing) ? '#22c55e' : '#ef4444',
                                  }}>
                                    {isFlagActive(b.Purchasing) ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 8,
                                    background: isFlagActive(b.Production) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: isFlagActive(b.Production) ? '#22c55e' : '#ef4444',
                                  }}>
                                    {isFlagActive(b.Production) ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700 }}>{formatQty(b.ItemBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                              <td colSpan={4} style={{ padding: '12px 4px 6px 4px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Total Physical Balance</td>
                              <td style={{ padding: '12px 4px 6px 4px', textAlign: 'right', fontSize: 14 }}>{formatQty(totalPhysical)}</td>
                            </tr>
                            <tr style={{ fontWeight: 800, color: 'var(--orange)' }}>
                              <td colSpan={4} style={{ padding: '6px 4px 10px 4px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>Total Monitored Balance (Safety Stock Setup)</td>
                              <td style={{ padding: '6px 4px 10px 4px', textAlign: 'right', fontSize: 14 }}>{formatQty(totalMonitored)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Consumption Section */}
              {activeTab === 'consumption' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its consumption.
                    </div>
                  ) : consumptionLoading ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading consumption...
                    </div>
                  ) : consumptionError ? (
                    <div className="err-page" style={{ padding: 12 }}>⚠ {consumptionError}</div>
                  ) : consumption.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No consumption history found for item **{itemCode}**.
                    </div>
                  ) : (() => {
                    const nonCurrentMonths = consumption.filter(c => !(c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1)));
                    const total12Months = nonCurrentMonths.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
                    const monthlyAverage = total12Months > 0 ? (total12Months / 12) : 0;

                    const values = nonCurrentMonths.map(c => Number(c.TotalQuantity || 0));
                    let variance = 0;
                    if (values.length > 1) {
                      const sqDiffs = values.map(v => Math.pow(v - monthlyAverage, 2));
                      variance = sqDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1);
                    }
                    const stdDev = Math.sqrt(variance);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* KPI Cards Section */}
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Monthly Avg</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{formatQty(monthlyAverage)}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Excludes current month</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Std Deviation (σ)</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatQty(stdDev)}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Monthly demand variance</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Daily Avg</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatQty(monthlyAverage / 26)}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Monthly Avg / 26 days</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            Consumption History Breakdowns
                          </span>
                          <button 
                            onClick={handleExportConsumption}
                            style={{
                              background: 'var(--orange)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'opacity 0.2s',
                              outline: 'none'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = 0.85}
                            onMouseOut={e => e.currentTarget.style.opacity = 1}
                          >
                            📥 Export to Excel
                          </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Year</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Month</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Qty Consumed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consumption.map((c, idx) => {
                              const key = `${c.Yer}-${c.Mnth}`;
                              const isExpanded = expandedRow === key;
                              const hasDetails = c.details && c.details.length > 0;
                              const isCurrentMonth = c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1);
                              return (
                                <React.Fragment key={idx}>
                                  <tr 
                                    onClick={() => hasDetails && setExpandedRow(isExpanded ? null : key)}
                                    style={{ 
                                      borderBottom: '1px solid var(--border)', 
                                      transition: 'background 0.1s', 
                                      cursor: hasDetails ? 'pointer' : 'default',
                                      background: isCurrentMonth ? 'rgba(249, 115, 22, 0.08)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => hasDetails && (e.currentTarget.style.background = isCurrentMonth ? 'rgba(249, 115, 22, 0.12)' : 'var(--soft)')}
                                    onMouseLeave={(e) => hasDetails && (e.currentTarget.style.background = isCurrentMonth ? 'rgba(249, 115, 22, 0.08)' : 'transparent')}
                                  >
                                    <td style={{ padding: '10px 4px', fontWeight: 600 }}>
                                      {hasDetails && (
                                        <span style={{ 
                                          marginRight: 8, 
                                          display: 'inline-block', 
                                          transition: 'transform 0.15s', 
                                          transform: isExpanded ? 'rotate(90deg)' : 'none', 
                                          color: isCurrentMonth ? 'var(--orange)' : 'var(--muted)', 
                                          fontSize: 10 
                                        }}>❯</span>
                                      )}
                                      {!hasDetails && (
                                        <span style={{ marginRight: 8, display: 'inline-block', width: 10 }} />
                                      )}
                                      {c.Yer || '—'}
                                    </td>
                                    <td style={{ padding: '10px 4px', fontWeight: 600, color: isCurrentMonth ? 'var(--orange)' : 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {c.Mnth || '—'}
                                      {isCurrentMonth && (
                                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--orange)', color: '#fff', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                                          Current
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700 }}>{formatQty(c.TotalQuantity)}</td>
                                  </tr>
                                  {isExpanded && hasDetails && (
                                    <tr style={{ background: 'var(--soft)' }}>
                                      <td colSpan={3} style={{ padding: '12px 16px 16px 24px' }}>
                                        <div style={{
                                          borderLeft: '3px solid var(--orange)',
                                          paddingLeft: 16,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 6
                                        }}>
                                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                                            Warehouse Breakdown
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, fontSize: 11, paddingBottom: 4 }}>
                                            <div style={{ fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Facility</div>
                                            <div style={{ fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Warehouse</div>
                                            <div style={{ fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'right' }}>Quantity</div>
                                          </div>
                                          {c.details.map((d, dIdx) => (
                                            <div key={dIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, fontSize: 12, borderTop: '1px dashed var(--border)', paddingTop: 6, paddingBottom: 2 }}>
                                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{d.Facility}</div>
                                              <div style={{ color: 'var(--muted)' }}>{d.Warehouse}</div>
                                              <div style={{ fontWeight: 800, textAlign: 'right', color: 'var(--text)' }}>{formatQty(d.TotalQuantity)}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                              <td colSpan={2} style={{ padding: '12px 4px 6px 4px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Total Consumption (Last 12 Mos)</td>
                              <td style={{ padding: '12px 4px 6px 4px', textAlign: 'right', fontSize: 14 }}>{formatQty(total12Months)}</td>
                            </tr>
                            <tr style={{ fontWeight: 800, color: 'var(--orange)' }}>
                              <td colSpan={2} style={{ padding: '6px 4px 10px 4px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Monthly Average (Last 12 Mos)</td>
                              <td style={{ padding: '6px 4px 10px 4px', textAlign: 'right', fontSize: 14 }}>{formatQty(monthlyAverage)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Open POs Section */}
              {activeTab === 'openPos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its open POs.
                    </div>
                  ) : openPosLoading ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading open POs...
                    </div>
                  ) : openPosError ? (
                    <div className="err-page" style={{ padding: 12 }}>⚠ {openPosError}</div>
                  ) : openPos.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No open purchase orders found for item **{itemCode}**.
                    </div>
                  ) : (() => {
                    const totalOpenQty = openPos.reduce((sum, p) => sum + Number(p.OpenQty || 0), 0);
                    
                    const linesWithEta = openPos.filter(p => p.ETA && !isNaN(new Date(p.ETA).getTime()));
                    let lowestEtaDate = null;
                    let daysToArrive = null;
                    
                    let lowestEtaQty = 0;
                    if (linesWithEta.length > 0) {
                      const dates = linesWithEta.map(p => new Date(p.ETA));
                      lowestEtaDate = new Date(Math.min(...dates));
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const lowestEtaTemp = new Date(lowestEtaDate.getTime());
                      lowestEtaTemp.setHours(0, 0, 0, 0);
                      
                      const diffTime = lowestEtaTemp.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      daysToArrive = diffDays >= 0 ? diffDays : 0;

                      const matches = linesWithEta.filter(p => new Date(p.ETA).getTime() === lowestEtaDate.getTime());
                      lowestEtaQty = matches.reduce((sum, p) => sum + Number(p.OpenQty || 0), 0);
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* KPI Cards Section */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Open Qty</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>{formatQty(totalOpenQty)}</span>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>Across all open POs</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Earliest ETA</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                              {lowestEtaDate ? lowestEtaDate.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>First scheduled delivery</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Earliest Qty</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{lowestEtaQty > 0 ? formatQty(lowestEtaQty) : '—'}</span>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>Arriving on earliest ETA</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Days to Arrive</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                              {daysToArrive !== null ? `${daysToArrive} Day${daysToArrive === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>Starting from today</span>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>PO Number</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Supplier</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Released</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ETD</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ETA</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Ordered</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Received</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Open Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {openPos.map((p, idx) => (
                              <tr 
                                key={idx} 
                                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '10px 4px', fontWeight: 600 }}>{p.OrderNumber || '—'}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(p.OrderDate)}</td>
                                <td style={{ padding: '10px 4px' }}>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: p.OrderState === 4 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                                    color: p.OrderState === 4 ? '#22c55e' : '#f97316'
                                  }}>
                                    {p.OrderStateDescription || 'Open'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 4px', color: 'var(--text)' }} title={p.VendorNumber}>{p.VendorName || '—'}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(p.ReleaseDate)}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(p.ETD)}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(p.ETA)}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--muted)' }}>{formatQty(p.QuantityOrdered)}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--muted)' }}>{formatQty(p.QuantityReceived)}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{formatQty(p.OpenQty)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                              <td colSpan={9} style={{ padding: '12px 4px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Total Open Quantity</td>
                              <td style={{ padding: '12px 4px', textAlign: 'right', fontSize: 14, color: 'var(--orange)' }}>{formatQty(totalOpenQty)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Lead Time Section */}
              {activeTab === 'leadTime' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its lead times.
                    </div>
                  ) : leadTimesLoading ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading lead times...
                    </div>
                  ) : leadTimesError ? (
                    <div className="err-page" style={{ padding: 12 }}>⚠ {leadTimesError}</div>
                  ) : leadTimes.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No lead time history found for item **{itemCode}**.
                    </div>
                  ) : (() => {
                    const sortedByArrival = [...leadTimes]
                      .filter(l => l.ActualArrivalDate && !isNaN(new Date(l.ActualArrivalDate).getTime()) && l.LeadTime != null)
                      .sort((a, b) => new Date(b.ActualArrivalDate) - new Date(a.ActualArrivalDate));
                    const recentThree = sortedByArrival.slice(0, 3);

                    const avgLeadTime = recentThree.length > 0
                      ? Math.round(recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length)
                      : null;
                    const minLeadTime = recentThree.length > 0
                      ? Math.min(...recentThree.map(l => Number(l.LeadTime)))
                      : null;
                    const maxLeadTime = recentThree.length > 0
                      ? Math.max(...recentThree.map(l => Number(l.LeadTime)))
                      : null;

                    let stdDevLeadTime = null;
                    if (recentThree.length > 1) {
                      const mean = recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length;
                      const sqDiffs = recentThree.map(l => Math.pow(Number(l.LeadTime) - mean, 2));
                      const avgSqDiff = sqDiffs.reduce((sum, d) => sum + d, 0) / (recentThree.length - 1);
                      stdDevLeadTime = Math.sqrt(avgSqDiff);
                    } else if (recentThree.length === 1) {
                      stdDevLeadTime = 0;
                    }

                    const validETS = recentThree.filter(l => l.ETS != null);
                    const avgETS = validETS.length > 0
                      ? Math.round(validETS.reduce((sum, l) => sum + Number(l.ETS), 0) / validETS.length)
                      : null;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* KPI Cards Section */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Avg Lead Time</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>
                              {avgLeadTime !== null ? `${avgLeadTime} Day${avgLeadTime === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>Release to Arrival</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Std Deviation</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              {stdDevLeadTime !== null ? `${stdDevLeadTime.toFixed(1)} Day${stdDevLeadTime === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>Consistency (σ)</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Min Lead Time</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              {minLeadTime !== null ? `${minLeadTime} Day${minLeadTime === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>Fastest execution</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Max Lead Time</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              {maxLeadTime !== null ? `${maxLeadTime} Day${maxLeadTime === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>Slowest execution</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Avg Shipping</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              {avgETS !== null ? `${avgETS} Day${avgETS === 1 ? '' : 's'}` : '—'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>ETD to ETA</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>POs Analyzed</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              {recentThree.length} PO{recentThree.length === 1 ? '' : 's'}
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--muted)' }}>Delivered POs list</span>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>PO Number</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Vendor Name</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Released</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ETD</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ETA</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Arrival Date</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>ETS (Days)</th>
                              <th style={{ padding: '8px 4px', color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Lead Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentThree.map((l, idx) => (
                              <tr 
                                key={idx} 
                                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '10px 4px', fontWeight: 600 }}>{l.OrderNumber || '—'}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--text)' }}>{l.VendorName || '—'}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(l.ReleaseDate)}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(l.ETD)}</td>
                                <td style={{ padding: '10px 4px', color: 'var(--muted)' }}>{formatDate(l.ETA)}</td>
                                <td style={{ padding: '10px 4px', fontWeight: 600, color: 'var(--text)' }}>{formatDate(l.ActualArrivalDate)}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--muted)' }}>{l.ETS != null ? formatQty(l.ETS) : '—'}</td>
                                <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{l.LeadTime != null ? `${formatQty(l.LeadTime)} Days` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Coverage Section */}
              {activeTab === 'coverage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its coverage metrics.
                    </div>
                  ) : (() => {
                    const isPurchasingActive = isFlagActive(purchasingWarehouse);
                    const isProductionActive = isFlagActive(producationWarehouse);
                    
                    const totalPhysical = balances.reduce((sum, b) => sum + Number(b.ItemBalance || 0), 0);
                    const totalMonitored = balances.reduce((sum, b) => {
                      const wPurchasing = isFlagActive(b.Purchasing);
                      const wProduction = isFlagActive(b.Production);
                      const monitored = b.Warehouse !== '999' && ((isPurchasingActive && wPurchasing) || (isProductionActive && wProduction));
                      return sum + (monitored ? Number(b.ItemBalance || 0) : 0);
                    }, 0);

                    const nonCurrentMonths = consumption.filter(c => !(c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1)));
                    const total12Months = nonCurrentMonths.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
                    const monthlyAverage = nonCurrentMonths.length > 0 ? (total12Months / nonCurrentMonths.length) : 0;
                    const dailyAvg = Math.ceil(monthlyAverage / 26);
                    const totalOpenQty = openPos.reduce((sum, p) => sum + Number(p.OpenQty || 0), 0);
                    const monitoredDays = dailyAvg > 0 ? (totalMonitored / dailyAvg) : 0;
                    const physicalDays = dailyAvg > 0 ? (totalPhysical / dailyAvg) : 0;
                    const totalCoverageDays = dailyAvg > 0 ? ((totalMonitored + totalOpenQty) / dailyAvg) : 0;

                    const today = new Date();
                    
                    // Stock Covered Until Date
                    let stockCoveredUntilStr = '—';
                    if (dailyAvg > 0 && totalMonitored > 0) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + Math.ceil(monitoredDays));
                      stockCoveredUntilStr = date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    }
                    
                    // Total Covered Until Date
                    let totalCoveredUntilStr = '—';
                    if (dailyAvg > 0 && (totalMonitored + totalOpenQty) > 0) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + Math.ceil(totalCoverageDays));
                      totalCoveredUntilStr = date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
                    }

                    // Open PO Nearest ETA calculations
                    const linesWithEta = openPos.filter(p => p.ETA && !isNaN(new Date(p.ETA).getTime()));
                    let lowestEtaDate = null;
                    let daysToArrive = null;
                    if (linesWithEta.length > 0) {
                      const dates = linesWithEta.map(p => new Date(p.ETA));
                      lowestEtaDate = new Date(Math.min(...dates));
                      const todayZero = new Date();
                      todayZero.setHours(0, 0, 0, 0);
                      const lowestEtaTemp = new Date(lowestEtaDate.getTime());
                      lowestEtaTemp.setHours(0, 0, 0, 0);
                      const diffTime = lowestEtaTemp.getTime() - todayZero.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      daysToArrive = diffDays >= 0 ? diffDays : 0;
                    }

                    const row = rows.find(r => r.ID === selectedID) || {};
                    const statusObj = getInventoryStatus(
                       row.TotalMonitored !== undefined ? row.TotalMonitored : totalMonitored,
                       row.ReorderLimitPoint !== undefined ? row.ReorderLimitPoint : reorderLimit,
                       row.StatisticalTarget !== undefined ? row.StatisticalTarget : calculatedSafetyStock,
                       row.TotalOpenPO !== undefined ? row.TotalOpenPO : totalOpenQty,
                       row.LeadTime !== undefined ? row.LeadTime : leadTime,
                       row.ActiveLeadTime !== undefined ? row.ActiveLeadTime : activeLeadTime,
                       row.MinHistLT !== undefined ? row.MinHistLT : minHistLTVal
                     );
                     let healthStatus = `${statusObj.dot} ${statusObj.label}`;
                     let healthColor = statusObj.color;
                     let healthBg = `${statusObj.color}15`;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* KPI Cards Section */}
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Daily Consumption Rate</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                              {dailyAvg > 0 ? `${formatQty(dailyAvg)}/day` : '—'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Monthly Average / 26</span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Monitored Coverage</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                              {dailyAvg > 0 ? `${Math.ceil(monitoredDays)} Days` : '—'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                              {stockCoveredUntilStr !== '—' ? `Covered until: ${stockCoveredUntilStr}` : 'Current stock lifetime'}
                            </span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Covered Until Date</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>
                              {stockCoveredUntilStr}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                              Date stock completely ends
                            </span>
                          </div>

                          <div style={{
                            flex: 1,
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Nearest ETA</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                              {lowestEtaDate ? lowestEtaDate.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                              {daysToArrive !== null ? `Arriving in ${daysToArrive} day${daysToArrive === 1 ? '' : 's'}` : 'No open POs'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Safety Stock Section */}
              {activeTab === 'safetyStock' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {!itemCode ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Please select an item to view its safety stock simulator.
                    </div>
                  ) : (() => {
                    const nonCurrentMonths = consumption.filter(c => !(c.Yer === new Date().getFullYear() && c.Mnth === (new Date().getMonth() + 1)));
                    const total12Months = nonCurrentMonths.reduce((sum, c) => sum + Number(c.TotalQuantity || 0), 0);
                    const monthlyAverage = nonCurrentMonths.length > 0 ? (total12Months / nonCurrentMonths.length) : 0;
                    const values = nonCurrentMonths.map(c => Number(c.TotalQuantity || 0));
                    let variance = 0;
                    if (values.length > 1) {
                      const sqDiffs = values.map(v => Math.pow(v - monthlyAverage, 2));
                      variance = sqDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1);
                    }
                    const stdDev = Math.sqrt(variance);
                    
                    const avgDailyDemand = Math.ceil(monthlyAverage / 26);
                    const dailyDemandStdDev = stdDev / 26;

                    // Lead Time list by order, with ActualArrivalDate (take 3 most recent)
                    const sortedByArrival = [...leadTimes]
                      .filter(l => l.ActualArrivalDate && !isNaN(new Date(l.ActualArrivalDate).getTime()) && l.LeadTime != null && Number(l.OrderNumber) > 2499999 && Number(l.QuantityReceived) > 0)
                      .sort((a, b) => new Date(b.ActualArrivalDate) - new Date(a.ActualArrivalDate));
                    const recentThree = sortedByArrival.slice(0, 3);
                    
                    // Use configured LeadTime if present in SaftyStockItemMaster, otherwise average from recent orders
                    const configuredLT = Number(leadTime || 0);
                    const defaultLT = configuredLT > 0 
                      ? configuredLT 
                      : (recentThree.length > 0 
                          ? Math.ceil(recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length)
                          : 0);

                    let computedLeadTimeStdDev = 0;
                    if (configuredLT <= 0 && recentThree.length > 1) {
                      const ltMean = recentThree.reduce((sum, l) => sum + Number(l.LeadTime), 0) / recentThree.length;
                      const ltSqDiffs = recentThree.map(l => Math.pow(Number(l.LeadTime) - ltMean, 2));
                      const ltVar = ltSqDiffs.reduce((sum, d) => sum + d, 0) / (recentThree.length - 1);
                      computedLeadTimeStdDev = Math.sqrt(ltVar);
                    }

                    const activeLeadTime = simLeadTime !== '' ? Number(simLeadTime) : defaultLT;
                    const activeLeadTimeStdDev = simLeadTimeStdDev !== '' ? Number(simLeadTimeStdDev) : computedLeadTimeStdDev;

                    // Combined Std Dev formula:
                    // sqrt( avgLeadTime * dailyDemandStdDev^2 + avgDailyDemand^2 * leadTimeStdDev^2 )
                    const combinedStdDev = Math.sqrt(
                      activeLeadTime * Math.pow(dailyDemandStdDev, 2) +
                      Math.pow(avgDailyDemand, 2) * Math.pow(activeLeadTimeStdDev, 2)
                    );

                    const calculatedSafetyStock = Math.ceil(combinedStdDev * serviceLevelFactor);
                    const demandUnderLeadTime = avgDailyDemand * activeLeadTime;
                    const reorderLimit = Math.ceil(calculatedSafetyStock + demandUnderLeadTime);
                    const configuredSafetyStock = Number(saftyStock || 0);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Simulation Control Card */}
                        <div className="print-hide" style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Simulator Controls</span>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Service Level Factor (Z)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={serviceLevelFactor}
                                onChange={(e) => setServiceLevelFactor(Number(e.target.value) || 0)}
                                style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Lead Time (Days)</label>
                              <input 
                                type="number" 
                                placeholder={`${defaultLT.toFixed(1)} (Auto)`}
                                value={simLeadTime}
                                onChange={(e) => setSimLeadTime(e.target.value)}
                                style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Lead Time Std Dev</label>
                              <input 
                                type="number" 
                                placeholder={`${computedLeadTimeStdDev.toFixed(2)} (Auto)`}
                                value={simLeadTimeStdDev}
                                onChange={(e) => setSimLeadTimeStdDev(e.target.value)}
                                style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>ZPresets</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setServiceLevelFactor(1.28)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: serviceLevelFactor === 1.28 ? 'var(--orange)' : 'var(--surface)', color: serviceLevelFactor === 1.28 ? '#fff' : 'var(--text)' }}>90% (1.28)</button>
                              <button onClick={() => setServiceLevelFactor(1.65)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: serviceLevelFactor === 1.65 ? 'var(--orange)' : 'var(--surface)', color: serviceLevelFactor === 1.65 ? '#fff' : 'var(--text)' }}>95% (1.65)</button>
                              <button onClick={() => setServiceLevelFactor(1.96)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: serviceLevelFactor === 1.96 ? 'var(--orange)' : 'var(--surface)', color: serviceLevelFactor === 1.96 ? '#fff' : 'var(--text)' }}>97.5% (1.96)</button>
                              <button onClick={() => setServiceLevelFactor(2.33)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: serviceLevelFactor === 2.33 ? 'var(--orange)' : 'var(--surface)', color: serviceLevelFactor === 2.33 ? '#fff' : 'var(--text)' }}>99% (2.33)</button>
                              {(simLeadTime !== '' || simLeadTimeStdDev !== '') && (
                                <button onClick={() => { setSimLeadTime(''); setSimLeadTimeStdDev(''); }} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, border: '1px solid var(--orange)', borderRadius: 6, cursor: 'pointer', background: 'none', color: 'var(--orange)', marginLeft: 'auto' }}>Reset Overrides</button>
                              )}
                            </div>
                          </div>
                        </div>

                        {activeLeadTime === 0 ? (
                          <div style={{
                            border: '1px solid #ef4444',
                            borderRadius: 12,
                            padding: '24px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            textAlign: 'center',
                            marginTop: 8
                          }}>
                            <span style={{ fontSize: 32 }}>⚠</span>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>Lead Time is 0</span>
                            <span style={{ fontSize: 13, color: 'var(--text)', opacity: 0.8, maxWidth: 450 }}>
                              Safety stock and reorder point cannot be calculated because Lead Time is 0 in both configured master record and historical orders. Please configure a Lead Time value at the top of this drawer or in the simulator controls above.
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* KPI Cards Section */}
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{
                                flex: 1,
                                background: 'var(--soft)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Service Level Factor</span>
                                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                                  {serviceLevelFactor}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Z-Score multiplier</span>
                              </div>

                              <div style={{
                                flex: 1,
                                background: 'var(--soft)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Safety Stock</span>
                                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>
                                  {formatQty(calculatedSafetyStock)}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Combined target ({stockUM})</span>
                              </div>

                              <div style={{
                                flex: 1,
                                background: 'var(--soft)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Reorder Limit</span>
                                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                                  {formatQty(reorderLimit)}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>SS + Demand ({stockUM})</span>
                              </div>

                              <div style={{
                                flex: 1,
                                background: 'var(--soft)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Configured SS</span>
                                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                                  {formatQty(configuredSafetyStock)}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>ERP Record ({stockUM})</span>
                              </div>
                            </div>

                            {/* Analysis Card */}
                            <div style={{
                              border: '1px solid var(--border)',
                              borderRadius: 12,
                              padding: '16px 20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              fontSize: 13,
                              fontWeight: 600,
                              color: configuredSafetyStock >= calculatedSafetyStock ? '#22c55e' : '#f97316',
                              background: configuredSafetyStock >= calculatedSafetyStock ? 'rgba(34, 197, 94, 0.08)' : 'rgba(249, 115, 22, 0.08)'
                            }}>
                              <span>{configuredSafetyStock >= calculatedSafetyStock ? '✔' : '⚠'}</span>
                              <span>
                                {configuredSafetyStock >= calculatedSafetyStock 
                                  ? `Configured Safety Stock (${formatQty(configuredSafetyStock)} ${stockUM}) is sufficient to cover the statistical target (${formatQty(calculatedSafetyStock)} ${stockUM}) for Z = ${serviceLevelFactor}.`
                                  : `Configured Safety Stock (${formatQty(configuredSafetyStock)} ${stockUM}) is under-configured compared to the statistical target (${formatQty(calculatedSafetyStock)} ${stockUM}) for Z = ${serviceLevelFactor}. Recommended adjustment: +${formatQty(calculatedSafetyStock - configuredSafetyStock)} ${stockUM}.`}
                              </span>
                            </div>

                            {/* Formula Breakdown Details */}
                            <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Calculation Parameters</span>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10 }}>Parameter</div>
                                <div style={{ fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10, textAlign: 'right' }}>Value</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Average Daily Demand (monthly avg / 26)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(avgDailyDemand)} {stockUM}/day</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Daily Demand Std Dev (monthly std dev / 26)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(dailyDemandStdDev)} {stockUM}/day</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Average Lead Time (LT in Days)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{activeLeadTime.toFixed(1)} Days</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Lead Time Std Dev (LT Std Dev in Days)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{activeLeadTimeStdDev.toFixed(2)} Days</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Combined Std Dev (Demand + LT Variability)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{combinedStdDev.toFixed(4)}</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                                <div style={{ fontWeight: 600 }}>Demand Under Lead Time (Avg Daily Demand × LT)</div>
                                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(demandUnderLeadTime)} {stockUM}</div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 12, fontSize: 13 }}>
                                <div style={{ fontWeight: 700, color: 'var(--orange)' }}>Statistical Combined Std Dev Formula</div>
                                <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>√[ LT × σDaily² + DDaily² × σLT² ]</div>
                              </div>
                            </div>
                          </>
                        )}

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: Setup Section */}
              {activeTab === 'setup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Warehouse Monitoring Setup
                  </div>
                  
                  {/* Purchasing WH and Production WH Flags */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--soft)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Purchasing WH</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: isFlagActive(purchasingWarehouse) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isFlagActive(purchasingWarehouse) ? '#22c55e' : '#ef4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {isFlagActive(purchasingWarehouse) ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--soft)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Production WH</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: isFlagActive(producationWarehouse) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isFlagActive(producationWarehouse) ? '#22c55e' : '#ef4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {isFlagActive(producationWarehouse) ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Terms Section */}
              {activeTab === 'terms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Calculation Glossary
                  </div>
                  <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>Safety Stock</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Minimum buffer to protect against demand and supplier variability.
                      </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Reorder Limit</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory level at which a Purchase order should be placed.
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginTop: 8, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Inventory Health Statuses
                  </div>
                  <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🟢</span> Healthy
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory is above the Reorder Limit.
                      </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🟡</span> Reorder Required
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory has reached the Reorder Limit. No open PO exists.
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🔵</span> On Order
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory is below the Reorder Limit, but a purchase order is already open.
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🟠</span> Safety Stock
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory has fallen into the Safety Stock buffer.
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🔴</span> Critical
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory is below Safety Stock and no replenishment is expected soon.
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚫</span> Out of Stock
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Inventory is zero or negative.
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 1, background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>❌</span> Error
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '1.6' }}>
                        Safety Stock is zero or negative, or no Lead Time is defined (Lead Time and active/historical lead times are zero or negative).
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Status History Section */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Status Transition History
                  </div>

                  {statusHistoryLoading && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading transition history...
                    </div>
                  )}

                  {statusHistoryError && (
                    <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12 }}>
                      ⚠ {statusHistoryError}
                    </div>
                  )}

                  {!statusHistoryLoading && !statusHistoryError && statusHistory.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--soft)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      No status history recorded for this item yet. Transitions will be logged automatically as warehouse stock levels or POs change.
                    </div>
                  )}

                  {!statusHistoryLoading && !statusHistoryError && statusHistory.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 20 }}>
                      <div style={{
                        position: 'absolute',
                        left: 6,
                        top: 12,
                        bottom: 12,
                        width: 2,
                        background: 'var(--border)'
                      }}></div>

                      {statusHistory.map((log) => {
                        const getStatusStyle = (status) => {
                          switch (status) {
                            case 'Healthy': return { dot: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
                            case 'On Order': return { dot: '🔵', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
                            case 'Reorder Required': return { dot: '🟡', color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
                            case 'Safety Stock': return { dot: '🟠', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' };
                            case 'Critical': return { dot: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                            case 'Out of Stock': return { dot: '⚫', color: '#8b949e', bg: 'rgba(139,148,158,0.1)' };
                            case 'Error': return { dot: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                            default: return { dot: '⚪', color: 'var(--muted)', bg: 'var(--soft)' };
                          }
                        };
                        const oldStyle = log.OldStatus ? getStatusStyle(log.OldStatus) : null;
                        const newStyle = getStatusStyle(log.NewStatus);
                        const logDate = new Date(log.LogDate);

                        return (
                          <div key={log.LogID} style={{ position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              left: -20,
                              top: 6,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: newStyle.color,
                              border: '3px solid var(--surface)',
                              boxShadow: '0 0 0 1px var(--border)'
                            }}></div>

                            <div style={{ 
                              background: 'var(--surface)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 12, 
                              padding: '16px 20px',
                              boxShadow: 'var(--shadow)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  {oldStyle ? (
                                    <>
                                      <span style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        background: oldStyle.bg,
                                        color: oldStyle.color,
                                        textTransform: 'uppercase'
                                      }}>
                                        {oldStyle.dot} {log.OldStatus}
                                      </span>
                                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>➔</span>
                                    </>
                                  ) : null}
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: newStyle.bg,
                                    color: newStyle.color,
                                    textTransform: 'uppercase'
                                  }}>
                                    {newStyle.dot} {log.NewStatus}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                                  {logDate.toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                <div>
                                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Monitored Bal</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                                    {formatQty(log.MonitoredBalance)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Reorder Limit</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                                    {formatQty(log.ReorderLimit)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Calculated SS</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                                    {formatQty(log.CalculatedSafetyStock)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Open PO Qty</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                                    {formatQty(log.OpenPOQty)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Receipts Section */}
              {activeTab === 'receipts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Historical Receipts (Top 10)
                  </div>

                  {receiptsLoading && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Loading receipts...
                    </div>
                  )}

                  {receiptsError && (
                    <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12 }}>
                      ⚠ {receiptsError}
                    </div>
                  )}

                  {!receiptsLoading && !receiptsError && receipts.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--soft)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      No receipts found for this item code.
                    </div>
                  )}

                  {!receiptsLoading && !receiptsError && receipts.length > 0 && (
                    <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Receiving Date</th>
                            <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Warehouse</th>
                            <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'right' }}>Quantity Received</th>
                            <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipts.map((r, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === receipts.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                                {r.ReceivingDate ? new Date(r.ReceivingDate).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>
                                {r.Warehouse || '—'}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
                                {formatQty(r.QuantityReceived)}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '4px 8px',
                                  borderRadius: 12,
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#22c55e',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}>
                                  {r.StateDescription || 'Received'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
