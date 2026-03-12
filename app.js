/* LOGIN + SECURITY */

const LOGIN_USER = "admin";
const LOGIN_PASS_DEFAULT = "tools123";
const RESET_PIN = "4256";

function savedPass(){
  return localStorage.getItem("shipment_tools_password") || LOGIN_PASS_DEFAULT;
}

function savePass(v){
  localStorage.setItem("shipment_tools_password", v);
}

function doLogin(){
  const u = document.getElementById("username")?.value?.trim();
  const p = document.getElementById("password")?.value || "";
  const r = document.getElementById("remember");

  if(u === LOGIN_USER && p === savedPass()){
    if(r?.checked) localStorage.setItem("shipment_tools_saved_user", LOGIN_USER);
    else localStorage.removeItem("shipment_tools_saved_user");

    localStorage.setItem("shipment_tools_logged_in", "yes");
    window.location.href = "dashboard.html";
  } else {
    alert("Wrong Username or Password");
  }
}

function bootstrapLogin(){
  const s = localStorage.getItem("shipment_tools_saved_user");
  if(s && document.getElementById("username")){
    document.getElementById("username").value = s;
    const r = document.getElementById("remember");
    if(r) r.checked = true;
  }
}

function logoutNow(){
  localStorage.removeItem("shipment_tools_logged_in");
  window.location.href = "index.html";
  return false;
}

function protectPage(){
  const isLoginPage = location.pathname.endsWith("index.html") || location.pathname === "/" || location.pathname.endsWith("/");
  if(!isLoginPage && localStorage.getItem("shipment_tools_logged_in") !== "yes"){
    window.location.href = "index.html";
  }
}

function openForgot(){
  document.getElementById("forgotModal")?.classList.add("open");
}

function closeForgot(){
  document.getElementById("forgotModal")?.classList.remove("open");
  document.getElementById("resetStep2")?.classList.add("hidden");
  const p = document.getElementById("pinInput");
  if(p) p.value = "";
  const n = document.getElementById("newPasswordInput");
  if(n) n.value = "";
}

function verifyPin(){
  (document.getElementById("pinInput")?.value || "").trim() === RESET_PIN
    ? document.getElementById("resetStep2")?.classList.remove("hidden")
    : alert("Wrong PIN");
}

function saveNewPassword(){
  const n = document.getElementById("newPasswordInput")?.value || "";
  if(!n) return alert("Enter new password");
  savePass(n);
  alert("Password changed successfully");
  closeForgot();
}

/* DATABASE */

const DEFAULT_DB = [
  {company:"diamond traders",ntn:"4967890"},
  {company:"vision exporters",ntn:"3746594"},
  {company:"pearl embroidery",ntn:"7812459"},
  {company:"classic sports",ntn:"4567812"}
];

function getDB(){
  const r = localStorage.getItem("shipment_tools_ntn_db");
  if(r){
    try { return JSON.parse(r); } catch(e) {}
  }
  localStorage.setItem("shipment_tools_ntn_db", JSON.stringify(DEFAULT_DB));
  return DEFAULT_DB.slice();
}

function saveDB(d){
  localStorage.setItem("shipment_tools_ntn_db", JSON.stringify(d));
}

/* HELPERS */

function titleCase(s){
  return String(s || "").replace(/\b\w/g, c => c.toUpperCase());
}

function normalize(s){
  return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function digitsOnly(s){
  return String(s ?? "").replace(/\D/g, "");
}

function firstExisting(r, names){
  if(!r) return "";
  for(const name of names){
    if(r[name] !== undefined && r[name] !== null && String(r[name]).trim() !== "") return r[name];
  }
  const keys = Object.keys(r);
  for(const name of names){
    const wanted = String(name).trim().toLowerCase();
    const match = keys.find(k => String(k).trim().toLowerCase() === wanted);
    if(match !== undefined && r[match] !== undefined && r[match] !== null && String(r[match]).trim() !== "") return r[match];
  }
  return "";
}

function numVal(v){
  const n = parseFloat(String(v ?? "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function setText(id, v){
  const e = document.getElementById(id);
  if(e) e.textContent = v;
}

function escapeHtml(v){
  return String(v ?? "").replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
}

function renderTable(id, h){
  const e = document.getElementById(id);
  if(e) e.innerHTML = h;
}

function setFileName(inputId, labelId){
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if(input && label){
    input.addEventListener("change", ()=>{
      label.textContent = input.files?.[0] ? input.files[0].name : "No file selected";
    });
  }
}

function downloadRows(rows, filename, sheetName){
  if(typeof XLSX === "undefined") return alert("Excel library not loaded");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

function parseExcel(file, cb){
  const r = new FileReader();
  r.onload = e => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, {type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    cb(XLSX.utils.sheet_to_json(ws, {defval:""}));
  };
  r.readAsArrayBuffer(file);
}

function hasDescription(row){
  const desc = String(firstExisting(row, [
    "CE Commodity Description",
    "Commodity Description",
    "Description"
  ])).trim();
  return desc !== "";
}

function cleanCompany(name){
  return normalize(name)
    .replace(/(pvt|ltd|private|limited|co|company|intl|international)/g, "")
    .replace(/[().,&/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCompanyFieldName(row){
  const candidates = ["Shipper Company","Shipper Name","Company"];
  for(const key of candidates){
    if(Object.prototype.hasOwnProperty.call(row, key)) return key;
  }
  const keys = Object.keys(row || {});
  for(const key of candidates){
    const wanted = key.toLowerCase();
    const match = keys.find(k => String(k).trim().toLowerCase() === wanted);
    if(match) return match;
  }
  return candidates[0];
}

function appendNTNToCompanyName(name, ntn){
  const raw = String(name || "").trim();
  const val = String(ntn || "").trim();
  if(!raw || !val) return raw;
  if(/NTN\s*[:\-]?\s*[A-Z]?\d+/i.test(raw)) return raw;
  if(raw.includes(val)) return raw;
  return raw + ' ' + val;
}

function companyHasNumericNTN(company){
  const c = String(company || "");
  return /\d{4,}/.test(c) || /NTN\s*[:\-]?\s*[A-Z]?\d+/i.test(c) || /\([A-Z]?\d{4,}[A-Z0-9-]*\)/i.test(c) || /\d{4,}-\d+[A-Z]*/i.test(c);
}

function isEForm(company){
  return /[-\s]*E\s*FORM(?:\s*B)?$/i.test(String(company || ""));
}

function findCompanyNTN(company){
  const clean = cleanCompany(company);
  const db = getDB();
  return db.find(x => {
    const dbName = cleanCompany(x.company);
    return dbName.includes(clean) || clean.includes(dbName);
  });
}

/* HS CODE TOOL */
let hsRows = [];
function initHS(){
  setFileName("hsFile","hsFileName");
  const p = document.getElementById("hsProcessBtn");
  if(p){
    p.onclick = ()=>{
      const file = document.getElementById("hsFile")?.files?.[0];
      const country = (document.getElementById("hsCountry")?.value || "").trim().toUpperCase();
      if(!file) return alert("Upload Excel file first");
      if(!country) return alert("Enter country code");
      parseExcel(file, rows => {
        hsRows = rows
          .filter(r => String(firstExisting(r,["Recip Cntry","Country","Country Code"])).trim().toUpperCase() === country)
          .filter(hasDescription)
          .map(r => {
            const hs = digitsOnly(firstExisting(r,["Commodity Harmonized Code","HS Code","Harmonized Code"]));
            return {
              ...r,
              "Commodity Harmonized Code": hs,
              __bad: hs.length < 10,
              "HS Code Status": hs.length < 10 ? `HS Code ${hs.length} digits` : "Valid"
            };
          })
          .sort((a,b)=>Number(b.__bad)-Number(a.__bad));

        renderTable("hsBody", hsRows.slice(0,20).map(r=>`
          <tr class="${r.__bad?"row-alert":""}">
            <td>${escapeHtml(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]))}</td>
            <td>${escapeHtml(firstExisting(r,["Recip Cntry","Country","Country Code"]))}</td>
            <td>${escapeHtml(r["Commodity Harmonized Code"])}</td>
            <td class="${r.__bad?"status-warn":"status-valid"}">${escapeHtml(r["HS Code Status"])}</td>
          </tr>
        `).join("") || '<tr><td colspan="4">No rows matched</td></tr>');

        setText("hsTotal", hsRows.length);
        setText("hsInvalid", hsRows.filter(x=>x.__bad).length);
      });
    };
  }

  const exportBtn = document.getElementById("hsExportBtn");
  if(exportBtn){
    exportBtn.onclick = ()=>{
      hsRows.length
        ? downloadRows(hsRows.map(({__bad,...x})=>x), "HS_Code_Result.xlsx", "HS Code Verification")
        : alert("No data to export");
    };
  }
}

/* NTN MISSING TOOL */
let missingRows = [];
function initMissing(){
  setFileName("missingFile","missingFileName");
  const p = document.getElementById("missingProcessBtn");
  if(p){
    p.onclick = ()=>{
      const file = document.getElementById("missingFile")?.files?.[0];
      if(!file) return alert("Upload Excel file first");
      parseExcel(file, rows => {
        missingRows = rows.filter(r => {
          const ntn = normalize(firstExisting(r,["NTN","NTN Number","Company NTN"]));
          const company = String(firstExisting(r,["Shipper Company","Shipper Name","Company"])).trim();
          const value = numVal(firstExisting(r,["Value","Declared Value","Customs Value"]));
          if(!hasDescription(r)) return false;
          if(ntn) return false;
          if(companyHasNumericNTN(company)) return false;
          if(isEForm(company)) return false;
          if(/\s*-A$/i.test(company)) return false;
          if(value >= 500) return false;
          return true;
        }).map(r => ({...r, NTN:"MISSING"}));

        renderTable("missingBody", missingRows.slice(0,20).map(r=>`
          <tr>
            <td>${escapeHtml(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]))}</td>
            <td>${escapeHtml(firstExisting(r,["Shipper Company","Shipper Name","Company"]))}</td>
            <td class="status-missing">MISSING</td>
            <td>${escapeHtml(firstExisting(r,["CE Commodity Description","Commodity Description","Description"]))}</td>
          </tr>
        `).join("") || '<tr><td colspan="4">No rows matched</td></tr>');

        setText("missingTotal", missingRows.length);
      });
    };
  }

  const exportBtn = document.getElementById("missingExportBtn");
  if(exportBtn){
    exportBtn.onclick = ()=>{
      missingRows.length
        ? downloadRows(missingRows, "NTN_Missing_Result.xlsx", "NTN Missing")
        : alert("No result to export");
    };
  }
}

/* BUCKET SHOP TOOL */
let bucketRows = [];
function initBucket(){
  setFileName("bucketFile","bucketFileName");
  const p = document.getElementById("bucketProcessBtn");
  if(p){
    p.onclick = ()=>{
      const file = document.getElementById("bucketFile")?.files?.[0];
      if(!file) return alert("Upload Excel file first");
      parseExcel(file, rows => {
        bucketRows = rows.filter(r => {
          const company = String(firstExisting(r,["Shipper Company","Shipper Name","Company"])).trim();
          const city = String(firstExisting(r,["Shpr City","City","Shipper City","Address","Shpr Addl Addr"])).toUpperCase();
          const ref = String(firstExisting(r,["Shipper Ref","Reference Number","Reference"])).trim();
          const value = numVal(firstExisting(r,["Value","Declared Value","Customs Value"]));
          if(!hasDescription(r)) return false;
          if(companyHasNumericNTN(company)) return false;
          if(isEForm(company)) return false;
          if(/\s*-C$/i.test(company)) return false;
          if(/^(990|999)/.test(ref)) return false;
          if(value >= 500) return false;
          if(!(city.includes("SIALKOT") || city.includes("SKT") || city.includes("SKTA"))) return false;
          return true;
        });

        renderTable("bucketBody", bucketRows.slice(0,20).map(r=>`
          <tr>
            <td>${escapeHtml(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]))}</td>
            <td>${escapeHtml(firstExisting(r,["Shipper Company","Shipper Name","Company"]))}</td>
            <td>${escapeHtml(firstExisting(r,["CE Commodity Description","Commodity Description","Description"]))}</td>
            <td>${escapeHtml(firstExisting(r,["Shpr City","City","Shipper City","Address","Shpr Addl Addr"]))}</td>
          </tr>
        `).join("") || '<tr><td colspan="4">No rows matched</td></tr>');

        setText("bucketTotal", bucketRows.length);
      });
    };
  }

  const exportBtn = document.getElementById("bucketExportBtn");
  if(exportBtn){
    exportBtn.onclick = ()=>{
      bucketRows.length
        ? downloadRows(bucketRows, "Bucket_Shop_Result.xlsx", "Bucket Shop")
        : alert("No result to export");
    };
  }
}

/* DUPLICATE TOOL */
let dupRows = [];
function initDuplicate(){
  setFileName("dupFile","dupFileName");
  const p = document.getElementById("dupProcessBtn");
  if(p){
    p.onclick = ()=>{
      const file = document.getElementById("dupFile")?.files?.[0];
      if(!file) return alert("Upload Excel file first");
      parseExcel(file, rows => {
        const validRows = rows.filter(hasDescription);
        const count = {};
        validRows.forEach(r => {
          const t = normalize(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]));
          if(t) count[t] = (count[t] || 0) + 1;
        });
        dupRows = validRows.map(r => {
          const t = normalize(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]));
          return {...r,__dup:!!(t && count[t] > 1)};
        }).sort((a,b)=>Number(b.__dup)-Number(a.__dup));

        renderTable("dupBody", dupRows.slice(0,20).map(r=>`
          <tr class="${r.__dup?"row-alert":""}">
            <td>${escapeHtml(firstExisting(r,["Tracking Number","Shipment Number","Invoice No"]))}</td>
            <td>${escapeHtml(firstExisting(r,["Shipper Company","Shipper Name","Company"]))}</td>
            <td class="${r.__dup?"status-missing":"status-valid"}">${r.__dup?"DUPLICATE":"UNIQUE"}</td>
          </tr>
        `).join("") || '<tr><td colspan="3">No rows found</td></tr>');

        setText("dupTotal", dupRows.length);
        setText("dupCount", dupRows.filter(x=>x.__dup).length);
      });
    };
  }

  const exportBtn = document.getElementById("dupExportBtn");
  if(exportBtn){
    exportBtn.onclick = ()=>{
      dupRows.length
        ? downloadRows(dupRows.filter(x=>x.__dup).map(({__dup,...r})=>r), "Duplicate_Shipments.xlsx", "Duplicate")
        : alert("No result to export");
    };
  }
}

/* SEARCH TOOL */
function initSearch(){
  const btn = document.getElementById("searchBtn");
  if(btn){
    btn.onclick = ()=>{
      const q = normalize(document.getElementById("companySearch")?.value || "");
      const found = getDB().filter(x=>x.company.includes(q));
      setText("ntnSearchInfo", `Showing ${found.length} result${found.length===1?"":"s"} for "${q}":`);
      renderTable("ntnSearchBody", found.length
        ? found.map(r=>`<tr><td>${escapeHtml(titleCase(r.company))}</td><td>${escapeHtml(r.ntn)}</td></tr>`).join("")
        : '<tr><td colspan="2">No result found</td></tr>'
      );
    };
  }

  const addBtn = document.getElementById("addNtnBtn");
  if(addBtn){
    addBtn.onclick = ()=>{
      const c = normalize(document.getElementById("newCompany")?.value || "");
      const n = String(document.getElementById("newNtn")?.value || "").trim();
      if(!c || !n) return alert("Enter company and NTN");
      const db = getDB();
      db.push({company:c,ntn:n});
      saveDB(db);
      alert("Company and NTN saved");
      document.getElementById("newCompany").value="";
      document.getElementById("newNtn").value="";
    };
  }
}

let companyEditIndex = -1;

function scoreMatch(company, query){
  if(!query) return 0;
  const name = normalize(company);
  if(name === query) return 1000;
  if(name.startsWith(query)) return 700;
  if(name.includes(query)) return 400;
  return 0;
}

function renderSearchResults(list, query){
  const body = document.getElementById("ntnSearchBody");
  const info = document.getElementById("ntnSearchInfo");
  if(!body || !info) return;
  if(!query){
    info.textContent = "Start typing to see matching companies...";
    body.innerHTML = '<tr><td colspan="2">No results yet</td></tr>';
    return;
  }
  info.textContent = `Showing ${list.length} result${list.length===1?"":"s"} for "${query}":`;
  body.innerHTML = list.length
    ? list.map(r=>`<tr><td>${escapeHtml(titleCase(r.company))}</td><td>${escapeHtml(r.ntn)}</td></tr>`).join("")
    : '<tr><td colspan="2">No result found</td></tr>';
}

function runLiveCompanySearch(){
  const input = document.getElementById("companySearch");
  if(!input) return;
  const q = normalize(input.value);
  const db = getDB();
  if(!q){
    renderSearchResults([], "");
    return;
  }
  const found = db
    .map(item=>({...item,_score:scoreMatch(item.company,q)}))
    .filter(item=>item._score>0)
    .sort((a,b)=>b._score-a._score || a.company.localeCompare(b.company));
  renderSearchResults(found,q);
}

function renderManageCompanies(filterText=""){
  const body = document.getElementById("companyTable");
  if(!body) return;
  const db = getDB();
  const q = normalize(filterText);
  const filtered = db.filter(item=>!q || item.company.includes(q));
  body.innerHTML = filtered.length
    ? filtered.map(item=>{
        const realIndex = db.findIndex(x=>x.company===item.company && x.ntn===item.ntn);
        return `<tr><td><input type="checkbox" class="company-select" data-index="${realIndex}"></td><td>${escapeHtml(titleCase(item.company))}</td><td>${escapeHtml(item.ntn)}</td><td><button type="button" class="edit-btn" onclick="editCompany(${realIndex})">Edit</button></td></tr>`;
      }).join("")
    : '<tr><td colspan="4">No companies found</td></tr>';
}

function openManage(){
  const m = document.getElementById("manageModal");
  if(m) m.style.display = "flex";
  const s = document.getElementById("companySearchManage");
  if(s) s.value = "";
  const a = document.getElementById("selectAllCompanies");
  if(a) a.checked = false;
  renderManageCompanies("");
}

function closeManage(){
  const m = document.getElementById("manageModal");
  if(m) m.style.display = "none";
}

function openAddNew(){
  companyEditIndex = -1;
  const title = document.getElementById("addEditTitle");
  if(title) title.textContent = "Add New Company + NTN";
  document.getElementById("companyNameInput").value = "";
  document.getElementById("companyNTNInput").value = "";
  document.getElementById("addEditModal").style.display = "flex";
}

function closeAddNew(){
  const m = document.getElementById("addEditModal");
  if(m) m.style.display = "none";
}

function editCompany(index){
  const db = getDB();
  const item = db[index];
  if(!item) return;
  companyEditIndex = index;
  document.getElementById("addEditTitle").textContent = "Edit Company + NTN";
  document.getElementById("companyNameInput").value = titleCase(item.company);
  document.getElementById("companyNTNInput").value = item.ntn;
  document.getElementById("addEditModal").style.display = "flex";
}

function saveCompanyFromModal(){
  const db = getDB();
  const company = normalize(document.getElementById("companyNameInput")?.value || "");
  const ntn = String(document.getElementById("companyNTNInput")?.value || "").trim();
  if(!company || !ntn) return alert("Enter company and NTN");
  if(companyEditIndex === -1) db.push({company,ntn});
  else db[companyEditIndex] = {company,ntn};
  saveDB(db);
  closeAddNew();
  renderManageCompanies(document.getElementById("companySearchManage")?.value || "");
  runLiveCompanySearch();
}

function deleteSelectedCompanies(){
  const checks = Array.from(document.querySelectorAll(".company-select:checked"));
  if(!checks.length) return alert("No company selected");
  const db = getDB();
  const indexes = checks.map(c=>Number(c.dataset.index)).sort((a,b)=>b-a);
  indexes.forEach(i=>{ if(i>=0) db.splice(i,1); });
  saveDB(db);
  renderManageCompanies(document.getElementById("companySearchManage")?.value || "");
  runLiveCompanySearch();
}

function importCompaniesFromExcel(file){
  parseExcel(file, rows => {
    const db = getDB();
    let added = 0;
    rows.forEach(r=>{
      const companyRaw = firstExisting(r,["Company Name","Company","company","Name"]);
      const ntnRaw = firstExisting(r,["NTN","NTN Number","NTN No","ntn"]);
      const company = normalize(companyRaw);
      const ntn = String(ntnRaw || "").trim();
      if(!company || !ntn) return;
      const exists = db.find(x=>x.company===company);
      if(!exists){
        db.push({company,ntn});
        added++;
      }
    });
    saveDB(db);
    alert(added + " companies imported successfully");
    runLiveCompanySearch();
    renderManageCompanies(document.getElementById("companySearchManage")?.value || "");
  });
}

function initSearchEnhanced(){
  const input = document.getElementById("companySearch");
  const searchBtn = document.getElementById("searchBtn");
  const saveModalBtn = document.getElementById("saveCompanyBtn");
  const excelUpload = document.getElementById("excelUpload");
  const manageSearch = document.getElementById("companySearchManage");
  const selectAll = document.getElementById("selectAllCompanies");

  if(input) input.addEventListener("input", runLiveCompanySearch);
  if(searchBtn) searchBtn.onclick = runLiveCompanySearch;
  if(saveModalBtn) saveModalBtn.onclick = saveCompanyFromModal;
  if(excelUpload) excelUpload.addEventListener("change",()=>{
    const file = excelUpload.files?.[0];
    if(file) importCompaniesFromExcel(file);
  });
  if(manageSearch) manageSearch.addEventListener("input", function(){
    renderManageCompanies(this.value);
  });
  if(selectAll) selectAll.addEventListener("change", function(){
    document.querySelectorAll(".company-select").forEach(cb=>cb.checked=this.checked);
  });
  renderSearchResults([], "");
}

/* AUTO NTN UPDATE */
let autoRows = [];
function initAutoUpdate(){
  setFileName("autoFile","autoFileName");
  const p = document.getElementById("autoProcessBtn");
  if(p){
    p.onclick = ()=>{
      const file = document.getElementById("autoFile")?.files?.[0];
      if(!file) return alert("Upload Excel file first");
      parseExcel(file, rows => {
        const db = getDB();
        const sheetNTNMap = {};

        rows.forEach(r=>{
          if(!hasDescription(r)) return;
          const companyRaw = firstExisting(r,["Shipper Company","Shipper Name","Company"]);
          const companyKey = cleanCompany(companyRaw);
          const existingNTN = String(firstExisting(r,["NTN","NTN Number","Company NTN"])).trim();
          if(companyKey && existingNTN){
            sheetNTNMap[companyKey] = existingNTN;
            const exists = db.find(x=>cleanCompany(x.company)===companyKey);
            if(!exists) db.push({company:normalize(companyRaw), ntn:existingNTN});
          }
        });
        saveDB(db);

        autoRows = rows.map(r=>{
          if(!hasDescription(r)) return null;
          const companyField = findCompanyFieldName(r);
          const companyRaw = firstExisting(r,["Shipper Company","Shipper Name","Company"]);
          const companyKey = cleanCompany(companyRaw);
          let ntn = String(firstExisting(r,["NTN","NTN Number","Company NTN"])).trim();

          if(!ntn && sheetNTNMap[companyKey]) ntn = sheetNTNMap[companyKey];
          if(!ntn){
            const found = findCompanyNTN(companyRaw);
            if(found) ntn = found.ntn;
          }

          const updated = {...r, NTN:ntn, __missing:!ntn};
          if(ntn){
            updated[companyField] = appendNTNToCompanyName(companyRaw, ntn);
          }
          return updated;
        }).filter(Boolean).sort((a,b)=>Number(b.__missing)-Number(a.__missing));

        renderTable("autoBody", autoRows.slice(0,20).map(r=>`
          <tr class="${r.__missing?"row-alert":""}">
            <td>${escapeHtml(firstExisting(r,["Shipper Company","Shipper Name","Company"]))}</td>
            <td>${escapeHtml(r.NTN)}</td>
            <td class="${r.__missing?"status-missing":"status-valid"}">${r.__missing?"MISSING":"FILLED"}</td>
          </tr>
        `).join("") || '<tr><td colspan="3">No rows found</td></tr>');

        setText("autoTotal", autoRows.length);
        setText("autoMissing", autoRows.filter(x=>x.__missing).length);
      });
    };
  }

  const exportBtn = document.getElementById("autoExportBtn");
  if(exportBtn){
    exportBtn.onclick = ()=>{
      autoRows.length
        ? downloadRows(autoRows.map(({__missing,...r})=>r), "Auto_NTN_Updated.xlsx", "Auto NTN Update")
        : alert("No result to export");
    };
  }
}

/* INIT ALL TOOLS */
document.addEventListener("DOMContentLoaded", ()=>{
  protectPage();
  bootstrapLogin();
  if(typeof initHS === "function") initHS();
  if(typeof initMissing === "function") initMissing();
  if(typeof initBucket === "function") initBucket();
  if(typeof initDuplicate === "function") initDuplicate();
  if(typeof initSearch === "function") initSearch();
  if(typeof initSearchEnhanced === "function") initSearchEnhanced();
  if(typeof initAutoUpdate === "function") initAutoUpdate();
});
