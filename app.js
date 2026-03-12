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

document.addEventListener("DOMContentLoaded", ()=>{
  initHS();
  initMissing();
});
