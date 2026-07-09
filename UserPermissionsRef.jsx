import { useState, useEffect } from "react";
import { apiCall } from "../shared/api.js";

const OPS = ["=", "<>", ">", ">=", "<", "<=", "LIKE", "IN", "IS NULL", "IS NOT NULL"];
const VARS = ["@UserID", "@Username"];

const CSS = `
.up-wrap{display:flex;flex-direction:column;min-height:calc(100vh - 56px)}
.up-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--surface)}
.up-head h2{font-size:20px;font-weight:900}
.up-body{flex:1;padding:18px;background:var(--bg);overflow:auto}
.up-four{display:grid;grid-template-columns:220px 190px 1fr 1fr;gap:12px}
.up-col{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 150px)}
.up-ch{padding:11px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.up-ch .t{font-weight:900;font-size:13px;display:flex;align-items:center;gap:7px}
.up-ch .cnt{color:var(--muted);font-size:11px;font-weight:800}
.up-search{height:32px;border:0;border-bottom:1px solid var(--border);padding:0 12px;font-size:12px;outline:none;background:var(--soft)}
.up-cb{flex:1;overflow:auto;padding:6px}
.up-u{padding:10px 11px;border-radius:9px;cursor:pointer;display:flex;align-items:center;gap:9px;margin-bottom:3px}
.up-u:hover{background:var(--soft)}.up-u.active{background:var(--primary-soft)}
.up-av{width:28px;height:28px;border-radius:50%;background:var(--primary-soft);color:var(--primary-dark);display:grid;place-items:center;font-size:11px;font-weight:900;flex-shrink:0}
.up-u.active .up-av{background:var(--primary);color:#fff}
.up-um{flex:1;min-width:0}.up-un{font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.up-us{font-size:11px;color:var(--muted)}
.up-chk{padding:9px 11px;border-radius:9px;display:flex;align-items:center;gap:9px;margin-bottom:3px;cursor:pointer}
.up-chk:hover{background:var(--soft)}
.up-chk input{width:16px;height:16px;cursor:pointer;flex-shrink:0}
.up-chk .lbl{font-weight:800;font-size:13px}
.up-pg{border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;cursor:pointer}
.up-pg.active{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-soft)}
.up-pgt{padding:10px 12px;display:flex;align-items:center;gap:9px;background:var(--soft)}
.up-pgt input[type=checkbox]{width:16px;height:16px;cursor:pointer}
.up-pgt .nm{font-weight:900;font-size:14px;flex:1}
.up-badge{font-size:10px;padding:3px 8px;border-radius:999px;font-weight:900}
.up-badge.set{background:#dcfce7;color:#16a34a}
.up-badge.none{background:var(--surface);color:var(--muted);border:1px solid var(--border)}
.up-fc{font-size:10px;color:var(--muted);font-weight:800}
.up-sec{padding:12px;border-top:1px solid var(--border)}
.up-st{font-size:11px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.up-st .acts{display:flex;gap:6px}
.up-xs{height:26px;font-size:11px;padding:0 9px;border-radius:8px}
.up-mt{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:10px}
.up-mt button{height:28px;padding:0 12px;border:0;background:var(--surface);font-size:11px;font-weight:900;cursor:pointer;color:var(--muted)}
.up-mt button.active{background:var(--primary);color:#fff}
.up-cr{display:grid;grid-template-columns:80px 1fr 90px 1fr 28px;gap:6px;align-items:center;margin-bottom:6px}
.up-cr.first{grid-template-columns:1fr 90px 1fr 28px}
.up-cr select,.up-cr input{height:32px;border:1px solid var(--border);border-radius:7px;padding:0 7px;font-size:12px;background:var(--surface);outline:none;width:100%}
.up-cr .conj{color:#7c3aed;font-weight:900}
.up-cr .del{height:30px;width:28px;border:0;border-radius:6px;background:#fee2e2;color:#dc2626;cursor:pointer;font-weight:900}
.up-addc{height:30px;border:1px dashed var(--border);border-radius:8px;background:var(--surface);color:var(--muted);font-weight:900;font-size:12px;cursor:pointer;width:100%}
.up-sw{position:relative}
.up-sb{width:100%;min-height:64px;border:1px solid var(--border);border-radius:9px;padding:9px 11px;font-family:Consolas,monospace;font-size:12px;background:#0f172a;color:#e2e8f0;outline:none;resize:vertical}
.up-ac{position:absolute;background:var(--surface);border:1px solid var(--primary);border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:50;max-height:160px;overflow:auto;min-width:160px}
.up-ai{padding:7px 11px;font-size:12px;font-family:Consolas,monospace;cursor:pointer;font-weight:700}
.up-ai:hover,.up-ai.hl{background:var(--primary-soft);color:var(--primary-dark)}
.up-pre{font-family:Consolas,monospace;font-size:11px;color:var(--muted);margin-top:7px;background:var(--soft);padding:7px 9px;border-radius:7px}
.up-pre b{color:#7c3aed}
.up-hint{font-size:11px;color:var(--muted);margin-top:6px}
.up-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.up-chip{padding:3px 9px;border-radius:7px;font-size:11px;font-family:Consolas,monospace;font-weight:700;background:#dbeafe;color:#2563eb;cursor:pointer;border:0}
.up-chip:hover{background:#2563eb;color:#fff}
.up-val{margin-top:8px;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:800}
.up-val.ok{background:#dcfce7;color:#16a34a}
.up-val.err{background:#fee2e2;color:#dc2626}
.up-flt{border:1px solid var(--border);border-radius:11px;padding:11px;margin-bottom:9px;background:var(--soft)}
.up-flth{display:flex;align-items:center;gap:8px;margin-bottom:9px}
.up-flth .fnm{font-weight:900;font-size:13px;flex:1}
.up-fltt{font-size:10px;padding:2px 8px;border-radius:999px;font-weight:900;background:#ede9fe;color:#7c3aed}
.up-fsql{width:100%;min-height:44px;border:1px solid var(--border);border-radius:8px;padding:7px 9px;font-family:Consolas,monospace;font-size:12px;background:#0f172a;color:#e2e8f0;outline:none;resize:vertical}
.up-empty{padding:30px;text-align:center;color:var(--muted);font-size:12px}
`;

function injectCSS() {
  if (document.getElementById("up-css")) return;
  const s = document.createElement("style");
  s.id = "up-css"; s.textContent = CSS;
  document.head.appendChild(s);
}

export default function UserPermissions() {
  injectCSS();

  const [users, setUsers]     = useState([]);
  const [groups, setGroups]   = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [groupPagesMap, setGroupPagesMap] = useState({}); // {GroupID: [page objs]}
  const [pageFieldsMap, setPageFieldsMap] = useState({}); // {PageID: [names]}
  const [pageFiltersMap, setPageFiltersMap] = useState({}); // {PageID: [{PageFilterID,Label,FilterType}]}

  const [curUser, setCurUser]   = useState(null);
  const [gChecked, setGChecked] = useState({});  // {GroupID: bool}
  const [pState, setPState]     = useState({});  // {PageID: {granted,mode,builder,sql}}
  const [fSql, setFSql]         = useState({});  // {PageID_PageFilterID: sql}
  const [selPage, setSelPage]   = useState(null);
  const [val, setVal]           = useState({});  // {key: {cls,msg}}
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [showFields, setShowFields] = useState({}); // {PageID: bool}
  const [ac, setAc] = useState(null); // autocomplete {pageId, items, hl}

  useEffect(() => { init(); }, []);
  function showToast(m){ setToast(m); setTimeout(()=>setToast(""),2200); }

  async function init() {
    try { const d = await apiCall("Get Users"); setUsers(d.List0 || []); } catch { void 0; }
    try {
      const d = await apiCall("Get Groups");
      const mapped = (d.List0 || []).map(g => ({
        ...g,
        GroupName: g.GroupName === "Customer Orders" ? "Customer Order" : g.GroupName
      }));
      setGroups(mapped);
    } catch { void 0; }
    try { const d = await apiCall("Get Pages"); setAllPages(d.List0 || []); } catch { void 0; }
  }

  async function loadGroupPages(groupId) {
    if (groupPagesMap[groupId]) return;
    try {
      const d = await apiCall("Get Group Pages", { GroupID: groupId });
      setGroupPagesMap(m => ({ ...m, [groupId]: d.List0 || [] }));
    } catch { void 0; }
  }
  async function loadPageFields(page) {
    if (pageFieldsMap[page.PageID]) return;
    try {
      const d = await apiCall("Get Page Fields", { PageID: page.PageID });
      setPageFieldsMap(m => ({ ...m, [page.PageID]: (d.List0||[]).map(f=>f.FieldName) }));
    } catch { void 0; }
  }
  async function loadPageFilters(pageId) {
    if (pageFiltersMap[pageId]) return;
    try {
      const d = await apiCall("Get Page Filters", { PageID: pageId });
      setPageFiltersMap(m => ({ ...m, [pageId]: d.List0 || [] }));
    } catch { void 0; }
  }

  async function pickUser(u) {
    setCurUser(u); setSelPage(null); setVal({});
    // load assigned groups
    let assignedGroupIds = [];
    try { const d = await apiCall("Get User Groups", { UserID: u.UserID }); assignedGroupIds = (d.List0||[]).map(x=>x.GroupID); } catch { void 0; }
    const gc = {}; groups.forEach(g => gc[g.GroupID] = assignedGroupIds.includes(g.GroupID)); setGChecked(gc);
    assignedGroupIds.forEach(loadGroupPages);
    // load page conditions
    const ps = {};
    try {
      const d = await apiCall("Get User Page Conditions", { UserID: u.UserID });
      (d.List0||[]).forEach(c => {
        let builder = [];
        try { builder = c.CondBuilder ? JSON.parse(c.CondBuilder) : []; } catch { builder = []; }
        ps[c.PageID] = { granted: c.IsGranted?1:0, mode: c.CondMode || "builder", builder, sql: c.CondSql || "" };
      });
    } catch { void 0; }
    setPState(ps);
    // load filter conditions
    const fs = {};
    try {
      const d = await apiCall("Get User Filter Conditions", { UserID: u.UserID });
      (d.List0||[]).forEach(c => { fs[`${c.PageID}_${c.PageFilterID}`] = c.CondSql || ""; });
    } catch { void 0; }
    setFSql(fs);
  }

  function toggleGroup(groupId, v) {
    setGChecked(p => ({ ...p, [groupId]: v }));
    if (v) loadGroupPages(groupId);
  }

  // pages accessible from checked groups (deduped)
  function accessiblePages() {
    const seen = {}; const out = [];
    groups.forEach(g => {
      if (gChecked[g.GroupID]) {
        (groupPagesMap[g.GroupID] || []).forEach(p => {
          if (!seen[p.PageID]) { seen[p.PageID] = 1; out.push(p); }
        });
      }
    });
    return out;
  }

  function getP(pageId) { return pState[pageId] || { granted:0, mode:"builder", builder:[], sql:"" }; }
  function setP(pageId, patch) { setPState(prev => ({ ...prev, [pageId]: { ...getP(pageId), ...patch } })); }

  function selectPage(p) {
    setSelPage(p.PageID);
    loadPageFields(p);
    loadPageFilters(p.PageID);
  }

  // builder helpers
  function buildSqlText(pageId) {
    const b = getP(pageId).builder || [];
    return b.map((r,i)=>`${i>0?(r.conj||"AND")+" ":""}${r.field} ${r.op} ${r.op&&r.op.includes("NULL")?"":("'"+(r.val||"")+"'")}`).join(" ").trim();
  }
  function addRow(pageId) {
    const fields = pageFieldsMap[pageId] || [];
    const b = [...(getP(pageId).builder||[])];
    b.push({ field: fields[0]||"", op:"=", val:"", conj:"AND" });
    setP(pageId, { builder: b });
  }
  function setRow(pageId, i, key, v) {
    const b = [...(getP(pageId).builder||[])]; b[i] = { ...b[i], [key]: v }; setP(pageId, { builder: b });
  }
  function delRow(pageId, i) {
    const b = [...(getP(pageId).builder||[])]; b.splice(i,1); setP(pageId, { builder: b });
  }
  function condText(pageId) { const p=getP(pageId); return p.mode==="builder" ? buildSqlText(pageId) : (p.sql||""); }

  // validate via backend
  async function validatePage(page) {
    const cond = condText(page.PageID);
    try {
      const d = await apiCall("Validate Condition", {
        DatabaseName: page.DatabaseName, SchemaName: page.SchemaName, TableName: page.TableName, Condition: cond,
      });
      setVal(v => ({ ...v, ["page_"+page.PageID]: { cls: d.State===0?"ok":"err", msg: d.State===0 ? "✓ "+(d.Message||"Valid") : "✕ "+(d.Message||"Invalid") } }));
    } catch { setVal(v => ({ ...v, ["page_"+page.PageID]: { cls:"err", msg:"✕ Validation request failed" } })); }
  }
  async function validateFilter(page, filterId) {
    const cond = fSql[`${page.PageID}_${filterId}`] || "";
    try {
      const d = await apiCall("Validate Condition", {
        DatabaseName: page.DatabaseName, SchemaName: page.SchemaName, TableName: page.TableName, Condition: cond,
      });
      setVal(v => ({ ...v, ["filt_"+page.PageID+"_"+filterId]: { cls: d.State===0?"ok":"err", msg: d.State===0 ? "✓ "+(d.Message||"Valid") : "✕ "+(d.Message||"Invalid") } }));
    } catch { setVal(v => ({ ...v, ["filt_"+page.PageID+"_"+filterId]: { cls:"err", msg:"✕ Failed" } })); }
  }

  // autocomplete for raw sql
  function onSqlInput(pageId, e) {
    const ta = e.target; setP(pageId, { sql: ta.value });
    const pos = ta.selectionStart, before = ta.value.slice(0,pos);
    const m = before.match(/[A-Za-z@_]+$/);
    if (!m) { setAc(null); return; }
    const word = m[0].toLowerCase();
    const pool = [...(pageFieldsMap[pageId]||[]), ...VARS];
    const items = pool.filter(f => f.toLowerCase().startsWith(word) && f.toLowerCase()!==word);
    if (!items.length) { setAc(null); return; }
    setAc({ pageId, items, hl:0 });
  }
  function pickAc(pageId, idx) {
    const ta = document.getElementById("up-sql-"+pageId);
    if (!ta || !ac) return;
    const it = ac.items[idx], pos = ta.selectionStart;
    const before = ta.value.slice(0,pos).replace(/[A-Za-z@_]+$/,"");
    const after = ta.value.slice(pos);
    const next = before + it + " " + after;
    setP(pageId, { sql: next }); setAc(null);
    setTimeout(()=>{ ta.focus(); }, 0);
  }
  function onSqlKey(pageId, e) {
    if (!ac || ac.pageId!==pageId) return;
    if (e.key==="ArrowDown"){ e.preventDefault(); setAc(a=>({...a,hl:(a.hl+1)%a.items.length})); }
    else if (e.key==="ArrowUp"){ e.preventDefault(); setAc(a=>({...a,hl:(a.hl-1+a.items.length)%a.items.length})); }
    else if (e.key==="Enter"||e.key==="Tab"){ e.preventDefault(); pickAc(pageId, ac.hl); }
    else if (e.key==="Escape"){ setAc(null); }
  }
  function insertChip(pageId, f) {
    const p = getP(pageId);
    if (p.mode==="sql") setP(pageId, { sql: (p.sql||"")+f+" " });
  }

  async function save() {
    if (!curUser) return;
    setSaving(true);
    try {
      const pages = accessiblePages();
      const GroupIDs = groups.filter(g=>gChecked[g.GroupID]).map(g=>g.GroupID);
      const PageConditions = pages.map(pg => {
        const p = getP(pg.PageID);
        return {
          PageID: pg.PageID,
          IsGranted: p.granted?1:0,
          CondMode: p.mode,
          CondSql: p.mode==="builder" ? buildSqlText(pg.PageID) : (p.sql||""),
          CondBuilder: JSON.stringify(p.builder||[]),
        };
      });
      const FilterConditions = [];
      pages.forEach(pg => {
        (pageFiltersMap[pg.PageID]||[]).forEach(flt => {
          const key = `${pg.PageID}_${flt.PageFilterID}`;
          if (fSql[key]) FilterConditions.push({ PageID: pg.PageID, PageFilterID: flt.PageFilterID, CondSql: fSql[key] });
        });
      });
      const d = await apiCall("Save User Permissions", { UserID: curUser.UserID, GroupIDs, PageConditions, FilterConditions });
      if (d.State===0) showToast("Permissions saved"); else showToast(d.Message||"Error");
    } catch { showToast("Save failed"); }
    setSaving(false);
  }

  const filteredUsers = users.filter(u =>
    (u.Name||"").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.Username||"").toLowerCase().includes(userSearch.toLowerCase())
  );
  const pages = accessiblePages();
  const selPageObj = pages.find(p => p.PageID === selPage);
  const inits = s => (s||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="up-wrap">
      <div className="up-head">
        <h2>🔐 User Permissions</h2>
        <button className="dg-btn primary" disabled={!curUser||saving} onClick={save}>{saving?"Saving…":"Save"}</button>
      </div>

      <div className="up-body">
        <div className="up-four">

          {/* Users */}
          <div className="up-col">
            <div className="up-ch"><div className="t">👤 Users</div><span className="cnt">{users.length}</span></div>
            <input className="up-search" placeholder="Search..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} />
            <div className="up-cb">
              {filteredUsers.map(u => (
                <div key={u.UserID} className={`up-u ${curUser?.UserID===u.UserID?"active":""}`} onClick={()=>pickUser(u)}>
                  <span className="up-av">{inits(u.Name||u.Username)}</span>
                  <div className="up-um"><div className="up-un">{u.Name||u.Username}</div><div className="up-us">@{u.Username}</div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div className="up-col">
            <div className="up-ch"><div className="t">👥 Groups</div><span className="cnt">{Object.values(gChecked).filter(Boolean).length}/{groups.length}</span></div>
            <div className="up-cb">
              {!curUser && <div className="up-empty">Select a user</div>}
              {curUser && groups.map(g => (
                <label key={g.GroupID} className="up-chk">
                  <input type="checkbox" checked={!!gChecked[g.GroupID]} onChange={e=>toggleGroup(g.GroupID, e.target.checked)} />
                  <span className="lbl">{g.GroupName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div className="up-col">
            <div className="up-ch"><div className="t">📄 Pages & Condition</div><span className="cnt">{pages.length}</span></div>
            <div className="up-cb">
              {!curUser && <div className="up-empty">Select a user</div>}
              {curUser && pages.length===0 && <div className="up-empty">Check groups to see pages</div>}
              {pages.map(pg => {
                const p = getP(pg.PageID);
                const has = p.mode==="builder" ? (p.builder||[]).length>0 : (p.sql||"").trim().length>0;
                const nf = (pageFiltersMap[pg.PageID]||[]).length;
                const fields = pageFieldsMap[pg.PageID] || [];
                return (
                  <div key={pg.PageID} className={`up-pg ${selPage===pg.PageID?"active":""}`} onClick={()=>selectPage(pg)}>
                    <div className="up-pgt" onClick={e=>{}}>
                      <input type="checkbox" checked={!!p.granted} onClick={e=>e.stopPropagation()} onChange={e=>setP(pg.PageID,{granted:e.target.checked?1:0})} />
                      <span className="nm">{pg.PageName}</span>
                      <span className={`up-badge ${has?"set":"none"}`}>{has?"condition":"all rows"}</span>
                      {nf>0 && <span className="up-fc">🔍 {nf}</span>}
                    </div>
                    <div className="up-sec" onClick={e=>e.stopPropagation()}>
                      <div className="up-st">
                        <span>Data Condition</span>
                        <span className="acts">
                          <button className="dg-btn up-xs" onClick={()=>setShowFields(s=>({...s,[pg.PageID]:!s[pg.PageID]}))}>{`{ } Fields`}</button>
                          <button className="dg-btn green up-xs" onClick={()=>validatePage(pg)}>✓ Validate</button>
                        </span>
                      </div>
                      <div className="up-mt">
                        <button className={p.mode==="builder"?"active":""} onClick={()=>setP(pg.PageID,{mode:"builder"})}>Builder</button>
                        <button className={p.mode==="sql"?"active":""} onClick={()=>setP(pg.PageID,{mode:"sql"})}>Raw SQL</button>
                      </div>

                      {p.mode==="builder" ? (
                        <>
                          {(p.builder||[]).map((r,i)=>(
                            <div key={i} className={`up-cr ${i===0?"first":""}`}>
                              {i>0 && (
                                <select className="conj" value={r.conj||"AND"} onChange={e=>setRow(pg.PageID,i,"conj",e.target.value)}>
                                  <option>AND</option><option>OR</option>
                                </select>
                              )}
                              <select value={r.field} onChange={e=>setRow(pg.PageID,i,"field",e.target.value)}>
                                {fields.map(f=><option key={f} value={f}>{f}</option>)}
                              </select>
                              <select value={r.op} onChange={e=>setRow(pg.PageID,i,"op",e.target.value)}>
                                {OPS.map(o=><option key={o} value={o}>{o}</option>)}
                              </select>
                              {r.op && r.op.includes("NULL")
                                ? <span style={{color:"var(--muted)",fontSize:11}}>—</span>
                                : <input value={r.val||""} placeholder="value / @UserID" onChange={e=>setRow(pg.PageID,i,"val",e.target.value)} />}
                              <button className="del" onClick={()=>delRow(pg.PageID,i)}>✕</button>
                            </div>
                          ))}
                          <button className="up-addc" onClick={()=>addRow(pg.PageID)}>+ Add condition</button>
                          <div className="up-pre"><b>WHERE</b> {buildSqlText(pg.PageID)||"(none)"}</div>
                        </>
                      ) : (
                        <div className="up-sw">
                          <textarea id={"up-sql-"+pg.PageID} className="up-sb" value={p.sql||""}
                            placeholder="e.g. SalesID = @UserID AND Status <> 'Closed'"
                            onChange={e=>onSqlInput(pg.PageID,e)} onKeyDown={e=>onSqlKey(pg.PageID,e)} onBlur={()=>setTimeout(()=>setAc(null),150)} />
                          {ac && ac.pageId===pg.PageID && (
                            <div className="up-ac" style={{left:10,top:44}}>
                              {ac.items.map((it,i)=>(
                                <div key={it} className={`up-ai ${i===ac.hl?"hl":""}`} onMouseDown={()=>pickAc(pg.PageID,i)}>{it}</div>
                              ))}
                            </div>
                          )}
                          <div className="up-hint">Type to autocomplete. Vars: <b>@UserID</b>, <b>@Username</b></div>
                        </div>
                      )}

                      {showFields[pg.PageID] && (
                        <div className="up-chips">
                          {fields.map(f=><button key={f} className="up-chip" onClick={()=>insertChip(pg.PageID,f)}>{f}</button>)}
                          {VARS.map(v=><button key={v} className="up-chip" style={{background:"#ede9fe",color:"#7c3aed"}} onClick={()=>insertChip(pg.PageID,v)}>{v}</button>)}
                        </div>
                      )}

                      {val["page_"+pg.PageID] && <div className={`up-val ${val["page_"+pg.PageID].cls}`}>{val["page_"+pg.PageID].msg}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="up-col">
            <div className="up-ch"><div className="t">🔍 Page Filters</div><span className="cnt">{selPageObj ? (pageFiltersMap[selPage]||[]).length : ""}</span></div>
            <div className="up-cb">
              {!selPageObj && <div className="up-empty">Select a page to see its filters</div>}
              {selPageObj && (pageFiltersMap[selPage]||[]).length===0 && <div className="up-empty">No filters on {selPageObj.PageName}</div>}
              {selPageObj && (pageFiltersMap[selPage]||[]).length>0 && (
                <>
                  <div style={{fontSize:12,fontWeight:900,color:"var(--muted)",padding:"4px 6px 10px"}}>Filters on: {selPageObj.PageName}</div>
                  {(pageFiltersMap[selPage]||[]).map(flt => {
                    const key = `${selPage}_${flt.PageFilterID}`;
                    return (
                      <div key={flt.PageFilterID} className="up-flt">
                        <div className="up-flth">
                          <span className="fnm">🔍 {flt.Label || flt.FilterName}</span>
                          <span className="up-fltt">{flt.FilterType}</span>
                          <button className="dg-btn green up-xs" onClick={()=>validateFilter(selPageObj, flt.PageFilterID)}>✓ Validate</button>
                        </div>
                        <textarea className="up-fsql" value={fSql[key]||""} placeholder="Optional condition, e.g. Region = @UserID"
                          onChange={e=>setFSql(s=>({...s,[key]:e.target.value}))} />
                        {val["filt_"+selPage+"_"+flt.PageFilterID] && <div className={`up-val ${val["filt_"+selPage+"_"+flt.PageFilterID].cls}`}>{val["filt_"+selPage+"_"+flt.PageFilterID].msg}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {toast && <div className="dg-toast show">{toast}</div>}
    </div>
  );
}
