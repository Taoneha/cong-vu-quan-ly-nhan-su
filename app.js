const LS_EMP = "cv_employees_v1";
const LS_USERS = "cv_users_v1";
const LS_OT = "cv_overtime_v1";
const LS_CURRENT = "cv_current_user_v1";
const LS_REMEMBER = "cv_remember_v1";
const LS_EQUIPMENTS = "cv_equipments_v1";
const LS_MATERIALS = "cv_materials_v1";
const LS_REPAIRS = "cv_repairs_v1";

const defaultAvatar =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90">
  <rect width="100%" height="100%" fill="#dbeafe"/>
  <circle cx="45" cy="32" r="18" fill="#2563eb"/>
  <path d="M18 82c5-24 49-24 54 0" fill="#2563eb"/>
</svg>`);

const penguinImage =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
  <rect width="240" height="180" rx="18" fill="#e0f2fe"/>
  <ellipse cx="120" cy="95" rx="58" ry="70" fill="#111827"/>
  <ellipse cx="120" cy="105" rx="42" ry="52" fill="#f8fafc"/>
  <circle cx="100" cy="60" r="8" fill="#fff"/>
  <circle cx="140" cy="60" r="8" fill="#fff"/>
  <circle cx="100" cy="60" r="4" fill="#111827"/>
  <circle cx="140" cy="60" r="4" fill="#111827"/>
  <path d="M110 75 L130 75 L120 90 Z" fill="#f97316"/>
  <ellipse cx="70" cy="105" rx="18" ry="38" fill="#111827" transform="rotate(-25 70 105)"/>
  <ellipse cx="170" cy="105" rx="18" ry="38" fill="#111827" transform="rotate(25 170 105)"/>
  <ellipse cx="100" cy="160" rx="24" ry="8" fill="#f97316"/>
  <ellipse cx="140" cy="160" rx="24" ry="8" fill="#f97316"/>
  <text x="120" y="25" text-anchor="middle" font-size="16" font-weight="800" fill="#2563eb">EQUIPMENT</text>
</svg>`);

/* BASIC STORAGE */
function getEmployees(){return JSON.parse(localStorage.getItem(LS_EMP)||"[]")}
function setEmployees(d){localStorage.setItem(LS_EMP,JSON.stringify(d))}
function getUsers(){return JSON.parse(localStorage.getItem(LS_USERS)||"{}")}
function setUsers(d){localStorage.setItem(LS_USERS,JSON.stringify(d))}
function getOT(){return JSON.parse(localStorage.getItem(LS_OT)||'{"restDays":[6,13,20,27],"selectedRestDays":[],"data":{},"planned":{}}')}
function setOT(d){localStorage.setItem(LS_OT,JSON.stringify(d))}

// Lưu riêng dữ liệu tăng ca theo từng tháng để có thể xem lại tháng trước.
const LS_OT_MONTHS = "cv_overtime_months_v1";
const DEFAULT_OT = {restDays:[6,13,20,27],selectedRestDays:[],data:{},planned:{}};
function getOTMonths(){return JSON.parse(localStorage.getItem(LS_OT_MONTHS)||"{}")}
function setOTMonths(d){localStorage.setItem(LS_OT_MONTHS,JSON.stringify(d))}
function monthKeyFromDate(value){
  const d=String(value||"").split("-");
  return d.length>=2 ? `${d[0]}-${d[1]}` : "2026-09";
}
function firstDayOfMonth(key){return `${key}-01`;}
function changeOTDate(value){
  if(!value) return;
  const key=monthKeyFromDate(value);
  if(key!==getActiveOTMonth()){
    switchOTMonth(key);
  }
  const input=document.getElementById("otDate");
  if(input) input.value=value;
  drawOT(getEmployees());
}

function syncOTDateToday(){
  const input=document.getElementById("otDate");
  if(!input) return;

  // Đồng bộ đúng ngày người dùng đang chọn; nếu chưa có thì dùng ngày hiện tại.
  const date=input.value || getTodayDateKey();
  const key=monthKeyFromDate(date);

  // Lưu tháng hiện tại trước khi chuyển tháng để không mất DKTC.
  if(key!==getActiveOTMonth()){
    saveActiveOTMonth(getActiveOTMonth());
    loadOTMonth(key);
  }

  input.value=date;

  const ot=getOT();
  const day=Number(date.split("-")[2]);
  const plannedDay=(ot.planned && ot.planned[date]) ? ot.planned[date] : {};
  let converted=0;

  if(!ot.data) ot.data={};

  Object.keys(plannedDay).forEach(card=>{
    const plannedValue=plannedDay[card];
    if(plannedValue==="" || plannedValue===null || plannedValue===undefined) return;

    if(!ot.data[card]) ot.data[card]={};

    // Chuyển Dự kiến -> Tăng ca thực tế theo đúng ngày đã chọn.
    // Không thay đổi dữ liệu Dự kiến.
    const value=String(plannedValue).toUpperCase();

    if(/^(N|C|S)$/.test(value)){
      ot.data[card][day]=value;
    }else if(/^\d+(?:\.\d+)?$/.test(value)){
      ot.data[card][day]=Number(value);
    }else{
      ot.data[card][day]=value;
    }

    converted++;
  });

  // QUAN TRỌNG: không xóa ot.planned[date].
  // Dữ liệu của ngày đã đồng bộ vẫn tiếp tục hiển thị trong bảng DKTC.

  setOT(ot);
  saveActiveOTMonth(key);
  drawOT(getEmployees());

  if(converted){
    alert(`Đã đồng bộ ${converted} nhân viên từ DKTC thành Tăng ca thực tế ngày ${moneyDate(date)}. Dữ liệu Dự kiến vẫn được giữ lại.`);
  }else{
    alert(`Ngày ${moneyDate(date)} chưa có dữ liệu DKTC để đồng bộ.`);
  }
}

function getTodayDateKey(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function saveActiveOTMonth(key){
  const months=getOTMonths();
  months[key]=getOT();
  setOTMonths(months);
}
function loadOTMonth(key){
  const months=getOTMonths();
  const data=months[key] || JSON.parse(JSON.stringify(DEFAULT_OT));
  setOT(data);
  localStorage.setItem("cv_overtime_active_month_v1",key);
}
function getActiveOTMonth(){return localStorage.getItem("cv_overtime_active_month_v1")||"2026-09";}
function switchOTMonth(key){
  const current=getActiveOTMonth();
  if(current!==key) saveActiveOTMonth(current);
  loadOTMonth(key);
  renderOvertime();
}
function previousOTMonth(){
  const key=getActiveOTMonth();
  const [y,m]=key.split("-").map(Number);
  const d=new Date(y,m-2,1);
  switchOTMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
}
function nextOTMonth(){
  const key=getActiveOTMonth();
  const [y,m]=key.split("-").map(Number);
  const d=new Date(y,m,1);
  switchOTMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
}
function getEquipments(){return JSON.parse(localStorage.getItem(LS_EQUIPMENTS)||"[]")}
function setEquipments(d){localStorage.setItem(LS_EQUIPMENTS,JSON.stringify(d))}
function getMaterials(){return JSON.parse(localStorage.getItem(LS_MATERIALS)||"[]")}
function setMaterials(d){localStorage.setItem(LS_MATERIALS,JSON.stringify(d))}
function getRepairs(){return JSON.parse(localStorage.getItem(LS_REPAIRS)||"[]")}
function setRepairs(d){localStorage.setItem(LS_REPAIRS,JSON.stringify(d))}

function seed(){
  if(!localStorage.getItem(LS_EMP)){
    const emps=[
      {card:"V3405840",name:"NGUYỄN HOÀNG THỊNH",dob:"",phone:"",cccd:"",role:"KỸ SƯ",shift:"CA NGÀY",status:"ĐANG LÀM VIỆC",area:"VA01",line:"VA01",avatar:defaultAvatar},
      {card:"V3404812",name:"ĐỖ VĂN TUẤN",dob:"",phone:"",cccd:"",role:"TRỢ LÝ",shift:"CA NGÀY",status:"ĐANG LÀM VIỆC",area:"VA02",line:"",avatar:defaultAvatar},
      {card:"V3405841",name:"LÊ MỸ HIỀN",dob:"",phone:"",cccd:"",role:"NHÂN VIÊN",shift:"CA NGÀY",status:"ĐANG LÀM VIỆC",area:"VA03",line:"",avatar:defaultAvatar},
      {card:"V3404355",name:"ĐỖ VĂN CƯỜNG",dob:"",phone:"",cccd:"",role:"CÔNG NHÂN",shift:"CA NGÀY",status:"ĐANG LÀM VIỆC",area:"LẮP CHUYỀN",line:"",avatar:defaultAvatar}
    ];
    setEmployees(emps);
  }

  if(!localStorage.getItem(LS_USERS)){
    const users={};
    getEmployees().forEach(e=>users[e.card]={password:"123",completed:false});
    setUsers(users);
  }

  if(!localStorage.getItem(LS_OT)){
    setOT({restDays:[6,13,20,27],data:{},planned:{}});
  }
  if(!localStorage.getItem("cv_overtime_active_month_v1")){
    localStorage.setItem("cv_overtime_active_month_v1","2026-09");
  }
  if(!localStorage.getItem(LS_OT_MONTHS)){
    setOTMonths({"2026-09":getOT()});
  }

  if(!localStorage.getItem(LS_MATERIALS)){
    setMaterials([{
      code:"1",supplier:"1",name:"1",spec:"1",qty:1,price:0,unit:"Cái",
      image:penguinImage,reason:"",note:"3123",createdAt:"2026-09-15T00:00:00.000Z"
    }]);
  }

  if(!localStorage.getItem(LS_EQUIPMENTS)){
    setEquipments([{
      code:"1",name:"1",supplier:"1",serial:"1",qty:1,image:penguinImage,
      alert:5,repairStatus:"Bình thường",taken:0,createdAt:"2026-09-15T00:00:00.000Z"
    }]);
  }

  if(!localStorage.getItem(LS_REPAIRS)){
    setRepairs([]);
  }
}

/* UTILS */
function show(id){
  ["loginScreen","profileScreen","appScreen"].forEach(x=>document.getElementById(x).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function currentUser(){return localStorage.getItem(LS_CURRENT)}

function currentEmployee(){
  return getEmployees().find(e=>e.card===currentUser()) || getEmployees()[0];
}

function normalizeText(s){
  return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function moneyDate(d){
  if(!d)return "";
  const [y,m,day]=d.split("-");
  return `${day}/${m}/${y}`;
}

function fileToBase64(file){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function download(filename,content,type="text/plain"){
  const blob=new Blob([content],{type});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvEscape(v){
  return `"${String(v??"").replaceAll('"','""')}"`;
}

/* EXCEL FONT FIX */
function decodeExcelFile(buffer){
  const bytes=new Uint8Array(buffer);
  if(bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf) return new TextDecoder("utf-8").decode(buffer);
  if(bytes[0]===0xff&&bytes[1]===0xfe) return new TextDecoder("utf-16le").decode(buffer);
  if(bytes[0]===0xfe&&bytes[1]===0xff) return new TextDecoder("utf-16be").decode(buffer);

  const encs=["utf-8","windows-1258","windows-1252","utf-16le"];
  let best="",score=Infinity;
  for(const enc of encs){
    try{
      const text=new TextDecoder(enc).decode(buffer);
      const bad=(text.match(/�/g)||[]).length;
      if(bad<score){score=bad;best=text}
    }catch(e){}
  }
  return best;
}

function detectDelimiter(text){
  const line=text.split(/\r?\n/).find(x=>x.trim())||"";
  const comma=(line.match(/,/g)||[]).length;
  const semi=(line.match(/;/g)||[]).length;
  const tab=(line.match(/\t/g)||[]).length;
  if(tab>=comma&&tab>=semi)return "\t";
  if(semi>=comma)return ";";
  return ",";
}

function parseCSVLine(line,delimiter){
  const out=[];
  let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i],n=line[i+1];
    if(c==='"'&&q&&n==='"'){cur+='"';i++}
    else if(c==='"')q=!q;
    else if(c===delimiter&&!q){out.push(cur.trim());cur=""}
    else cur+=c;
  }
  out.push(cur.trim());
  return out.map(v=>v.replace(/^"|"$/g,"").replaceAll('""','"').trim());
}

function parseCSVText(text){
  text=text.replace(/^\uFEFF/,"");
  const del=detectDelimiter(text);
  return text.split(/\r?\n/).filter(Boolean).map(l=>parseCSVLine(l,del));
}

/* LOGIN */
function initLogin(){
  const remembered=JSON.parse(localStorage.getItem(LS_REMEMBER)||"null");
  if(remembered){
    loginCard.value=remembered.card||"";
    loginPassword.value=remembered.password||"";
    rememberPassword.checked=true;
  }

  forgotLink.onclick=e=>{
    e.preventDefault();
    alert("Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.");
  };

  loginForm.onsubmit=e=>{
    e.preventDefault();
    const card=loginCard.value.trim().toUpperCase();
    const pass=loginPassword.value;
    const users=getUsers();

    if(!users[card]){
      loginMsg.textContent="Không tìm thấy tài khoản.";
      return;
    }

    if(users[card].password!==pass){
      loginMsg.textContent="Mật khẩu không đúng.";
      return;
    }

    if(rememberPassword.checked){
      localStorage.setItem(LS_REMEMBER,JSON.stringify({card,password:pass}));
    }else{
      localStorage.removeItem(LS_REMEMBER);
    }

    localStorage.setItem(LS_CURRENT,card);

    if(!users[card].completed){
      fillProfile(card);
      show("profileScreen");
    }else{
      openApp("home");
    }
  };
}

function fillProfile(card){
  const e=getEmployees().find(x=>x.card===card);
  pfCard.value=card;
  pfName.value=e?.name||"";
  pfDob.value=e?.dob||"";
  pfPhone.value=e?.phone||"";
  pfCccd.value=e?.cccd||"";
}

function initProfile(){
  profileForm.onsubmit=async e=>{
    e.preventDefault();

    if(pfNewPassword.value==="123"){
      profileMsg.textContent="Mật khẩu mới không được dùng 123.";
      return;
    }

    if(pfNewPassword.value!==pfConfirmPassword.value){
      profileMsg.textContent="Mật khẩu nhập lại không khớp.";
      return;
    }

    const file=pfAvatar.files[0];
    if(!file){
      profileMsg.textContent="Vui lòng chọn ảnh đại diện.";
      return;
    }

    const avatar=await fileToBase64(file);
    const card=pfCard.value;
    const emps=getEmployees();
    const idx=emps.findIndex(x=>x.card===card);

    if(idx>=0){
      emps[idx].dob=pfDob.value;
      emps[idx].phone=pfPhone.value;
      emps[idx].cccd=pfCccd.value;
      emps[idx].avatar=avatar;
      setEmployees(emps);
    }

    const users=getUsers();
    users[card].password=pfNewPassword.value;
    users[card].completed=true;
    setUsers(users);

    localStorage.removeItem(LS_REMEMBER);
    openApp("home");
  };
}

/* APP */
function openApp(page){
  show("appScreen");
  refreshAccount();
  bindAppButtons();
  navigate(page);
}

function refreshAccount(){
  const e=currentEmployee();
  accountName.textContent=e?.name||"";
  accountRole.textContent=e?.role||"";
  accountAvatar.src=e?.avatar||defaultAvatar;
}

function logout(){
  closeAccountMenu();
  localStorage.removeItem(LS_CURRENT);
  show("loginScreen");
}

function toggleAccountMenu(){
  const menu=document.getElementById("accountMenu");
  if(!menu) return;
  menu.hidden=!menu.hidden;
}

function closeAccountMenu(){
  const menu=document.getElementById("accountMenu");
  if(menu) menu.hidden=true;
}

function openPersonalInfo(){
  closeAccountMenu();
  const e=currentEmployee();
  if(e) openEmployeeInfo(e.card);
}

function openLanguageMenu(){
  closeAccountMenu();
  const sel=document.getElementById("languageSelect");
  if(sel){ sel.focus(); }
}

function openHelp(){
  closeAccountMenu();
  alert("Trợ giúp\n\nBạn có thể xem thông tin cá nhân, chọn ngôn ngữ hoặc đăng xuất từ menu tài khoản.");
}

document.addEventListener("click", function(ev){
  const menu=document.getElementById("accountMenu");
  const avatar=document.getElementById("accountAvatar");
  if(menu && !menu.hidden && !menu.contains(ev.target) && ev.target!==avatar) menu.hidden=true;
});

function bindAppButtons(){
  document.querySelectorAll(".nav-item").forEach(btn=>{
    btn.onclick=()=>navigate(btn.dataset.page);
  });

  exportBtn.onclick=exportEmployees;
  backupBtn.onclick=backupData;
  importFile.onchange=importEmployees;
  modalClose.onclick=closeModal;
}

function navigate(page){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));

  const titles={
    home:"Quản lý công vụ",
    overtime:"Theo dõi tăng ca",
    status:"Trạng thái làm việc nhân viên",
    shift:"Quản lý đảo ca nhân viên",
    org:"Cơ cấu tổ chức",
    area:"Biểu đồ phân bố khu vực làm việc",
    equipment:"QUẢN LÝ THIẾT BỊ"
  };

  pageTitle.textContent=titles[page]||"Quản lý công vụ";

  if(page==="home")renderHome();
  if(page==="overtime")renderOvertime();
  if(page==="status")renderStatus();
  if(page==="shift")renderShift();
  if(page==="org")renderOrg();
  if(page==="area")renderArea();
  if(page==="equipment")renderEquipment("devices");
  applyLanguage();
}

/* HOME */
// Lấy số giờ từ một ô tăng ca.
// Ví dụ: 2.5 -> 2.5; S4 -> 4; S1.5 -> 1.5; S/C/N -> 0.
// Như vậy các ô có ký hiệu kèm số vẫn được cộng vào cột TỔNG.
function getOTCellHours(value){
  const v=normalizeOTValue(value);
  const m=v.match(/^(?:([0-4](?:\.5)?)|[SCN]([0-4](?:\.5)?))$/);
  if(!m)return 0;
  return Number(m[1] || m[2] || 0);
}

function getEmployeeOTHours(card){
  const row=getOT().data[card]||{};
  return Object.values(row).reduce((s,v)=>s+getOTCellHours(v),0);
}

function getEmployeeLeave(card){
  const row=getOT().data[card]||{};
  return Object.values(row).reduce((s,v)=>{
    if(["S","S2","S1.5","C"].includes(String(v)))return s+.5;
    if(String(v)==="N")return s+1;
    return s;
  },0);
}

function getCurrentWeekDates(){
  const now=new Date();
  const day=now.getDay(); // CN=0, T2=1...
  const mondayOffset=day===0?-6:1-day;
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()+mondayOffset);
  return Array.from({length:7},(_,i)=>{
    const d=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i);
    return {date:d, day:d.getDate(), label:['T2','T3','T4','T5','T6','T7','CN'][i]};
  });
}

function getAttendanceTag(value){
  const v=normalizeOTValue(value||"");
  if(!v || v==="0") return {text:"", cls:"att-zero"};
  if(v.startsWith("S")) return {text:v, cls:"att-S"};
  if(v.startsWith("C")) return {text:v, cls:"att-C"};
  if(v.startsWith("N")) return {text:v, cls:"att-N"};
  if(/^([0-4])(?:\.5)?$/.test(v)) return {text:"✓", cls:"att-number"};
  return {text:"", cls:"att-zero"};
}

function renderWeeklyAttendance(){
  const body=document.getElementById('weeklyAttendanceBody');
  if(!body)return;
  const emps=getEmployees();
  const week=getCurrentWeekDates();
  const ot=getOT();
  body.innerHTML=emps.map(e=>{
    const row=ot.data[e.card]||{};
    const cells=week.map(x=>{
      // Chỉ đồng bộ các ngày thuộc tháng đang lưu trong dữ liệu tăng ca.
      const value=(x.date.getMonth()===8 && x.date.getFullYear()===2026) ? (row[x.day]||'0') : '0';
      const tag=getAttendanceTag(value);
      return `<td><span class="attendance-tag ${tag.cls}">${tag.text}</span></td>`;
    }).join('');
    return `<tr><td><b>${e.name}</b></td>${cells}</tr>`;
  }).join('');
}

function renderHome(){
  const emps=getEmployees();
  const working=emps.filter(e=>e.status==="ĐANG LÀM VIỆC").length;
  const hours=emps.reduce((s,e)=>s+getEmployeeOTHours(e.card),0);
  const leave=emps.reduce((s,e)=>s+getEmployeeLeave(e.card),0);

  pageContent.innerHTML=`
  <div class="stats">
    <div class="stat-card"><p>Tổng nhân viên</p><b>${emps.length}</b></div>
    <div class="stat-card green-left"><p>Đang làm việc</p><b>${working}</b></div>
    <div class="stat-card orange-left"><p>Nghỉ buổi</p><b>${leave%1?1:0}</b></div>
    <div class="stat-card red-left"><p>Nghỉ cả ngày</p><b>${Math.floor(leave)}</b></div>
    <div class="stat-card"><p>Tăng ca / Nghỉ tháng 2026-09</p><b>${hours}h / ${leave}n</b></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <div><h2>Danh sách nhân viên</h2><p>Dữ liệu đồng bộ toàn hệ thống.</p></div>
      <div class="tools home-tools">
        <input id="homeSearch" class="search" placeholder="Tìm mã, tên, SĐT, CCCD, khu vực..."/>
        <button class="primary" onclick="openEmployeeModal()">+ Thêm nhân viên</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STT</th><th>Ảnh</th><th>Mã số thẻ</th><th>Họ tên</th>
            <th>Chức vụ</th><th>Ca</th><th>Trạng thái</th>
            <th>Khu vực</th><th>Chuyền</th><th>Tăng ca</th><th>Nghỉ tháng</th><th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="homeBody"></tbody>
      </table>
    </div>
  </div>
`;

  function draw(list){
    homeBody.innerHTML=list.map((e,i)=>`
      <tr>
        <td>${i+1}</td>
        <td><img class="employee-photo employee-photo-click" src="${e.avatar||defaultAvatar}" onclick="openEmployeeInfo('${e.card}')" title="Xem thông tin nhân viên"/></td>
        <td><b style="color:#2563eb">${e.card}</b></td>
        <td><b>${e.name}</b></td>
        <td>${e.role}</td>
        <td><span class="badge blue">${e.shift}</span></td>
        <td><span class="badge green">${e.status}</span></td>
        <td>${e.area}</td>
        <td>${e.line||""}</td>
        <td>${getEmployeeOTHours(e.card)} giờ</td>
        <td>${getEmployeeLeave(e.card)} ngày</td>
        <td>
          <button class="icon-btn edit-btn" onclick="openEmployeeModal('${e.card}')">✎</button>
          <button class="icon-btn delete-btn" onclick="deleteEmployee('${e.card}')">×</button>
        </td>
      </tr>
    `).join("");
  }

  draw(emps);

  homeSearch.oninput=e=>{
    const q=normalizeText(e.target.value);
    draw(emps.filter(x=>normalizeText(`${x.card} ${x.name} ${x.phone} ${x.cccd} ${x.area}`).includes(q)));
  };
}

function openEmployeeInfo(card){
  const e=getEmployees().find(x=>x.card===card);
  if(!e)return;
  openModal("Thông tin nhân viên", `
    <div class="employee-info-view">
      <div class="employee-info-head">
        <img class="employee-info-avatar" src="${e.avatar||defaultAvatar}"/>
        <div>
          <h2>${e.name||""}</h2>
          <p><b>Mã số thẻ:</b> ${e.card||""}</p>
        </div>
      </div>
      <div class="employee-info-grid">
        <div><span>Ngày sinh</span><b>${moneyDate(e.dob)||"Chưa cập nhật"}</b></div>
        <div><span>Số điện thoại</span><b>${e.phone||"Chưa cập nhật"}</b></div>
        <div><span>CCCD</span><b>${e.cccd||"Chưa cập nhật"}</b></div>
        <div><span>Chức vụ</span><b>${e.role||""}</b></div>
        <div><span>Ca làm việc</span><b>${e.shift||""}</b></div>
        <div><span>Trạng thái</span><b>${e.status||""}</b></div>
        <div><span>Khu vực</span><b>${e.area||""}</b></div>
        <div><span>Chuyền</span><b>${e.line||"Chưa cập nhật"}</b></div>
        <div><span>Tổng tăng ca</span><b>${getEmployeeOTHours(e.card)} giờ</b></div>
        <div><span>Nghỉ tháng</span><b>${getEmployeeLeave(e.card)} ngày</b></div>
      </div>
      <div class="employee-info-actions">
        <button class="primary" onclick="closeModal();openEmployeeModal('${e.card}')">✎ Sửa thông tin</button>
      </div>
    </div>
  `);
}

function openEmployeeModal(card=null){
  const e=getEmployees().find(x=>x.card===card)||{
    card:"",name:"",dob:"",phone:"",cccd:"",role:"",shift:"CA NGÀY",status:"ĐANG LÀM VIỆC",area:"",line:"",avatar:defaultAvatar
  };

  openModal(card?"Sửa nhân viên":"Thêm nhân viên",`
    <form id="empForm" class="grid-form">
      <div><label>Mã số thẻ *</label><input id="empCard" value="${e.card}" ${card?"readonly":""} required></div>
      <div><label>Họ và tên *</label><input id="empName" value="${e.name}" required></div>
      <div><label>Ngày sinh</label><input id="empDob" type="date" value="${e.dob||""}"></div>
      <div><label>SĐT</label><input id="empPhone" value="${e.phone||""}"></div>
      <div><label>CCCD</label><input id="empCccd" value="${e.cccd||""}"></div>
      <div><label>Chức vụ</label><input id="empRole" value="${e.role||""}"></div>
      <div><label>Ca</label><select id="empShift"><option ${e.shift==="CA NGÀY"?"selected":""}>CA NGÀY</option><option ${e.shift==="CA ĐÊM"?"selected":""}>CA ĐÊM</option></select></div>
      <div><label>Trạng thái</label><select id="empStatus"><option ${e.status==="ĐANG LÀM VIỆC"?"selected":""}>ĐANG LÀM VIỆC</option><option ${e.status==="NGHỈ"?"selected":""}>NGHỈ</option></select></div>
      <div><label>Khu vực</label><input id="empArea" value="${e.area||""}"></div>
      <div><label>Chuyền</label><input id="empLine" value="${e.line||""}"></div>
      <div><label>Ảnh</label><input id="empAvatar" type="file" accept="image/*"></div>
      <div class="form-actions"><button class="primary" type="submit">Lưu nhân viên</button></div>
    </form>
  `);

  empForm.onsubmit=async ev=>{
    ev.preventDefault();
    const file=empAvatar.files[0];
    const item={
      card:empCard.value.trim().toUpperCase(),
      name:empName.value.trim().toUpperCase(),
      dob:empDob.value,
      phone:empPhone.value.trim(),
      cccd:empCccd.value.trim(),
      role:empRole.value.trim().toUpperCase(),
      shift:empShift.value,
      status:empStatus.value,
      area:empArea.value.trim().toUpperCase(),
      line:empLine.value.trim().toUpperCase(),
      avatar:file?await fileToBase64(file):e.avatar
    };

    const list=getEmployees();
    const idx=list.findIndex(x=>x.card===item.card);
    if(!card&&idx>=0){alert("Mã số thẻ đã tồn tại.");return}
    if(idx>=0)list[idx]=item;else list.push(item);
    setEmployees(list);

    const users=getUsers();
    if(!users[item.card])users[item.card]={password:"123",completed:false};
    setUsers(users);

    closeModal();
    refreshAccount();
    renderHome();
  };
}

function deleteEmployee(card){
  if(!confirm("Xóa nhân viên này?"))return;
  setEmployees(getEmployees().filter(e=>e.card!==card));
  const users=getUsers();delete users[card];setUsers(users);
  const ot=getOT();delete ot.data[card];
  if(ot.planned){Object.keys(ot.planned).forEach(d=>{delete ot.planned[d][card]; if(!Object.keys(ot.planned[d]).length)delete ot.planned[d];});}
  setOT(ot);
  renderHome();
}

/* OVERTIME */
function showPlannedOTTag(){
  const emps=getEmployees();
  const currentDate=document.getElementById("otDate")?.value || firstDayOfMonth(getActiveOTMonth());
  const [year,month]=currentDate.split("-").map(Number);
  const daysInMonth=new Date(year,month,0).getDate();
  const weekdays=["CN","T2","T3","T4","T5","T6","T7"];
  const ot=getOT();
  const monthKey=`${year}-${String(month).padStart(2,"0")}`;

  openModal("DKTC", `
    <div class="planned-ot-table-box">
      <div class="planned-ot-table-toolbar">
        <div>
          <label>Tháng xem</label>
          <input id="plannedOTMonth" type="month" value="${monthKey}" onchange="renderPlannedOTTable(this.value)">
        </div>
        <div class="planned-ot-table-actions">
          <button type="button" class="soft" onclick="setAllPlannedOTForMonth(true)">☑ Chọn tất cả</button>
          <button type="button" class="gray" onclick="setAllPlannedOTForMonth(false)">Bỏ chọn tất cả</button>
          <button type="button" class="primary" onclick="savePlannedOTTable()">Lưu dự kiến tăng ca</button>
        </div>
      </div>
      <div id="plannedOTTableWrap" class="planned-ot-table-wrap"></div>
    </div>
  `);
  renderPlannedOTTable(monthKey);
  enablePlannedOTResize();
}

function enablePlannedOTResize(){
  // Kích thước bảng DKTC được cố định theo màn hình.
  const box=document.querySelector('#modal .modal-box');
  if(box){
    box.classList.add('planned-ot-resizable-modal');
    box.style.width='calc(100vw - 36px)';
    box.style.height='calc(100vh - 36px)';
    box.style.maxWidth='none';
    box.style.maxHeight='none';
  }
}

function renderPlannedOTTable(monthKey){
  const wrap=document.getElementById("plannedOTTableWrap");
  if(!wrap)return;
  const emps=getEmployees();
  const [year,month]=String(monthKey).split("-").map(Number);
  if(!year||!month)return;
  const daysInMonth=new Date(year,month,0).getDate();
  const weekdays=["CN","T2","T3","T4","T5","T6","T7"];
  const ot=getOT();

  wrap.innerHTML=`
    <table class="planned-ot-table">
      <thead><tr>
        <th class="planned-name-col">NHÂN VIÊN</th>
        ${Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1;
          const dow=new Date(year,month-1,d).getDay();
          const sunday=dow===0 ? " sunday-col" : "";
          const selectedRest=(ot.selectedRestDays||[]).includes(d) ? " selected-rest-day" : "";
          return `<th class="${sunday}${selectedRest}">${String(d).padStart(2,"0")}<br><span>${weekdays[dow]}</span></th>`;
        }).join("")}
        <th class="planned-total-col">TỔNG<br>TĂNG CA</th>
      </tr></thead>
      <tbody>
        ${emps.map(e=>{
          let total=0;
          const cells=Array.from({length:daysInMonth},(_,i)=>{
            const d=i+1;
            const key=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const value=(ot.planned&&ot.planned[key]&&Object.prototype.hasOwnProperty.call(ot.planned[key],e.card)) ? ot.planned[key][e.card] : "";
            total+=getOTCellHours(value);
            const dow=new Date(year,month-1,d).getDay();
            const sunday=dow===0 ? " sunday-col" : "";
            const selectedRest=(ot.selectedRestDays||[]).includes(d) ? " selected-rest-day" : "";
            return `<td class="${sunday}${selectedRest}">
              <input class="planned-grid-cell${getPlannedValueClass(value)}" data-card="${e.card}" data-date="${key}" value="${String(value).replace(/"/g,'&quot;')}" maxlength="20" inputmode="text" onclick="this.select()" oninput="updatePlannedGridTotal(this)">
            </td>`;
          }).join("");
          return `<tr>
            <td class="planned-name-col"><b>${e.name}</b><small>${e.card}</small></td>
            ${cells}
            <td class="planned-total-cell"><b>${total||""}</b></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function sanitizePlannedValue(value){
  let v=String(value ?? "").toUpperCase().replace(/\s+/g," ");

  let result="";
  for(const ch of v){
    if(/[0-9]/.test(ch) || ch==="." || ch==="N" || ch==="C" || ch==="S"){
      result += ch;
    }else{
      result += ".";
    }
  }

  return result.trim();
}

function getPlannedValueClass(value){
  const v=String(value||"").toUpperCase();
  if(v==="N") return " planned-val-N";
  if(v==="C") return " planned-val-C";
  if(v==="S0.5") return " planned-val-S planned-val-S05";
  if(v==="S" || /^S[0-5](?:\.5)?$/.test(v)) return " planned-val-S";
  if(v==="0") return " planned-zero";
  return "";
}
function updatePlannedGridTotal(input){
  if(!input)return;
  const cleaned=sanitizePlannedValue(input.value);
  if(input.value!==cleaned) input.value=cleaned;
  input.classList.remove("planned-zero","planned-val-S","planned-val-C","planned-val-N");
  const cls=getPlannedValueClass(input.value).trim();
  if(cls) input.classList.add(cls);
  const tr=input.closest("tr");
  if(!tr)return;
  let total=0;
  tr.querySelectorAll(".planned-grid-cell").forEach(x=>total+=getOTCellHours(x.value));
  const cell=tr.querySelector(".planned-total-cell");
  if(cell)cell.innerHTML=`<b>${total||""}</b>`;
}

function setAllPlannedOTForMonth(fill){
  document.querySelectorAll(".planned-grid-cell").forEach(input=>{
    const date=input.dataset.date || "";
    const isSunday=date ? new Date(date+"T00:00:00").getDay()===0 : false;

    // Chọn tất cả: chỉ điền 2 giờ cho ngày thường.
    // Chủ nhật luôn để trống, không tự động điền 2 giờ.
    if(fill){
      input.value=isSunday ? "" : (input.value || "2");
    }else{
      input.value="";
    }
    updatePlannedGridTotal(input);
  });
}

function savePlannedOTTable(){
  const inputs=[...document.querySelectorAll(".planned-grid-cell")];
  if(!inputs.length)return;
  const ot=getOT();
  if(!ot.planned)ot.planned={};
  const touched=new Set();
  inputs.forEach(input=>{
    const date=input.dataset.date;
    const card=input.dataset.card;
    const value=sanitizePlannedValue(input.value);
    touched.add(date);
    if(!ot.planned[date])ot.planned[date]={};
    if(value !== ""){
      // Số thuần -> lưu dạng số; N/C/S và các giá trị như S0.5 -> giữ nguyên chuỗi.
      ot.planned[date][card]=/^\d+(?:\.\d+)?$/.test(value) ? Number(value) : value;
    }else delete ot.planned[date][card];
  });
  touched.forEach(date=>{
    if(!Object.keys(ot.planned[date]||{}).length)delete ot.planned[date];
  });
  setOT(ot);
  closeModal();
  renderOvertime();
}

function updatePlannedOTCount(){
  const selected=document.querySelectorAll(".planned-ot-check:checked").length;
  const el=document.getElementById("plannedOTCount");
  if(el)el.textContent=`Đã chọn: ${selected}`;
}

function toggleAllPlannedOT(checked){
  // Khi chọn tất cả nhân viên, nếu ngày dự kiến là Chủ nhật thì không chọn ai.
  // Chủ nhật chỉ được hiển thị/tô màu, không được đưa vào danh sách tăng ca dự kiến bằng nút "Chọn tất cả".
  const date=document.getElementById("plannedOTDate")?.value || "";
  const isSunday=date ? new Date(date+"T00:00:00").getDay()===0 : false;
  const finalChecked=checked && !isSunday;
  document.querySelectorAll(".planned-ot-check").forEach(x=>x.checked=finalChecked);
  updatePlannedOTCount();
}

function applyPlannedOT(){
  const date=document.getElementById("plannedOTDate")?.value;
  const hours=Number(document.getElementById("plannedOTHours")?.value || 0);
  const selected=[...document.querySelectorAll(".planned-ot-check:checked")].map(x=>x.value);
  if(!date){alert("Vui lòng chọn ngày tăng ca.");return;}
  if(!hours){alert("Vui lòng chọn số giờ tăng ca.");return;}
  if(!selected.length){alert("Vui lòng chọn ít nhất một nhân viên.");return;}
  const ot=getOT();
  if(!ot.planned)ot.planned={};
  ot.planned[date]={};
  selected.forEach(card=>{ot.planned[date][card]=hours;});
  setOT(ot);
  const mainDate=document.getElementById("otDate");
  if(mainDate)mainDate.value=date;
  closeModal();
  renderOvertime();
  alert(`Đã lưu dự kiến tăng ca ${hours} giờ cho ${selected.length} nhân viên ngày ${moneyDate(date)}. Dữ liệu đã cập nhật vào bảng tăng ca tổng.`);
}

function getOTSummaryRows(dateKey){
  const emps=getEmployees();
  const ot=getOT();
  const parts=String(dateKey||getTodayDateKey()).split("-");
  const y=Number(parts[0]), m=Number(parts[1]), d=Number(parts[2]);
  return emps.map(e=>{
    const actualRow=ot.data[e.card]||{};
    const planned=(ot.planned&&ot.planned[dateKey]&&Object.prototype.hasOwnProperty.call(ot.planned[dateKey],e.card)) ? ot.planned[dateKey][e.card] : "";
    const actual=actualRow[d];
    const value=(actual===undefined || actual===null || actual==="") ? planned : actual;
    const cellHours=getOTCellHours(value);
    const overtime=(cellHours>0)
      ? [{day:d,hours:cellHours,planned:!actual && !!planned}]
      : [];
    const leaves=( ["S","C","N"].includes(String(value).toUpperCase()) )
      ? [{day:d,type:String(value).toUpperCase()}]
      : [];
    return {emp:e,overtime,leaves,dateKey,year:y,month:m};
  });
}

function excelEscape(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Native XLSX writer: creates a real .xlsx ZIP package without external libraries. */
function xlsxCrc32(bytes){
  let crc=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++){
    crc ^= bytes[i];
    for(let j=0;j<8;j++) crc=(crc>>>1)^((crc&1)?0xEDB88320:0);
  }
  return (crc^0xFFFFFFFF)>>>0;
}
function xlsxUtf8(s){return new TextEncoder().encode(String(s??''));}
function xlsxXmlEscape(s){return excelEscape(s).replace(/'/g,'&apos;');}
function xlsxCol(n){let out=''; n++; while(n){let r=(n-1)%26; out=String.fromCharCode(65+r)+out; n=Math.floor((n-1)/26);} return out;}
function xlsxSheetXml(headers,rows,title){
  const all=[headers,...rows];
  let xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  all.forEach((row,ri)=>{
    xml+=`<row r="${ri+1}">`;
    row.forEach((v,ci)=>{
      const ref=xlsxCol(ci)+(ri+1);
      xml+=`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xlsxXmlEscape(v)}</t></is></c>`;
    });
    xml+='</row>';
  });
  xml+='</sheetData></worksheet>';
  return xml;
}
function xlsxZip(files){
  const chunks=[]; const central=[]; let offset=0;
  const pushU8=(u)=>{chunks.push(u);offset+=u.length;};
  const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);
  const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  files.forEach(([name,content])=>{
    const nameB=xlsxUtf8(name), data=xlsxUtf8(content), crc=xlsxCrc32(data);
    const local=new Uint8Array(30+nameB.length);
    local.set([0x50,0x4b,0x03,0x04],0); local.set(u16(20),4); local.set(u16(0),6); local.set(u16(0),8); local.set(u16(0),10); local.set(u16(0),12);
    local.set(u32(crc),14); local.set(u32(data.length),18); local.set(u32(data.length),22); local.set(u16(nameB.length),26); local.set(u16(0),28); local.set(nameB,30);
    pushU8(local); pushU8(data);
    const c=new Uint8Array(46+nameB.length); c.set([0x50,0x4b,0x01,0x02],0); c.set(u16(20),4); c.set(u16(20),6); c.set(u16(0),8); c.set(u16(0),10); c.set(u16(0),12); c.set(u16(0),14); c.set(u16(0),16); c.set(u32(crc),20); c.set(u32(data.length),24); c.set(u32(data.length),28); c.set(u16(nameB.length),32); c.set(u16(0),34); c.set(u16(0),36); c.set(u16(0),38); c.set(u16(0),40); c.set(u32(0),42); c.set(u32(offset-data.length-30-nameB.length),46); c.set(nameB,46); central.push(c);
  });
  const cdOffset=offset; central.forEach(pushU8); const cdSize=offset-cdOffset;
  const end=new Uint8Array(22); end.set([0x50,0x4b,0x05,0x06],0); end.set(u16(0),4); end.set(u16(0),6); end.set(u16(files.length),8); end.set(u16(files.length),10); end.set(u32(cdSize),12); end.set(u32(cdOffset),16); end.set(u16(0),20); pushU8(end);
  return new Blob(chunks,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function downloadXlsx(filename,title,headers,rows){
  const safeSheet=(String(title||'Sheet1').replace(/[\\\/:?*\[\]]/g,' ').slice(0,31)||'Sheet1');
  const sheet=xlsxSheetXml(headers,rows,title);
  const files=[
    ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xlsxXmlEscape(safeSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/worksheets/sheet1.xml',sheet]
  ];
  const blob=xlsxZip(files); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename.endsWith('.xlsx')?filename:filename+'.xlsx'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function downloadExcel(filename,title,headers,rows){ downloadXlsx(filename,title,headers,rows); }

function exportOTEmployeesExcel(dateKey){
  const selectedDate=dateKey || document.getElementById('otFilterDate1')?.value || document.getElementById('otDate')?.value || getTodayDateKey();
  const rows=getOTSummaryRows(selectedDate).filter(x=>x.overtime.length);
  const [y,m,d]=selectedDate.split('-');
  const data=[]; rows.forEach((x,i)=>x.overtime.forEach(o=>data.push([i+1,x.emp.card,x.emp.name,x.emp.area||'',x.emp.line||'',`${d}/${m}/${y}`,o.hours,o.planned?'Dự kiến':'Tăng ca'])));
  downloadExcel(`Nhan_vien_tang_ca_${d}-${m}-${y}.xlsx`,`TC ngày ${d}/${m}/${y}`,['STT','Mã NV','Họ tên','Khu vực','Chuyền','Ngày tăng ca','Số giờ','Loại'],data);
}
function exportNoOTLeaveExcel(dateKey){
  const selectedDate=dateKey || document.getElementById('otFilterDate2')?.value || document.getElementById('otDate')?.value || getTodayDateKey();
  const rows=getOTSummaryRows(selectedDate).filter(x=>!x.overtime.length && x.leaves.length);
  const [y,m,d]=selectedDate.split('-');
  const labels={S:'Nghỉ sáng',C:'Nghỉ chiều',N:'Nghỉ cả ngày'};
  const data=[]; rows.forEach((x,i)=>x.leaves.forEach(o=>data.push([i+1,x.emp.card,x.emp.name,x.emp.area||'',x.emp.line||'',`${d}/${m}/${y}`,labels[o.type]||o.type])));
  downloadExcel(`Nhan_vien_nghi_${d}-${m}-${y}.xlsx`,`Nhân viên không tăng ca & nghỉ ngày ${d}/${m}/${y}`,['STT','Mã NV','Họ tên','Khu vực','Chuyền','Ngày nghỉ','Loại nghỉ'],data);
}

function showOTEmployees(dateKey){
  const selectedDate=dateKey || document.getElementById("otDate")?.value || getTodayDateKey();
  const rows=getOTSummaryRows(selectedDate).filter(x=>x.overtime.length);
  const month=selectedDate.split("-")[1], year=selectedDate.split("-")[0], day=selectedDate.split("-")[2];
  openModal("TC", `
    <div class="ot-summary-box">
      <div class="ot-summary-date-filter">
        <label>Ngày xem</label>
        <input type="date" id="otFilterDate1" value="${selectedDate}" onchange="showOTEmployees(this.value)">
        <button type="button" class="success" onclick="exportOTEmployeesExcel()">📥 Xuất Excel</button>
      </div>
      <div class="ot-summary-head">
        <b>Danh sách nhân viên tăng ca ngày ${day}/${month}/${year}</b>
        <span class="ot-summary-count">${rows.length} nhân viên</span>
      </div>
      <div class="ot-summary-list">
        ${rows.length ? rows.map(x=>`
          <div class="ot-summary-item">
            <div class="ot-summary-person"><b>${x.emp.name}</b><small>${x.emp.card} · ${x.emp.area||""}</small></div>
            <div class="ot-summary-days">
              ${x.overtime.map(o=>`<span class="ot-summary-day ${o.planned?'planned':''}"><b>${day}/${month}/${year}</b><span>${o.hours} giờ${o.planned?' · Dự kiến':''}</span></span>`).join("")}
            </div>
          </div>`).join("") : '<div class="ot-empty">Không có nhân viên tăng ca trong ngày đã chọn.</div>'}
      </div>
    </div>`);
}

function showNoOTLeaveEmployees(dateKey){
  const selectedDate=dateKey || document.getElementById("otDate")?.value || getTodayDateKey();
  const rows=getOTSummaryRows(selectedDate).filter(x=>!x.overtime.length && x.leaves.length);
  const leaveLabel={S:"Nghỉ sáng",C:"Nghỉ chiều",N:"Nghỉ cả ngày"};
  const month=selectedDate.split("-")[1], year=selectedDate.split("-")[0], day=selectedDate.split("-")[2];
  openModal("KTC&N", `
    <div class="ot-summary-box">
      <div class="ot-summary-date-filter">
        <label>Ngày xem</label>
        <input type="date" id="otFilterDate2" value="${selectedDate}" onchange="showNoOTLeaveEmployees(this.value)">
        <button type="button" class="success" onclick="exportNoOTLeaveExcel()">📥 Xuất Excel</button>
      </div>
      <div class="ot-summary-head">
        <b>Nhân viên không tăng ca và có nghỉ ngày ${day}/${month}/${year}</b>
        <span class="ot-summary-count">${rows.length} nhân viên</span>
      </div>
      <div class="ot-summary-list">
        ${rows.length ? rows.map(x=>`
          <div class="ot-summary-item">
            <div class="ot-summary-person"><b>${x.emp.name}</b><small>${x.emp.card} · ${x.emp.area||""}</small></div>
            <div class="ot-summary-days">
              ${x.leaves.map(o=>`<span class="ot-summary-day leave"><b>${day}/${month}/${year}</b><span>${leaveLabel[o.type]||o.type}</span></span>`).join("")}
            </div>
          </div>`).join("") : '<div class="ot-empty">Không có nhân viên phù hợp trong ngày đã chọn.</div>'}
      </div>
    </div>`);
}

let otValueFilters=[];


const OT_FILTER_VALUES=["0","0.5","1","1.5","2","2.5","3","3.5","4","S","S0.5","S1","S1.5","S2","S2.5","S3","S3.5","S4","C","N"];

function toggleOTValueFilter(ev){
  if(ev) ev.stopPropagation();

  const existing=document.getElementById("otValueFilterMenu");
  if(existing){
    existing.remove();
    return;
  }

  const btn=ev?.currentTarget || document.querySelector(".ot-filter-date-btn");
  if(!btn) return;

  const selected=new Set(otValueFilters);
  const menu=document.createElement("div");
  menu.id="otValueFilterMenu";
  menu.className="ot-value-filter-menu";
  menu.innerHTML=`
    <div class="ot-value-filter-title">Lọc tăng ca</div>
    <div class="ot-filter-grid">
      ${OT_FILTER_VALUES.map(v=>`
        <label class="ot-filter-option">
          <input type="checkbox" value="${v}" ${selected.has(v)?"checked":""}>
          <span>${v}</span>
        </label>`).join("")}
    </div>
    <div class="ot-filter-menu-actions">
      <button type="button" class="gray" onclick="clearOTValueFilter();document.getElementById('otValueFilterMenu')?.remove();">Bỏ lọc</button>
      <button type="button" class="primary" onclick="applyOTValueFilter();document.getElementById('otValueFilterMenu')?.remove();">Lọc</button>
    </div>`;

  document.body.appendChild(menu);
  const r=btn.getBoundingClientRect();
  menu.style.left=Math.min(r.left, window.innerWidth-menu.offsetWidth-8)+"px";
  menu.style.top=(r.bottom+6)+"px";

  setTimeout(()=>{
    document.addEventListener("click", closeOTValueFilterOutside, {once:true});
  },0);
}

function closeOTValueFilterOutside(e){
  const menu=document.getElementById("otValueFilterMenu");
  const btn=document.querySelector(".ot-filter-date-btn");
  if(menu && !menu.contains(e.target) && e.target!==btn && !btn?.contains(e.target)){
    menu.remove();
  }
}

function applyOTValueFilter(){
  const menu=document.getElementById("otValueFilterMenu");
  if(!menu) return;
  otValueFilters=[...menu.querySelectorAll('.ot-filter-option input:checked')].map(x=>x.value);
  menu.remove();
  const search=document.getElementById("otSearch");
  const q=normalizeText(search?.value||"");
  const emps=getEmployees();
  drawOT(emps.filter(x=>normalizeText(`${x.card} ${x.name} ${x.phone} ${x.cccd} ${x.area}`).includes(q)));
}

function clearOTValueFilter(){
  otValueFilters=[];
  document.getElementById("otValueFilterMenu")?.remove();
  const search=document.getElementById("otSearch");
  const q=normalizeText(search?.value||"");
  const emps=getEmployees();
  drawOT(emps.filter(x=>normalizeText(`${x.card} ${x.name} ${x.phone} ${x.cccd} ${x.area}`).includes(q)));
}

function isOTFilterMatch(value){
  if(!otValueFilters.length) return false;
  const v=String(value??"").trim().toUpperCase();
  return otValueFilters.includes(v);
}

function renderOvertime(){
  const emps=getEmployees();

  pageContent.innerHTML=`
  <div class="panel">
    <div class="panel-head"><div><h2>Theo dõi tăng ca</h2><p>Đồng bộ từ Trang chủ.</p></div></div>
    <div style="padding:18px">
      <div class="filters">
        <input id="otSearch" placeholder="Tìm theo mã, tên, SĐT, CCCD, khu vực">
        <div class="ot-date-sync-wrap">
          <input id="otDate" type="date" value="${getTodayDateKey()}" onchange="changeOTDate(this.value)">
          <button class="ot-sync-date-btn" type="button" title="Đồng bộ về ngày hiện tại" aria-label="Đồng bộ về ngày hiện tại" onclick="syncOTDateToday()">↻</button>
        </div>
        <button class="yellow-btn planned-ot-btn" type="button" onclick="showPlannedOTTag()">DKTC</button>
        <button class="month-nav-btn ot-filter-btn" type="button" title="Tháng trước" aria-label="Tháng trước" onclick="previousOTMonth()">−</button>
        <button class="month-nav-btn ot-filter-btn" type="button" title="Tháng sau" aria-label="Tháng sau" onclick="nextOTMonth()">+</button>
        <button class="success ot-filter-btn" type="button" onclick="showOTEmployees()">👥 TC</button>
        <button class="gray ot-filter-btn" type="button" onclick="showNoOTLeaveEmployees()">🚫 KTC&N</button>
        <button class="danger" onclick="pickRestDay()">Chọn ngày nghỉ</button>
        <button class="primary" onclick="clearRestDay()">Xóa ngày nghỉ</button>
        <button class="orange-btn" onclick="openMultiLeaveModal()">👥 Chọn nhiều nhân viên nghỉ</button>
        <button class="danger" onclick="clearOTMonth()">Xóa dữ liệu tháng</button>
      </div>

      <div class="legend">
        <div class="legend-item"><span class="sample white">0-4</span>Số giờ tăng ca.</div>
        <div class="legend-item"><span class="sample yellow">S/S2/S1.5</span>Nghỉ sáng = 0.5 ngày.</div>
        <div class="legend-item"><span class="sample orange">C</span>Nghỉ chiều = 0.5 ngày.</div>
        <div class="legend-item"><span class="sample red">N</span>Nghỉ cả ngày = 1 ngày.</div>
      </div>

      <div class="ot-table-wrap">
        <table class="ot-table">
          <thead id="otHead"></thead>
          <tbody id="otBody"></tbody>
        </table>
      </div>
    </div>
  </div>`;

  drawOT(emps);

  otSearch.oninput=e=>{
    const q=normalizeText(e.target.value);
    drawOT(emps.filter(x=>normalizeText(`${x.card} ${x.name} ${x.phone} ${x.cccd} ${x.area}`).includes(q)));
  };

  otDate.onchange=e=>{
    const key=monthKeyFromDate(e.target.value);
    if(key!==getActiveOTMonth()) switchOTMonth(key);
    else drawOT(emps);
  };
}

function drawOT(list){
  const otHeadEl=document.getElementById("otHead");
  const otBodyEl=document.getElementById("otBody");
  if(!otHeadEl || !otBodyEl) return;
  const ot=getOT();
  const dateValue=document.getElementById("otDate")?.value || firstDayOfMonth(getActiveOTMonth());
  const [year,month]=dateValue.split("-").map(Number);
  const daysInMonth=new Date(year,month,0).getDate();
  const weekdays=["CN","T2","T3","T4","T5","T6","T7"];
  const monthKey=`${year}-${String(month).padStart(2,"0")}`;

  otHeadEl.innerHTML=`
  <tr>
    <th class="name-col">Nhân viên</th>
    ${Array.from({length:daysInMonth},(_,i)=>{
      const d=i+1;
      const dow=new Date(year,month-1,d).getDay();
      const sundayClass=dow===0 ? "sunday-col" : "";
      const selectedRestClass=(ot.selectedRestDays||[]).includes(d) ? "selected-rest-day" : "";
      return `<th class="${sundayClass} ${selectedRestClass}">${String(d).padStart(2,"0")}<br>${weekdays[dow]}</th>`;
    }).join("")}
    <th>TỔNG</th>
  </tr>`;

  otBodyEl.innerHTML=list.map(e=>{
    const row=ot.data[e.card]||{};
    let total=0;
    const cells=Array.from({length:daysInMonth},(_,i)=>{
      const d=i+1;
      const plannedKey=`${monthKey}-${String(d).padStart(2,"0")}`;
      const actual=row[d];
      const v=actual===undefined || actual===null ? "" : String(actual);
      total+=getOTCellHours(v);
      const safeV=String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const plannedClass="";
      const filterClass=isOTFilterMatch(v) ? " filtered-match" : "";
      const title=isOTFilterMatch(v) ? "Đã lọc: "+v : "Tăng ca";
      const dow=new Date(year,month-1,d).getDay();
      const sundayClass=dow===0 ? "sunday-col" : "";
      const selectedRestClass=(ot.selectedRestDays||[]).includes(d) ? "selected-rest-day" : "";
      return `<td class="${sundayClass} ${selectedRestClass}">
        <input class="ot-cell${v ? " val-"+String(v).replace(/\./g,"") : ""}${plannedClass}${filterClass}"
          value="${safeV}"
          title="${title}"
          maxlength="20"
          inputmode="text"
          aria-label="Tăng ca ngày ${d}"
          onclick="this.select()"
          onfocus="this.dataset.oldValue=this.value;this.select()"
          onkeydown="handleOTKey(event,this)"
          oninput="updateOTCellColor(this)"
          onblur="setOTCell('${e.card}',${d},this.value)"
        >
      </td>`;
    }).join("");

    return `<tr>
      <td class="name-col">
        <span><b>${e.name}</b><br><small>${e.card}</small></span>
      </td>${cells}<td class="ot-total-cell"><b>${total || ""}</b></td>
    </tr>`;
  }).join("");
}

function sanitizeOTInput(value){
  let raw=String(value||"").toUpperCase().replace(/\s+/g,"").replace(/,/g,".");

  // C và N là mã riêng: nếu bắt đầu bằng C/N thì chỉ giữ đúng 1 ký tự.
  if(raw.startsWith("C") || raw.startsWith("N")){
    return raw[0];
  }

  // S được phép đi kèm số: S, S0.5, S1.5 ... S5.
  if(raw.startsWith("S")){
    let body=raw.slice(1).replace(/[^0-9.]/g,"");
    const dot=body.indexOf(".");
    if(dot>=0) body=body.slice(0,dot+1)+body.slice(dot+1).replace(/\./g,"");
    return "S"+body;
  }

  // Trường hợp số: chỉ giữ số và một dấu chấm.
  let body=raw.replace(/[^0-9.]/g,"");
  const dot=body.indexOf(".");
  if(dot>=0) body=body.slice(0,dot+1)+body.slice(dot+1).replace(/\./g,"");
  return body;
}

function handleOTKey(event,input){
  if(!input)return;
  if(event.key==='Enter'){
    event.preventDefault();
    input.blur();
    return;
  }
  if(event.key==='Escape'){
    event.preventDefault();
    input.value=input.dataset.oldValue||"";
    input.blur();
    return;
  }
}

function updateOTCellColor(input){
  if(!input)return;
  const cleaned=sanitizeOTInput(input.value);
  if(input.value!==cleaned) input.value=cleaned;
  const v=normalizeOTValue(cleaned);
  input.className="ot-cell";
  if(v){
    if(v==="0") input.classList.add("val-0");
    else if(v.startsWith("S")) input.classList.add("val-S");
    else if(v.startsWith("C")) input.classList.add("val-C");
    else if(v.startsWith("N")) input.classList.add("val-N");
  }
  if(isOTFilterMatch(v)) input.classList.add("filtered-match");

  // Cập nhật tổng ngay khi người dùng nhập, không cần chờ mất focus.
  const tr=input.closest("tr");
  if(tr){
    const totalCell=tr.lastElementChild;
    let total=0;
    tr.querySelectorAll("input.ot-cell").forEach(el=>{
      const n=normalizeOTValue(el.value);
      total+=getOTCellHours(n);
    });
    if(totalCell) totalCell.innerHTML=`<b>${total || ""}</b>`;
  }
}

function normalizeOTValue(value){
  return String(value||"").trim().toUpperCase().replace(/\s+/g,"");
}

function isValidOTValue(value){
  const v=normalizeOTValue(value);

  // C và N chỉ được nhập riêng, không được ghép với số.
  if(v === "C" || v === "N") return true;

  // S có thể đứng riêng hoặc đi kèm số từ 0 đến 5.
  if(v === "S") return true;
  const m=v.match(/^S?(\d+(?:\.\d+)?)$/);
  if(!m) return false;

  const num=Number(m[1]);
  return Number.isFinite(num) && num >= 0 && num <= 5;
}

function setOTCell(card,day,value){
  const input=document.activeElement && document.activeElement.classList.contains("ot-cell")
    ? document.activeElement : null;
  const v=normalizeOTValue(value);

  if(!isValidOTValue(v)){
    // Tắt popup cảnh báo: không hiện tag/thông báo khi nhập sai.
    // Khôi phục giá trị cũ và giữ bảng ổn định.
    if(input){
      input.value=(input.dataset.oldValue||"");
      input.className="ot-cell";
      if(input.value) input.classList.add("val-"+String(input.value).replace(".",""));
    }
    return;
  }

  const ot=getOT();
  if(!ot.data[card])ot.data[card]={};
  ot.data[card][day]=v;
  setOT(ot);

  // KHÔNG render lại bảng tại đây.
  // Chỉ cập nhật đúng ô vừa nhập và ô TỔNG của cùng nhân viên.
  // Như vậy khi nhập N/S/C hoặc số ở dòng phía dưới, bảng không nhảy
  // và các dòng khác trong cùng cột không bị thay đổi vị trí.
  if(input){
    input.value=v;
    input.className="ot-cell";
    if(v) input.classList.add("val-"+String(v).replace(".",""));
    input.dataset.oldValue=v;

    const tr=input.closest("tr");
    if(tr){
      const totalCell=tr.lastElementChild;
      let total=0;
      tr.querySelectorAll("input.ot-cell").forEach(el=>{
        const n=normalizeOTValue(el.value);
        total+=getOTCellHours(n);
      });
      if(totalCell) totalCell.innerHTML=`<b>${total || ""}</b>`;
    }
  }

  // Nếu thẻ Chấm công tuần đang hiển thị, đồng bộ ngay dữ liệu vừa nhập.
  renderWeeklyAttendance();
}

function cycleOT(card,day){
  // Giữ lại hàm cũ để không làm hỏng dữ liệu/onclick cũ.
  const vals=["0","1","2","3","4","S","S2","S1.5","C","N"];
  const ot=getOT();
  if(!ot.data[card])ot.data[card]={};
  const cur=ot.data[card][day]||"0";
  ot.data[card][day]=vals[(vals.indexOf(cur)+1)%vals.length];
  setOT(ot);
  renderOvertime();
}

function pickRestDay(){
  const d=Number(otDate.value.split("-")[2]);
  const ot=getOT();
  ot.selectedRestDays=Array.isArray(ot.selectedRestDays)?ot.selectedRestDays:[];
  if(!ot.selectedRestDays.includes(d))ot.selectedRestDays.push(d);
  ot.selectedRestDays.sort((a,b)=>a-b);
  setOT(ot);
  renderOvertime();
}

function openMultiLeaveModal(){
  const emps=getEmployees();
  const date=otDate?.value || getTodayDateKey();
  openModal("Chọn nhiều nhân viên nghỉ", `
    <div class="multi-leave-box">
      <div class="multi-leave-top">
        <div>
          <label>Ngày nghỉ</label>
          <input id="multiLeaveDate" type="date" value="${date}">
        </div>
        <div>
          <label>Loại nghỉ</label>
          <select id="multiLeaveType">
            <option value="N">N - Nghỉ cả ngày</option>
            <option value="S">S - Nghỉ sáng (0.5 ngày)</option>
            <option value="C">C - Nghỉ chiều (0.5 ngày)</option>
          </select>
        </div>
      </div>
      <div class="multi-leave-actions">
        <button type="button" class="soft" onclick="toggleAllMultiLeave(true)">☑ Chọn tất cả</button>
        <button type="button" class="gray" onclick="toggleAllMultiLeave(false)">Bỏ chọn tất cả</button>
        <span id="multiLeaveCount">Đã chọn: 0</span>
      </div>
      <div id="multiLeaveList" class="multi-leave-list">
        ${emps.map(e=>`<label class="multi-leave-item">
          <input type="checkbox" class="multi-leave-check" value="${e.card}" onchange="updateMultiLeaveCount()">
          <span><b>${e.name}</b><small>${e.card} · ${e.area||""}</small></span>
        </label>`).join("")}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button type="button" class="primary" onclick="applyMultiLeave()">Lưu nghỉ cho nhân viên đã chọn</button>
      </div>
    </div>
  `);
  updateMultiLeaveCount();
}

function updateMultiLeaveCount(){
  const checks=document.querySelectorAll(".multi-leave-check");
  const selected=[...checks].filter(x=>x.checked).length;
  const el=document.getElementById("multiLeaveCount");
  if(el)el.textContent=`Đã chọn: ${selected}`;
}

function toggleAllMultiLeave(checked){
  document.querySelectorAll(".multi-leave-check").forEach(x=>x.checked=checked);
  updateMultiLeaveCount();
}

function applyMultiLeave(){
  const date=document.getElementById("multiLeaveDate")?.value;
  const type=document.getElementById("multiLeaveType")?.value || "N";
  const selected=[...document.querySelectorAll(".multi-leave-check:checked")].map(x=>x.value);
  if(!date){alert("Vui lòng chọn ngày nghỉ.");return;}
  if(!selected.length){alert("Vui lòng chọn ít nhất một nhân viên.");return;}
  const d=Number(date.split("-")[2]);
  const ot=getOT();
  selected.forEach(card=>{
    if(!ot.data[card])ot.data[card]={};
    ot.data[card][d]=type;
  });
  setOT(ot);
  otDate.value=date;
  closeModal();
  renderOvertime();
  alert(`Đã cập nhật ${selected.length} nhân viên nghỉ ${type} ngày ${String(d).padStart(2,"0")}/${date.split("-")[1]}/${date.split("-")[0]}.`);
}

function clearRestDay(){
  const d=Number(otDate.value.split("-")[2]);
  const ot=getOT();
  ot.selectedRestDays=Array.isArray(ot.selectedRestDays)?ot.selectedRestDays:[];
  ot.selectedRestDays=ot.selectedRestDays.filter(x=>x!==d);
  setOT(ot);
  renderOvertime();
}

function clearOTMonth(){
  if(!confirm("Xóa dữ liệu tăng ca tháng?"))return;
  const key=getActiveOTMonth();
  setOT(JSON.parse(JSON.stringify(DEFAULT_OT)));
  saveActiveOTMonth(key);
  renderOvertime();
}

/* STATUS */
function renderStatus(){
  const emps=getEmployees();
  const total=emps.length;
  const working=emps.filter(e=>e.status==="ĐANG LÀM VIỆC").length;
  const perf=[88,80,100,75,82];
  pageContent.innerHTML=`
  <div class="stats">
    <div class="stat-card"><p>Tổng nhân viên</p><b>${total}</b></div>
    <div class="stat-card green-left"><p>Đang làm việc</p><b>${working}</b></div>
    <div class="stat-card orange-left"><p>Giờ làm hôm nay</p><b>${working*8}h</b></div>
    <div class="stat-card"><p>Hoàn thành công việc</p><b>82%</b></div>
    <div class="stat-card red-left"><p>Hoạt động</p><b>5</b></div>
  </div>
  <div class="status-grid">
    <div class="panel">
      <div class="panel-head"><div><h2>Danh sách nhân viên</h2><p>Đồng bộ từ Trang chủ. Bấm vào ảnh đại diện để xem xu hướng hiệu suất.</p></div></div>
      <div class="status-employee-list">
        ${emps.map((e,i)=>{
          const p=perf[i%perf.length]; const st=i===0?"Nghỉ":"Đang làm";
          return `<div class="member-card">
            <img class="performance-avatar" src="${e.avatar||defaultAvatar}" alt="${e.name}" title="Xem xu hướng hiệu suất" onclick="showEmployeePerformance('${e.card}')">
            <div style="flex:1"><h3>${e.name}</h3><p>${e.role} - <b>${st}</b> - ${p}% hoàn thành</p><div class="progress"><span style="width:${p}%"></span></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>
    <div class="panel weekly-attendance-panel status-weekly-panel">
      <div class="panel-head">
        <div><h2>Chấm công tuần</h2><p>Đồng bộ từ bảng Theo dõi tăng ca.</p></div>
      </div>
      <div class="weekly-attendance-wrap" style="padding:12px 16px 18px">
        <table class="weekly-attendance-table">
          <thead><tr><th>Nhân viên</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>T7</th><th>CN</th></tr></thead>
          <tbody id="weeklyAttendanceBody"></tbody>
        </table>
      </div>
    </div>
  </div>`;

  renderWeeklyAttendance();
}

function getWeekDateList(offsetWeeks=0){
  const now=new Date();
  const day=now.getDay();
  const mondayOffset=day===0?-6:1-day;
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()+mondayOffset+(offsetWeeks*7));
  return Array.from({length:7},(_,i)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i));
}

function getOTHoursForDate(card,date){
  const ot=getOT();
  const row=ot.data[card]||{};
  // Dữ liệu tăng ca hiện lưu theo ngày trong tháng 09/2026.
  if(date.getFullYear()!==2026 || date.getMonth()!==8)return 0;
  const value=normalizeOTValue(row[date.getDate()]||'0');
  if(['1','2','3','4'].includes(value))return Number(value);
  return 0;
}

function getPerformanceTrendFromOT(card,weekOffset=0){
  return getWeekDateList(weekOffset).map(date=>Math.min(100,(getOTHoursForDate(card,date)/2)*100));
}

function showEmployeePerformance(card){
  const e=getEmployees().find(x=>x.card===card); if(!e)return;
  const trend=getPerformanceTrendFromOT(card,0);
  const previousTrend=getPerformanceTrendFromOT(card,-1);
  const days=["T2","T3","T4","T5","T6","T7","CN"];
  const current=trend[6]||0;
  openModal(`Xu hướng hiệu suất - ${e.name}`,`
    <div class="employee-performance-modal">
      <div class="employee-performance-head"><img src="${e.avatar||defaultAvatar}" alt="${e.name}"><div><h3>${e.name}</h3><p>${e.card} · ${e.role||""}</p><b>Hiệu suất hiện tại: ${current}%</b></div></div>
      <div class="performance-legend">
        <span><i class="performance-legend-current"></i>Tuần này</span>
        <span><i class="performance-legend-previous"></i>Tuần trước</span>
      </div>
      <div class="employee-performance-bar-chart">
        <div class="performance-y-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
        <div class="performance-chart-area">
          <div class="performance-grid-line g100"></div>
          <div class="performance-grid-line g75"></div>
          <div class="performance-grid-line g50"></div>
          <div class="performance-grid-line g25"></div>
          <div class="performance-grid-line g0"></div>
          <div class="performance-bars">
            ${trend.map((v,i)=>`<div class="performance-bar-col">
              <div class="performance-bar-value">${v}%</div>
              <div class="performance-bar-stack">
                <div class="performance-bar previous" style="height:${previousTrend[i]}%" title="${days[i]} tuần trước: ${previousTrend[i]}%"></div>
                <div class="performance-bar current" style="height:${v}%" title="${days[i]} tuần này: ${v}%"></div>
              </div>
              <div class="performance-bar-label">${days[i]}</div>
            </div>`).join("")}
          </div>
        </div>
      </div>
      <div class="note">Hiệu suất được tính theo thời gian tăng ca: 2 giờ tăng ca tương đương 100%. Cột mờ phía sau thể hiện tuần trước.</div>
    </div>`);
}

/* SHIFT */
const LS_SHIFT_CYCLE = "cv_shift_cycle_v2";
const SHIFT_ANCHOR = "2026-09-07";
const SHIFT_PERIOD_DAYS = 14;

function shiftDateOnly(){
  const d=new Date();
  return new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function shiftAnchorDate(){
  const [y,m,d]=SHIFT_ANCHOR.split("-").map(Number);
  return new Date(y,m-1,d);
}
function shiftCycleIndex(date=shiftDateOnly()){
  const diff=Math.floor((date-shiftAnchorDate())/86400000);
  return Math.max(0,Math.floor(diff/SHIFT_PERIOD_DAYS));
}
function shiftCycleInfo(date=shiftDateOnly()){
  const idx=shiftCycleIndex(date);
  const start=new Date(shiftAnchorDate());
  start.setDate(start.getDate()+idx*SHIFT_PERIOD_DAYS);
  const next=new Date(start); next.setDate(next.getDate()+SHIFT_PERIOD_DAYS);
  const fmt=d=>`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  return {idx,start,next,startText:fmt(start),nextText:fmt(next)};
}
function ensureAutomaticShiftRotation(){
  const info=shiftCycleInfo();
  let applied=Number(localStorage.getItem(LS_SHIFT_CYCLE));
  if(!Number.isFinite(applied)){ applied=0; localStorage.setItem(LS_SHIFT_CYCLE,"0"); }
  if(info.idx<=applied) return info;
  const list=getEmployees().map(e=>({...e,shift:e.shift==="CA NGÀY"?"CA ĐÊM":"CA NGÀY"}));
  setEmployees(list);
  localStorage.setItem(LS_SHIFT_CYCLE,String(info.idx));
  return info;
}
function renderShift(){
  const info=ensureAutomaticShiftRotation();
  const emps=getEmployees();
  const day=emps.filter(e=>e.shift==="CA NGÀY").length;
  const night=emps.filter(e=>e.shift==="CA ĐÊM").length;
  const today=new Date();
  const todayText=`${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;
  const dateValue=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const anchorText=info.startText;

  pageContent.innerHTML=`
  <div class="shift-page">
    <div class="stats shift-stats">
      <div class="stat-card"><p>Chu kỳ đang xem</p><b>Chu kỳ ${info.idx+1}</b><small>Mỗi chu kỳ = 14 ngày</small></div>
      <div class="stat-card green-left"><p>Ngày đảo ca hiện tại</p><b>${anchorText}</b><small>Ngày bắt đầu chu kỳ đang xem</small></div>
      <div class="stat-card orange-left"><p>Đảo ca hệ thống lần tới</p><b>${info.nextText}</b><small>Tự động sau 2 tuần</small></div>
      <div class="stat-card"><p>Tổng nhân viên</p><b>${emps.length} người</b><small>Ngày: ${day} · Đêm: ${night}</small></div>
    </div>

    <div class="shift-board panel">
      <div class="panel-head"><div><h2>Bảng đảo ca</h2></div></div>
      <div class="shift-board-body">
        <div class="filters shift-filters">
          <div class="shift-search-wrap"><label>Tìm kiếm</label><input id="shiftSearch" placeholder="Tìm theo mã hoặc tên..."></div>
          <div class="shift-filter-wrap"><label>Lọc ca</label><select id="shiftFilter"><option value="Tất cả">Tất cả</option><option value="CA NGÀY">CA NGÀY</option><option value="CA ĐÊM">CA ĐÊM</option></select></div>
          <div class="shift-date-wrap"><label>Ngày xem lịch</label><input id="shiftViewDate" type="date" value="${dateValue}"></div>
          <button class="primary shift-update-btn" type="button" onclick="drawShift()">Cập nhật</button>
        </div>

        <div class="shift-summary-grid">
          <div class="shift-summary day-summary">
            <div class="shift-summary-head"><b>CA NGÀY</b><span id="shiftDayCount">${day} người</span></div>
            <div id="shiftDaySummary" class="shift-summary-list"></div>
          </div>
          <div class="shift-summary night-summary">
            <div class="shift-summary-head"><b>CA ĐÊM</b><span id="shiftNightCount">${night} người</span></div>
            <div id="shiftNightSummary" class="shift-summary-list"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  drawShift();
  shiftSearch.oninput=drawShift;
  shiftFilter.onchange=drawShift;
}

function openShiftEmployeeModal(card){
  const e=getEmployees().find(x=>x.card===card)||{
    card:"",name:"",shift:"CA NGÀY",dob:"",phone:"",cccd:"",role:"NHÂN VIÊN",status:"ĐANG LÀM VIỆC",area:"",line:"",avatar:defaultAvatar
  };
  const info=shiftCycleInfo();
  const initial=e.shiftInitialDate||info.next.toISOString().slice(0,10);
  openModal(card?"Sửa nhân viên":"Thêm nhân viên",`
    <form id="shiftEmployeeForm" class="grid-form">
      <div><label>Mã nhân viên *</label><input id="shiftCardModal" value="${e.card}" ${card?"readonly":""} placeholder="VD: V3410488" required></div>
      <div><label>Họ và tên *</label><input id="shiftNameModal" value="${e.name||""}" placeholder="VD: LÊ QUANG TRÀ / 黎光茶" required></div>
      <div><label>Ca gốc từ ngày ${info.startText}</label><select id="shiftBaseModal"><option value="CA NGÀY" ${e.shift==="CA NGÀY"?"selected":""}>CA NGÀY</option><option value="CA ĐÊM" ${e.shift==="CA ĐÊM"?"selected":""}>CA ĐÊM</option></select></div>
      <div><label>Thời gian dự kiến đảo ca ban đầu</label><input id="shiftInitialDateModal" type="date" value="${initial}"></div>
      <div class="form-actions"><button class="green" type="submit">Lưu nhân viên</button><button class="gray" type="button" onclick="clearShiftModalForm()">Làm mới</button></div>
    </form>
  `);

  shiftEmployeeForm.onsubmit=ev=>{
    ev.preventDefault();
    const newCard=shiftCardModal.value.trim().toUpperCase();
    const name=shiftNameModal.value.trim().toUpperCase();
    const base=shiftBaseModal.value;
    const initial=shiftInitialDateModal.value||info.next.toISOString().slice(0,10);
    if(!newCard||!name){alert("Vui lòng nhập mã nhân viên và họ tên.");return;}
    const list=getEmployees();
    const idx=list.findIndex(x=>x.card===newCard);
    if(!card && idx>=0){alert("Mã nhân viên đã tồn tại.");return;}
    if(card && newCard!==card && idx>=0){alert("Mã nhân viên đã tồn tại.");return;}
    const oldIdx=list.findIndex(x=>x.card===card);
    const item=card && oldIdx>=0 ? {...list[oldIdx],card:newCard,name,shift:base,shiftInitialDate:initial} : {
      card:newCard,name,dob:"",phone:"",cccd:"",role:"NHÂN VIÊN",shift:base,status:"ĐANG LÀM VIỆC",area:"",line:"",avatar:defaultAvatar,shiftInitialDate:initial
    };
    if(oldIdx>=0) list[oldIdx]=item; else list.push(item);
    setEmployees(list);
    const users=getUsers();
    if(!users[newCard])users[newCard]={password:"123",completed:false};
    if(card && newCard!==card)delete users[card];
    setUsers(users);
    closeModal();
    renderShift();
  };
}

function clearShiftModalForm(){
  const card=document.getElementById("shiftCardModal");
  const name=document.getElementById("shiftNameModal");
  if(card&&!card.readOnly)card.value="";
  if(name)name.value="";
}

function saveShiftEmployee(){
  openShiftEmployeeModal();
}

function clearShiftForm(){
  openShiftEmployeeModal();
}

function drawShift(){
  const info=shiftCycleInfo();
  const q=normalizeText(document.getElementById("shiftSearch")?.value||"");
  const f=document.getElementById("shiftFilter")?.value||"Tất cả";
  const rows=getEmployees().filter(e=>normalizeText(`${e.card} ${e.name}`).includes(q)&&(f==="Tất cả"||e.shift===f));
  const dayRows=rows.filter(e=>e.shift==="CA NGÀY");
  const nightRows=rows.filter(e=>e.shift==="CA ĐÊM");
  const renderRows=list=>list.length?list.map((e,i)=>`<div class="shift-person-row">
    <span class="shift-person-index">${i+1}</span>
    <span class="shift-person-name" title="${e.name}">${e.name}</span>
    <span class="shift-person-date">${e.shiftStartDate||info.startText}</span>
    <span class="shift-person-date">${e.shiftInitialDate?moneyDate(e.shiftInitialDate):info.nextText}</span>
    <button class="shift-person-edit" type="button" title="Sửa nhân viên" onclick="openShiftEmployeeModal('${e.card}')">✎</button>
  </div>`).join(""):`<div class="shift-empty">Không có nhân viên</div>`;
  const header=`<div class="shift-list-head"><span>STT</span><span>Họ và tên</span><span>Thời gian đảo ca</span><span>Thời gian dự kiến đảo ca</span><span></span></div>`;
  const ds=document.getElementById("shiftDaySummary"), ns=document.getElementById("shiftNightSummary");
  if(ds)ds.innerHTML=header+renderRows(dayRows);
  if(ns)ns.innerHTML=header+renderRows(nightRows);
  const dc=document.getElementById("shiftDayCount"), nc=document.getElementById("shiftNightCount");
  if(dc)dc.textContent=`${dayRows.length} người`;
  if(nc)nc.textContent=`${nightRows.length} người`;
}

function restoreShift(){
  if(!confirm("Khôi phục toàn bộ nhân viên về CA NGÀY và đặt lại chu kỳ đảo ca?"))return;
  setEmployees(getEmployees().map(e=>({...e,shift:"CA NGÀY"})));
  localStorage.setItem(LS_SHIFT_CYCLE,"0");
  renderShift();
}

function exportShiftCSV(){
  const info=shiftCycleInfo();
  const rows=[
    ["STT","Ca hiện tại","Mã nhân viên","Họ tên","Ngày đảo ca","Dự kiến đảo ca","Ca sau đảo"],
    ...getEmployees().map((e,i)=>[i+1,e.shift,e.card,e.name,info.startText,info.nextText,e.shift==="CA NGÀY"?"CA ĐÊM":"CA NGÀY"])
  ];
  downloadXlsx("lich-dao-ca.xlsx","Lịch đảo ca",rows[0],rows.slice(1));
}

/* ORG */
function renderOrg(){
  const roles={};
  getEmployees().forEach(e=>{
    if(!roles[e.role])roles[e.role]=[];
    roles[e.role].push(e);
  });

  pageContent.innerHTML=`
  <div class="panel">
    <div class="panel-head"><div><h2>Cơ cấu tổ chức</h2><p>Phân nhóm theo chức vụ.</p></div></div>
    <div style="padding:20px">
      ${Object.entries(roles).map(([role,list])=>`
        <div class="chart-box org-role-card">
          <h2>${role} <span class="badge blue">${list.length} người</span></h2>
          <div class="org-role-scroll">
            <table>
              <thead><tr><th>Mã</th><th>Họ tên</th><th>Khu vực</th><th>Ca</th><th>Trạng thái</th></tr></thead>
              <tbody>${list.map(e=>`<tr><td>${e.card}</td><td><b>${e.name}</b></td><td>${e.area}</td><td>${e.shift}</td><td>${e.status}</td></tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      `).join("")}
    </div>
  </div>`;
}

/* AREA */
function areaName(e){
  const raw=String(e.area||"").trim();
  return raw || "Chưa phân khu vực";
}

function makeAreaData(){
  const groups={};
  getEmployees().forEach(e=>{
    const key=areaName(e);
    if(!groups[key])groups[key]=[];
    groups[key].push(e);
  });
  // Khu vực mới được tạo tự động từ trường "Khu vực" của nhân viên.
  // Không dùng nhóm cứng và không tạo dữ liệu demo, để số liệu phản ánh đúng Trang chủ.
  return groups;
}

function renderArea(){
  const groups=makeAreaData();
  const areaEntries=Object.entries(groups);
  const total=getEmployees().length;

  pageContent.innerHTML=`
  <div class="area-grid">
    <div class="panel">
      <div class="panel-head"><div><h2>Biểu đồ phân bố theo khu vực</h2><p>Tự động lấy dữ liệu từ cột Khu vực tại Trang chủ.</p></div></div>
      <div class="area-column-chart">
        <div class="area-chart-y">
          <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
        </div>
        <div class="area-chart-body">
          ${areaEntries.map(([name,list])=>areaBar(name,list.length,total)).join("") || '<div class="note">Chưa có nhân viên được phân khu vực.</div>'}
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>Tỷ lệ phân bố khu vực</h2><p>Cập nhật theo dữ liệu nhân viên hiện tại.</p></div></div>
      <div style="padding:20px;text-align:center">
        ${areaDonut(areaEntries,total)}
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head area-list-head">
      <div class="area-list-title"><h2>Danh sách chi tiết nhân viên theo khu vực</h2></div>
      <div class="tools area-list-tools">
        <input id="areaSearch" class="search" placeholder="Tìm mã hoặc tên">
        <select id="areaFilter"><option>Tất cả</option>${areaEntries.map(([name])=>`<option>${name}</option>`).join("")}</select>
        <button type="button" class="primary" onclick="exportAreaEmployeesExcel()">Xuất Excel</button>
        <button type="button" class="soft" onclick="window.print()">In danh sách</button>
      </div>
    </div>
    <div id="areaLists" style="padding:20px"></div>
  </div>`;

  drawAreaLists(groups);
  areaSearch.oninput=()=>drawAreaLists(groups);
  areaFilter.onchange=()=>drawAreaLists(groups);
}

function areaBar(label,count,total){
  const pct=total?Math.round(count/total*100):0;
  const safe=String(label).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
  return `<div class="area-column-item" role="button" tabindex="0" title="Xem nhân viên trong ${label}" onclick="openAreaDetail('${safe}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openAreaDetail('${safe}')}" style="cursor:pointer">
    <div class="area-column-value">${pct}%</div>
    <div class="area-column-track"><span style="height:${pct}%"></span></div>
    <b class="area-column-label" title="${label}">${label}</b>
    <small>${count} NV</small>
  </div>`;
}

function openAreaDetail(label){
  // TAG KHU VỰC không hiển thị nút mũi tên quay lại.
  // Xóa nút quay về khu vực còn sót lại nếu trước đó đang xem TAG CHUYỀN.
  const modalHead=document.querySelector("#modal .modal-head");
  const oldBack=modalHead?.querySelector(".modal-back-area-btn");
  if(oldBack) oldBack.remove();

  const groups=makeAreaData();
  const list=groups[label]||[];
  const lineGroups={};
  list.forEach(e=>{
    const line=String(e.line||"").trim() || "Chưa phân chuyền";
    lineGroups[line]=(lineGroups[line]||0)+1;
  });
  const lineEntries=Object.entries(lineGroups).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'vi'));
  const lineSummary=lineEntries.map(([line,count])=>{
    const safeLine=String(line).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    const safeLabel=String(label).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    return `<button type="button" class="area-line-chip" title="Xem ${count} người trong chuyền ${line}" onclick="openLineDetail('${safeLine}','${safeLabel}')"><span>${line}</span><b>${count} người</b></button>`;
  }).join('') || '<div class="area-line-empty">Chưa có dữ liệu chuyền.</div>';
  openModal(`Khu vực ${label}`,`
    <div class="area-detail-summary area-detail-summary-extended">
      <div><span>Khu vực</span><b>${label}</b></div>
      <div><span>Tổng nhân viên</span><b>${list.length} người</b></div>
      <div><span>Tổng số chuyền</span><b>${lineEntries.length} chuyền</b></div>
    </div>
    <div class="chart-box area-lines-summary">
      <div class="panel-head"><div><h2>Chuyền trong khu vực</h2><p>Tên chuyền và số nhân viên đang thuộc từng chuyền.</p></div></div>
      <div class="area-lines-scroll">${lineSummary}</div>
    </div>
    <div class="chart-box area-detail-panel">
      <div class="panel-head"><div><h2>Nhân viên trong khu vực</h2><p>Danh sách nhân viên thuộc ${label}.</p></div></div>
      <div class="area-detail-scroll">
        <table><thead><tr><th>STT</th><th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Khu vực</th><th>Chuyền</th><th>Ca</th><th>Trạng thái</th></tr></thead>
        <tbody>${list.map((e,i)=>`<tr><td>${i+1}</td><td>${e.card||''}</td><td><b>${e.name||''}</b></td><td>${e.role||''}</td><td>${e.area||label}</td><td>${e.line||''}</td><td>${e.shift||''}</td><td>${e.status||''}</td></tr>`).join('')||'<tr><td colspan="6">Chưa có nhân viên.</td></tr>'}</tbody></table>
      </div>
    </div>`);
}

function openLineDetail(line,label){
  const groups=makeAreaData();
  const areaList=groups[label]||[];
  const list=areaList.filter(e=>{
    const current=String(e.line||"").trim() || "Chưa phân chuyền";
    return current===line;
  });

  const rows=list.map((e,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><b style="color:#2563eb">${e.card||""}</b></td>
      <td><b>${e.name||""}</b></td>
      <td>${e.role||""}</td>
      <td>${e.area||label}</td>
      <td>${e.line||"Chưa phân chuyền"}</td>
      <td>${e.shift||""}</td>
      <td>${e.status||""}</td>
    </tr>
  `).join("") || '<tr><td colspan="8">Chưa có nhân viên trong chuyền.</td></tr>';

  const safeLabel=String(label).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
  openModal(`Chuyền ${line}`,`
    <div class="line-detail-summary">
      <div><span>Khu vực</span><b>${label}</b></div>
      <div><span>Tên chuyền</span><b>${line}</b></div>
      <div><span>Số lượng nhân viên</span><b class="line-detail-count">${list.length} người</b></div>
    </div>
    <div class="chart-box line-detail-panel">
      <div class="panel-head"><div><h2>Nhân viên trong chuyền ${line}</h2><p>Danh sách ${list.length} nhân viên đang thuộc chuyền này.</p></div></div>
      <div class="line-detail-scroll">
        <table>
          <thead><tr><th>STT</th><th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Khu vực</th><th>Chuyền</th><th>Ca</th><th>Trạng thái</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `);

  // Đưa nút quay về khu vực lên thanh tiêu đề, cạnh nút đóng (X).
  const modalHead=document.querySelector("#modal .modal-head");
  const closeButton=document.getElementById("modalClose");
  if(modalHead && closeButton){
    const oldBack=modalHead.querySelector(".modal-back-area-btn");
    if(oldBack) oldBack.remove();
    const backButton=document.createElement("button");
    backButton.type="button";
    backButton.className="modal-back-area-btn";
    backButton.title=`Quay về khu vực ${label}`;
    backButton.textContent="←";
    backButton.onclick=()=>openAreaDetail(label);
    modalHead.insertBefore(backButton,closeButton);
  }
}

function areaDonut(entries,total){
  if(!entries.length || !total) return '<div class="note">Chưa có dữ liệu phân bố khu vực.</div>';
  const palette=['#2563eb','#16a34a','#f59e0b','#0ea5e9','#ef4444','#8b5cf6','#14b8a6','#f97316'];
  let start=0;
  const stops=[];
  entries.forEach(([name,list],i)=>{
    const end=start+(list.length/total*100);
    stops.push(`${palette[i%palette.length]} ${start}% ${end}%`);
    start=end;
  });
  return `<div class="donut" style="background:conic-gradient(${stops.join(',')})"><span>${total} NV</span></div>
    <div style="display:grid;gap:8px;text-align:left;margin-top:12px">${entries.map(([name,list],i)=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${palette[i%palette.length]};margin-right:7px"></i>${name}</span><b>${list.length} (${Math.round(list.length/total*100)}%)</b></div>`).join('')}</div>`;
}

function exportAreaEmployeesExcel(){
  // Xuất đầy đủ danh sách của TẤT CẢ khu vực, không phụ thuộc bộ lọc/từ khóa đang hiển thị.
  const groups=makeAreaData();
  const rows=[];
  let stt=1;
  Object.entries(groups)
    .sort(([a],[b])=>String(a).localeCompare(String(b),'vi'))
    .forEach(([k,list])=>{
      list.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi')).forEach(e=>{
        rows.push([
          stt++,
          e.card||'',
          e.name||'',
          e.role||'',
          e.area||k,
          e.line||'',
          e.shift||'',
          e.status||''
        ]);
      });
    });
  downloadExcel(
    'Danh_sach_day_du_nhan_vien_theo_tat_ca_khu_vuc.xlsx',
    'Danh sách đầy đủ nhân viên theo tất cả khu vực',
    ['STT','Mã','Họ tên','Chức vụ','Khu vực','Chuyền','Ca','Trạng thái'],
    rows
  );
}

function drawAreaLists(groups){
  const q=normalizeText(areaSearch?.value||"");
  const f=areaFilter?.value||"Tất cả";
  areaLists.innerHTML=Object.entries(groups).filter(([k])=>f==="Tất cả"||f===k).map(([k,list])=>`
    <div class="chart-box area-list-card">
      <h2>Khu vực ${k} <span class="badge blue">${list.length} nhân viên</span></h2>
      <div class="area-list-scroll">
        <table>
          <thead><tr><th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Khu vực</th><th>Chuyền</th><th>Ca</th><th>Trạng thái</th></tr></thead>
          <tbody>${list.filter(e=>normalizeText(`${e.card} ${e.name} ${e.area} ${e.line}`).includes(q)).map(e=>`
            <tr><td>${e.card}</td><td><b>${e.name}</b>${e.demo?" <small>(demo)</small>":""}</td><td>${e.role}</td><td>${e.area||k}</td><td>${e.line||""}</td><td>${e.shift}</td><td>${e.status}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>`).join("");
}

/* EQUIPMENT */
let currentEquipSort="newest";
let currentEquipArea="Tất cả";

function renderEquipment(tab="devices"){
  pageContent.innerHTML=`
    <div class="equip-tabs">
      <button class="equip-tab ${tab==="devices"?"active":""}" onclick="renderEquipment('devices')">Thiết bị</button>
      <button class="equip-tab ${tab==="materials"?"active":""}" onclick="renderEquipment('materials')">Vật tư</button>
      <button class="equip-tab ${tab==="repairs"?"active":""}" onclick="renderEquipment('repairs')">Sửa chữa thiết bị</button>
    </div>
    <div id="equipmentInner"></div>
  `;

  if(tab==="devices")renderEquipmentDevices();
  if(tab==="materials")renderMaterials();
  if(tab==="repairs")renderRepairs();

  // Các tag Thiết bị / Vật tư / Sửa chữa thiết bị được tạo lại mỗi lần đổi tab,
  // vì vậy phải áp dụng ngôn ngữ ngay sau khi render để không còn sót tiếng Việt.
  applyLanguage();
}

function equipmentStats(){
  const eq=getEquipments(),rp=getRepairs();
  return {
    total:eq.length,
    qty:eq.reduce((s,e)=>s+Number(e.qty||0),0),
    low:eq.filter(e=>Number(e.qty||0)<Number(e.alert||5)).length,
    taken:eq.reduce((s,e)=>s+Number(e.taken||0),0),
    repair:rp.filter(r=>r.status!=="Hoàn thành").length
  };
}

function renderEquipmentDevices(){
  const s=equipmentStats();
  equipmentInner.innerHTML=`
  <div class="stats">
    <div class="stat-card"><p>Tổng thiết bị</p><b>${s.total}</b></div>
    <div class="stat-card green-left"><p>Tổng số lượng</p><b>${s.qty}</b></div>
    <div class="stat-card red-left" style="background:#fff1f2"><p>Sắp hết hàng</p><b>${s.low}</b></div>
    <div class="stat-card orange-left"><p>Tổng lượt lấy</p><b>${s.taken}</b></div>
    <div class="stat-card"><p>Đang sửa chữa</p><b>${s.repair}</b></div>
  </div>

  <div class="equip-toolbar">
    <button class="sort-btn ${currentEquipSort==="lowFirst"?"active":""}" onclick="setEquipmentSort('lowFirst')">Sắp hết trước</button>
    <button class="sort-btn ${currentEquipSort==="newest"?"active":""}" onclick="setEquipmentSort('newest')">Mới nhất</button>
    <button class="sort-btn ${currentEquipSort==="qtyLow"?"active":""}" onclick="setEquipmentSort('qtyLow')">Số lượng thấp</button>
    <button class="sort-btn ${currentEquipSort==="qtyHigh"?"active":""}" onclick="setEquipmentSort('qtyHigh')">Số lượng cao</button>
    <button class="green" onclick="openEquipmentModal()">+ Thêm thiết bị</button>
    <select id="equipmentAreaFilter" class="equipment-area-filter" aria-label="Lọc theo khu vực sử dụng">
      ${getEquipmentAreaFilterOptions()}
    </select>
    <input id="equipmentSearch" placeholder="Tìm mã, tên, NCC, serial...">
    <span>Cảnh báo chung dưới</span>
    <input id="commonAlert" type="number" value="5" min="0" style="width:80px;min-width:80px">
    <button class="soft" onclick="setAllEquipmentAlert()">Cài tất cả</button>
  </div>

  <div id="equipmentCards" class="equip-cards"></div>`;

  drawEquipmentCards();
  equipmentSearch.oninput=drawEquipmentCards;
  equipmentAreaFilter.onchange=()=>{
    currentEquipArea=equipmentAreaFilter.value||"Tất cả";
    drawEquipmentCards();
  };
}

function setEquipmentSort(type){
  currentEquipSort=type;
  renderEquipment("devices");
}

function getEquipmentAreaFilterOptions(){
  const areas=[...new Set(getEmployees().map(e=>String(e.area||"").trim().toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  // Giữ lại các khu vực đã có trên thiết bị nhưng hiện không còn trong danh sách nhân viên.
  getEquipments().forEach(e=>{
    const a=String(e.area||"").trim().toUpperCase();
    if(a && !areas.includes(a))areas.push(a);
  });
  areas.sort((a,b)=>a.localeCompare(b,"vi"));
  return `<option value="Tất cả" ${currentEquipArea==="Tất cả"?"selected":""}>Tất cả khu vực</option>`+
    areas.map(a=>`<option value="${a}" ${currentEquipArea===a?"selected":""}>${a}</option>`).join("");
}

function drawEquipmentCards(){
  const q=normalizeText(equipmentSearch?.value||"");
  let list=getEquipments().filter(e=>{
    const matchesSearch=normalizeText(`${e.code} ${e.name} ${e.supplier} ${e.serial}`).includes(q);
    const matchesArea=currentEquipArea==="Tất cả" || String(e.area||"").trim().toUpperCase()===currentEquipArea;
    return matchesSearch && matchesArea;
  });

  if(currentEquipSort==="lowFirst"){
    list.sort((a,b)=>(Number(a.qty||0)<Number(a.alert||5)?0:1)-(Number(b.qty||0)<Number(b.alert||5)?0:1));
  }
  if(currentEquipSort==="newest")list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  if(currentEquipSort==="qtyLow")list.sort((a,b)=>Number(a.qty||0)-Number(b.qty||0));
  if(currentEquipSort==="qtyHigh")list.sort((a,b)=>Number(b.qty||0)-Number(a.qty||0));

  equipmentCards.innerHTML=list.length?list.map(e=>{
    const low=Number(e.qty||0)<Number(e.alert||5);
    return `<div class="equip-card equip-image-only-card" onclick="showEquipmentDetail('${e.code}')" title="Nhấn để xem thông tin thiết bị">
      <div class="equip-image-only-wrap">
        <img class="equip-img equip-image-only" src="${e.image||penguinImage}" alt="${e.name||e.code}">
        <div class="equip-card-display ${low?"low":""}">
          <div class="equip-card-name-row">
            <button type="button" class="equip-card-qty-btn" onclick="event.stopPropagation();changeEquipmentQty(\'${e.code}\',-1);drawEquipmentCards()">-</button>
            <div class="equip-card-device-name">${e.name||"Chưa cập nhật"}</div>
            <button type="button" class="equip-card-qty-btn" onclick="event.stopPropagation();changeEquipmentQty(\'${e.code}\',1);drawEquipmentCards()">+</button>
          </div>
          <div class="equip-card-info-row">
            <div class="equip-card-info-item">
              <span>QUY CÁCH</span>
              <b>${e.serial||"Chưa cập nhật"}</b>
            </div>
            <div class="equip-card-info-item ${low?"equip-card-qty-low":"equip-card-qty-ok"}">
              <span>SỐ LƯỢNG</span>
              <b>${Number(e.qty||0)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join(""):`<p>Không có thiết bị.</p>`;
}

function showEquipmentDetail(code){
  const e=getEquipments().find(x=>x.code===code);
  if(!e)return;
  const repairs=getRepairs().filter(r=>r.code===code);
  const low=Number(e.qty||0)<Number(e.alert||5);
  const status=e.repairStatus||"Bình thường";
  const created=e.createdAt?new Date(e.createdAt).toLocaleString("vi-VN"):"Chưa cập nhật";

  openModal("", `
    <div class="equipment-detail-card">
      <button type="button" class="equipment-back-btn equipment-back-btn-detail" title="Quay lại danh sách thiết bị" aria-label="Quay lại danh sách thiết bị" onclick="closeModal();renderEquipment('devices')">←</button>
      <div class="equipment-detail-photo-box">
        <img class="equipment-detail-photo" src="${e.image||penguinImage}" alt="${e.name||e.code}">
      </div>

      <div class="equipment-detail-body">
        ${low?`<div class="equip-detail-badge danger-badge">⚠ Sắp hết hàng</div>`:`<div class="equip-detail-badge ok-badge">✓ Đủ tồn kho</div>`}

        <h2 class="equipment-detail-name">${e.name||"Chưa cập nhật"}</h2>
        <div class="equipment-detail-code"><b>Mã thiết bị:</b> ${e.code||"Chưa cập nhật"}</div>

        ${low?`<div class="equip-detail-warning">⚠ Số lượng dưới ${e.alert??5} - Nhanh chóng<br>đặt mua</div>`:""}

        <div class="equipment-detail-rows">
          <div><span>Nhà cung cấp:</span><b>${e.supplier||"Chưa cập nhật"}</b></div>
          <div><span>Serial/Quy cách:</span><b>${e.serial||"Chưa cập nhật"}</b></div>
          <div><span>Khu vực sử dụng:</span><b>${e.area||"Chưa cập nhật"}</b></div>
          <div><span>Sửa chữa:</span><b class="equip-status-pill ${status==="Bình thường"||status==="Hoàn thành"?"ok":"warn"}">${status}</b></div>
          <div><span>Số lượng hiện có:</span><b class="equipment-qty-big">${e.qty||0}</b></div>
        </div>

        <div class="equipment-detail-controls">
          <button class="qty-detail-btn" onclick="changeEquipmentQty('${e.code}',-1);showEquipmentDetail('${e.code}')">-</button>
          <input class="qty-detail-number qty-detail-input" type="number" min="0" step="1" value="${e.qty||0}" aria-label="Số lượng" onchange="setEquipmentQty('${e.code}',this.value)" onkeydown="if(event.key==='Enter'){this.blur();}">
          <button class="qty-detail-btn" onclick="changeEquipmentQty('${e.code}',1);showEquipmentDetail('${e.code}')">+</button>
          <button class="soft detail-action-btn" onclick="showEquipmentHistory('${e.code}')">Lịch sử</button>
          <button class="soft detail-action-btn qr-detail-btn" onclick="showEquipmentQR('${e.code}')">QR</button>
        </div>

        <div class="equipment-alert-setting">
          <label>Cài đặt cảnh báo riêng dưới</label>
          <input type="number" min="0" value="${e.alert??5}" onchange="setEquipmentAlert('${e.code}',this.value);showEquipmentDetail('${e.code}')">
        </div>

        <div class="equipment-detail-actions equipment-detail-actions-left">
          <button class="yellow-btn" onclick="closeModal();openEquipmentModal('${e.code}')">Sửa</button>
          <button class="repair-btn" onclick="closeModal();openRepairWithEquipment('${e.code}')">Sửa chữa</button>
          <button class="danger" onclick="closeModal();deleteEquipment('${e.code}')">Xóa</button>
        </div>

        <div class="equipment-created-note">Ngày tạo: ${created} · Tổng lượt lấy: ${e.taken||0}</div>
      </div>
    </div>
  `);
  const box=document.querySelector('#modal .modal-box');
  if(box)box.classList.add('equipment-detail-modal-box');
}

function setEquipmentQty(code,value){
  const list=getEquipments();
  const e=list.find(x=>x.code===code);
  if(!e)return;
  let qty=Math.floor(Number(value));
  if(!Number.isFinite(qty)) qty=Number(e.qty||0);
  qty=Math.max(0,qty);
  const oldQty=Number(e.qty||0);
  if(qty!==oldQty){
    if(qty<oldQty)e.taken=Number(e.taken||0)+(oldQty-qty);
    e.qtyHistory=Array.isArray(e.qtyHistory)?e.qtyHistory:[];
    e.qtyHistory.push({time:new Date().toISOString(),oldQty,newQty:qty,change:qty-oldQty,action:"Nhập tay"});
    e.qtyHistory=e.qtyHistory.slice(-100);
  }
  e.qty=qty;
  setEquipments(list);
  renderEquipment("devices");
}

function changeEquipmentQty(code,delta){
  const list=getEquipments();
  const e=list.find(x=>x.code===code);
  if(!e)return;
  const oldQty=Number(e.qty||0);
  const newQty=Math.max(0,oldQty+delta);
  e.qty=newQty;
  if(delta<0)e.taken=Number(e.taken||0)+Math.abs(delta);
  e.qtyHistory=Array.isArray(e.qtyHistory)?e.qtyHistory:[];
  e.qtyHistory.push({time:new Date().toISOString(),oldQty,newQty,change:newQty-oldQty,action:delta>0?"Tăng số lượng":"Giảm số lượng"});
  e.qtyHistory=e.qtyHistory.slice(-100);
  setEquipments(list);
  renderEquipment("devices");
}

function setEquipmentAlert(code,value){
  const list=getEquipments();
  const e=list.find(x=>x.code===code);
  if(!e)return;
  e.alert=Number(value||5);
  setEquipments(list);
  drawEquipmentCards();
}

function setAllEquipmentAlert(){
  const v=Number(commonAlert.value||5);
  setEquipments(getEquipments().map(e=>({...e,alert:v})));
  renderEquipment("devices");
}

function openEquipmentModal(code=null){
  const e=getEquipments().find(x=>x.code===code)||{
    code:"",name:"",supplier:"",serial:"",qty:1,image:penguinImage,alert:5,repairStatus:"Bình thường",taken:0,area:""
  };

  openModal(code?"Sửa thiết bị":"Thêm thiết bị",`
    <form id="equipmentForm" class="equip-form">
      <div><label>Mã thiết bị *</label><input id="eqCode" value="${e.code}" ${code?"readonly":""} required></div>
      <div><label>Tên thiết bị *</label><input id="eqName" value="${e.name}" required></div>
      <div><label>Nhà cung cấp</label><input id="eqSupplier" value="${e.supplier||""}"></div>
      <div><label>Serial/Quy cách</label><input id="eqSerial" value="${e.serial||""}"></div>
      <div><label>Khu vực sử dụng</label><select id="eqArea">${getMaterialAreaOptions(e.area||"")}</select></div>
      <div><label>Số lượng</label><input id="eqQty" type="number" value="${e.qty||1}" min="0"></div>
      <div><label>Cảnh báo dưới</label><input id="eqAlert" type="number" value="${e.alert||5}" min="0"></div>
      <div><label>Trạng thái sửa chữa</label>
        <select id="eqRepairStatus">
          <option ${e.repairStatus==="Bình thường"?"selected":""}>Bình thường</option>
          <option ${e.repairStatus==="Chờ sửa"?"selected":""}>Chờ sửa</option>
          <option ${e.repairStatus==="Đang sửa"?"selected":""}>Đang sửa</option>
          <option ${e.repairStatus==="Hoàn thành"?"selected":""}>Hoàn thành</option>
        </select>
      </div>
      <div><label>Ảnh thiết bị</label><input id="eqImage" type="file" accept="image/*"></div>
      <div class="equip-form-actions"><button class="primary" type="submit">Lưu thiết bị</button></div>
    </form>
  `);

  equipmentForm.onsubmit=async ev=>{
    ev.preventDefault();
    const file=eqImage.files[0];
    const item={
      code:eqCode.value.trim(),
      name:eqName.value.trim(),
      supplier:eqSupplier.value.trim(),
      serial:eqSerial.value.trim(),
      area:String(eqArea.value||"").trim().toUpperCase(),
      qty:Number(eqQty.value||0),
      image:file?await fileToBase64(file):e.image||penguinImage,
      alert:Number(eqAlert.value||5),
      repairStatus:eqRepairStatus.value,
      taken:Number(e.taken||0),
      qtyHistory:Array.isArray(e.qtyHistory)?e.qtyHistory:[],
      createdAt:e.createdAt||new Date().toISOString()
    };

    const list=getEquipments();
    const idx=list.findIndex(x=>x.code===item.code);
    if(!code&&idx>=0){alert("Mã thiết bị đã tồn tại.");return}
    if(idx>=0)list[idx]=item;else list.push(item);
    setEquipments(list);
    closeModal();
    renderEquipment("devices");
  };
}

function deleteEquipment(code){
  if(!confirm("Xóa thiết bị này?"))return;
  setEquipments(getEquipments().filter(e=>e.code!==code));
  renderEquipment("devices");
}

function exportEquipmentHistoryExcel(code){
  const e=getEquipments().find(x=>x.code===code);
  if(!e){alert("Không tìm thấy thiết bị.");return;}
  const repairs=getRepairs().filter(r=>r.code===code);
  const qtyHistory=Array.isArray(e.qtyHistory)?[...e.qtyHistory].sort((a,b)=>new Date(a.time||0)-new Date(b.time||0)):[];
  const fmt=v=>v?new Date(v).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):"";
  const rows=[];
  qtyHistory.forEach(h=>rows.push([fmt(h.time),"Thay đổi số lượng",h.action||"Cập nhật",h.oldQty??0,h.newQty??0,h.change??0,"","",""]));
  repairs.forEach(r=>rows.push([r.date?moneyDate(r.date):"","Sửa chữa","", "", "", "",r.status||"",r.issue||"",r.note||""]));
  downloadExcel(`Lich_su_thiet_bi_${e.code||""}.xlsx`,`Lịch sử thiết bị ${e.code||""}`,['Thời gian','Loại','Thao tác','Số lượng cũ','Số lượng mới','Thay đổi','Trạng thái sửa chữa','Nội dung sửa chữa','Ghi chú'],rows);
}

function clearEquipmentHistory(code){
  const e=getEquipments().find(x=>x.code===code);
  if(!e){alert("Không tìm thấy thiết bị.");return;}
  if(!confirm(`Xóa toàn bộ lịch sử số lượng và lịch sử sửa chữa của thiết bị ${code}?\n\nSố lượng hiện có và tổng lượt lấy sẽ không thay đổi.`)) return;
  e.qtyHistory=[];
  setEquipments(getEquipments().map(x=>x.code===code?e:x));
  setRepairs(getRepairs().filter(r=>r.code!==code));
  showEquipmentHistory(code);
}

function showEquipmentHistory(code){
  const e=getEquipments().find(x=>x.code===code);
  const repairs=getRepairs().filter(r=>r.code===code);
  const qtyHistory=Array.isArray(e?.qtyHistory)?[...e.qtyHistory].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)):[];
  const fmtTime=v=>v?new Date(v).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}):"Chưa có thời gian";
  openModal("Lịch sử thiết bị",`
    <div class="equipment-subpopup">
      <button type="button" class="equipment-back-btn equipment-back-btn-popup" title="Quay lại thông tin thiết bị" aria-label="Quay lại thông tin thiết bị" onclick="showEquipmentDetail('${code}')">←</button>
      <p><b>Mã thiết bị:</b> ${code}</p>
      <p><b>Tên thiết bị:</b> ${e?.name||""}</p>
      <p><b>Tổng lượt lấy:</b> ${e?.taken||0}</p>
      <div style="display:flex;justify-content:flex-end;margin:8px 0 12px">
        <button type="button" class="success" onclick="exportEquipmentHistoryExcel('${code}')">📥 Xuất Excel</button>
        <button type="button" class="danger" onclick="clearEquipmentHistory('${code}')">🗑 Xóa lịch sử</button>
      </div>
      <h3>Lịch sử số lượng</h3>
      ${qtyHistory.length?`<div class="equipment-history-list">${qtyHistory.map(h=>`<div class="equipment-history-item"><b>${fmtTime(h.time)}</b><span>${h.action||"Cập nhật"}: ${h.oldQty??0} → ${h.newQty??0} ${h.change>0?`(+${h.change})`:h.change<0?`(${h.change})`:""}</span></div>`).join("")}</div>`:`<p>Chưa có lịch sử thay đổi số lượng.</p>`}
      <h3>Lịch sử sửa chữa</h3>
      ${repairs.length?`<ul>${repairs.map(r=>`<li>${moneyDate(r.date)} - ${r.status} - ${r.issue||""}</li>`).join("")}</ul>`:`<p>Chưa có lịch sử sửa chữa.</p>`}
    </div>
  `);
  const box=document.querySelector('#modal .modal-box');
  if(box)box.classList.add('equipment-subpopup-modal-box');
}

function showEquipmentQR(code){
  const e=getEquipments().find(x=>String(x.code)===String(code));
  const payload=[
    `Mã thiết bị: ${code}`,
    `Tên thiết bị: ${e?.name||""}`,
    `Quy cách: ${e?.spec||e?.specification||""}`,
    `Nhà cung cấp: ${e?.supplier||""}`,
    `Serial: ${e?.serial||""}`,
    `Khu vực sử dụng: ${e?.area||""}`,
    `Số lượng hiện có: ${e?.qty??0}`,
    `Trạng thái sửa chữa: ${e?.repairStatus||"Bình thường"}`,
    `Tổng lượt lấy: ${e?.taken||0}`
  ].join("\n");
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(payload)}`;
  openModal("QR thiết bị",`
    <div class="equipment-subpopup">
      <button type="button" class="equipment-back-btn equipment-back-btn-popup" title="Quay lại thông tin thiết bị" aria-label="Quay lại thông tin thiết bị" onclick="showEquipmentDetail('${code}')">←</button>
      <div style="text-align:center">
        <img src="${qrUrl}" alt="QR ${code}" style="width:240px;height:240px;display:block;margin:0 auto 12px;background:#fff;border:8px solid #111827;box-sizing:border-box" />
        <h2>${e?.name||code}</h2>
        <p>Quét mã QR để xem thông tin thiết bị.</p>
        <div style="font-size:13px;text-align:left;max-width:300px;margin:12px auto 0;padding:10px;border:1px solid #dbe5f1;border-radius:8px;background:#f8fafc;white-space:pre-line">${payload}</div>
      </div>
    </div>
  `);
  const box=document.querySelector('#modal .modal-box');
  if(box)box.classList.add('equipment-subpopup-modal-box');
}

/* MATERIALS */
function getMaterialAreaOptions(selected=""){
  const areas=[...new Set(getEmployees().map(e=>String(e.area||"").trim().toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  const opts=areas.map(a=>`<option value="${a}" ${a===String(selected||"").toUpperCase()?"selected":""}>${a}</option>`).join("");
  return `<option value="">-- Chọn khu vực sử dụng --</option>${opts}`;
}

function renderMaterials(){
  const currentArea="";
  equipmentInner.innerHTML=`
  <div class="panel">
    <div class="panel-head">
      <div><h2>Thông tin vật tư</h2><p>Khi thêm vật tư sẽ tự cập nhật sang thiết bị.</p></div>
      <div class="tools material-tools-v28">
        <input id="materialSearch" class="material-search" type="search" placeholder="Tìm vật tư..." oninput="drawMaterials()" />
        <button class="orange-btn" type="button" onclick="toggleMaterialForm(true)">+ Thêm vật tư</button>
        <label class="green file-label">Nhập Excel<input id="materialImport" type="file" accept=".csv,.txt,.json" hidden /></label>
        <button class="primary" type="button" onclick="exportMaterials()">Xuất Excel</button>
      </div>
    </div>
    <div id="materialFormWrap" class="material-form-wrap hidden">
      <form id="materialForm" class="equip-form">
        <div><label>Mã vật tư 料號 *</label><input id="matCode" required></div>
        <div><label>Nhà cung cấp 供應商</label><input id="matSupplier"></div>
        <div><label>Tên vật tư 品名 *</label><input id="matName" required></div>
        <div><label>Quy cách 規格</label><input id="matSpec"></div>
        <div><label>Số lượng 數量</label><input id="matQty" type="number" value="1" min="0"></div>
        <div><label>Đơn giá 單價</label><input id="matPrice" type="number" value="0" min="0"></div>
        <div><label>Đơn vị 單位</label><select id="matUnit"><option>Cái</option><option>Bộ</option><option>Hộp</option><option>Cuộn</option><option>Kg</option></select></div>
        <div><label>Khu vực sử dụng</label><select id="matArea">${getMaterialAreaOptions(currentArea)}</select></div>
        <div class="material-note-row">
          <div class="material-image-field"><label>Ảnh vật tư 圖片</label><input id="matImage" type="file" accept="image/*"></div>
          <div class="material-note-field"><label>Lý do xin mua 请购原因</label><textarea id="matReason" placeholder="Nhập lý do xin mua..."></textarea></div>
          <div class="material-note-field"><label>Ghi chú 备注</label><textarea id="matNote" placeholder="Nhập ghi chú..."></textarea></div>
        </div>
        <div class="equip-form-actions">
          <button class="orange-btn" type="submit">Lưu vật tư</button>
          <button class="gray" type="button" onclick="toggleMaterialForm(false)">Hủy</button>
        </div>
      </form>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><div><h2>Danh sách vật tư</h2></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mã vật tư</th><th>Nhà cung cấp</th><th>Tên vật tư</th><th>Quy cách</th><th>Số lượng</th><th>Đơn giá</th><th>Đơn vị</th><th>Khu vực sử dụng</th><th>Tổng tiền</th><th>Ảnh</th><th>Ghi chú</th><th>Thao tác</th></tr></thead>
        <tbody id="materialBody"></tbody>
      </table>
    </div>
  </div>`;

  drawMaterials();
  materialForm.onsubmit=saveMaterialFromForm;
  materialImport.onchange=importMaterials;
}

function toggleMaterialForm(show=true){
  const wrap=document.getElementById("materialFormWrap");
  if(!wrap)return;
  wrap.classList.toggle("hidden",!show);
  if(show){
    const first=document.getElementById("matCode");
    if(first){first.focus();}
  }
}

async function saveMaterialFromForm(ev){
  ev.preventDefault();

  const file=matImage.files[0];
  const material={
    code:matCode.value.trim(),
    supplier:matSupplier.value.trim(),
    name:matName.value.trim(),
    spec:matSpec.value.trim(),
    qty:Number(matQty.value||1),
    price:Number(matPrice.value||0),
    unit:matUnit.value,
    area:String(matArea.value||"").trim().toUpperCase(),
    image:file?await fileToBase64(file):penguinImage,
    reason:matReason.value.trim(),
    note:matNote.value.trim(),
    createdAt:new Date().toISOString()
  };

  const list=getMaterials();
  const idx=list.findIndex(x=>x.code===material.code);
  if(idx>=0)list[idx]=material;else list.push(material);
  setMaterials(list);
  syncMaterialToEquipment(material);

  ev.target.reset();
  matQty.value=1;
  matPrice.value=0;
  renderEquipment("materials");
}

function syncMaterialToEquipment(m){
  const eq=getEquipments();
  const idx=eq.findIndex(e=>e.code===m.code);
  const item={
    code:m.code,name:m.name,supplier:m.supplier,serial:m.spec,qty:Number(m.qty||0),image:m.image||penguinImage,
    area:String(m.area||"").trim().toUpperCase(),
    alert:idx>=0?eq[idx].alert||5:5,
    repairStatus:idx>=0?eq[idx].repairStatus||"Bình thường":"Bình thường",
    taken:idx>=0?eq[idx].taken||0:0,
    createdAt:idx>=0?eq[idx].createdAt:new Date().toISOString()
  };
  if(idx>=0)eq[idx]=item;else eq.push(item);
  setEquipments(eq);
}

function drawMaterials(){
  const q=String(document.getElementById("materialSearch")?.value||"").trim().toLowerCase();
  const list=getMaterials().filter(m=>{
    if(!q)return true;
    return [m.code,m.supplier,m.name,m.spec,m.area,m.unit,m.note,m.reason].some(v=>String(v||"").toLowerCase().includes(q));
  });
  materialBody.innerHTML=list.length?list.map(m=>`
    <tr>
      <td><b style="color:#2563eb">${m.code}</b></td>
      <td>${m.supplier||""}</td>
      <td><b>${m.name||""}</b></td>
      <td>${m.spec||""}</td>
      <td>${m.qty||0}</td>
      <td>${Number(m.price||0).toLocaleString("vi-VN")}</td>
      <td>${m.unit||"Cái"}</td>
      <td><span class="equip-ok">${m.area||"Chưa chọn"}</span></td>
      <td><b>${(Number(m.qty||0)*Number(m.price||0)).toLocaleString("vi-VN")}</b></td>
      <td><img class="equip-thumb" src="${m.image||penguinImage}"></td>
      <td>${m.note||""}</td>
      <td>
        <button class="icon-btn edit-btn" onclick="editMaterial('${m.code}')">✎</button>
        <button class="icon-btn delete-btn" onclick="deleteMaterial('${m.code}')">×</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="12" style="text-align:center">Chưa có vật tư</td></tr>`;
}

function editMaterial(code){
  const m=getMaterials().find(x=>x.code===code);
  if(!m)return;
  matCode.value=m.code;
  matSupplier.value=m.supplier||"";
  matName.value=m.name||"";
  matSpec.value=m.spec||"";
  matQty.value=m.qty||1;
  matPrice.value=m.price||0;
  matUnit.value=m.unit||"Cái";
  matArea.innerHTML=getMaterialAreaOptions(m.area||"");
  matArea.value=String(m.area||"").toUpperCase();
  matReason.value=m.reason||"";
  matNote.value=m.note||"";
  toggleMaterialForm(true);
  document.getElementById("materialFormWrap")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function deleteMaterial(code){
  if(!confirm("Xóa vật tư này?"))return;
  setMaterials(getMaterials().filter(m=>m.code!==code));
  renderEquipment("materials");
}

function exportMaterials(){
  const rows=[
    ["Mã vật tư","Nhà cung cấp","Tên vật tư","Quy cách","Số lượng","Đơn giá","Đơn vị","Khu vực sử dụng","Tổng tiền","Ghi chú"],
    ...getMaterials().map(m=>[m.code,m.supplier,m.name,m.spec,m.qty,m.price,m.unit,m.area||"",Number(m.qty||0)*Number(m.price||0),m.note])
  ];
  downloadXlsx("danh-sach-vat-tu.xlsx","Danh sách vật tư",rows[0],rows.slice(1));
}

function importMaterials(ev){
  const file=ev.target.files[0];
  if(!file)return;
  const reader=new FileReader();

  reader.onload=()=>{
    try{
      let imported=[];
      if(file.name.toLowerCase().endsWith(".json")){
        imported=JSON.parse(new TextDecoder("utf-8").decode(reader.result));
      }else{
        const rows=parseCSVText(decodeExcelFile(reader.result));
        imported=rows.slice(1).map(r=>({
          code:String(r[0]||"").trim(),
          supplier:String(r[1]||"").trim(),
          name:String(r[2]||"").trim(),
          spec:String(r[3]||"").trim(),
          qty:Number(r[4]||0),
          price:Number(r[5]||0),
          unit:String(r[6]||"Cái").trim(),
          area:String(r[7]||"").trim().toUpperCase(),
          image:penguinImage,
          reason:"",
          note:String(r[9]||"").trim(),
          createdAt:new Date().toISOString()
        })).filter(m=>m.code&&m.name);
      }

      const list=getMaterials();
      imported.forEach(m=>{
        const idx=list.findIndex(x=>x.code===m.code);
        if(idx>=0)list[idx]=m;else list.push(m);
        syncMaterialToEquipment(m);
      });
      setMaterials(list);
      alert("Đã nhập vật tư thành công.");
      renderEquipment("materials");
    }catch(err){
      console.error(err);
      alert("Không thể nhập vật tư.");
    }finally{
      ev.target.value="";
    }
  };

  reader.readAsArrayBuffer(file);
}

/* REPAIRS */
function renderRepairs(prefillCode=""){
  const eq=getEquipments().find(e=>e.code===prefillCode);
  equipmentInner.innerHTML=`
  <div class="panel">
    <div class="panel-head"><div><h2>Thông tin sửa chữa thiết bị</h2><p>Nhập mã vật tư/mã thiết bị để tạo phiếu sửa chữa.</p></div></div>
    <div style="padding:18px">
      <form id="repairForm" class="equip-form repair-form">
        <div class="repair-field"><label>Mã thiết bị *</label><input id="repairCode" value="${prefillCode||"1"}" required></div>
        <div class="repair-field"><label>Tên thiết bị</label><input id="repairName" value="${eq?.name||"1"}"></div>
        <div class="repair-field"><label>Ngày báo sửa</label><input id="repairDate" type="date" value="2026-09-15"></div>
        <div class="repair-field"><label>Người phụ trách</label><input id="repairOwner" placeholder="VD: Nguyễn Văn A"></div>
        <div class="repair-field"><label>Trạng thái sửa chữa</label><select id="repairStatus"><option>Chờ sửa</option><option>Đang sửa</option><option>Hoàn thành</option></select></div>
        <div class="repair-textarea"><label>Lỗi / Nội dung cần sửa</label><textarea id="repairIssue"></textarea></div>
        <div class="repair-textarea"><label>Ghi chú sửa chữa</label><textarea id="repairNote"></textarea></div>
        <div class="equip-form-actions"><button class="primary" type="submit">Thêm phiếu sửa chữa</button><button class="gray" type="reset">Làm mới</button></div>
      </form>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><div><h2>Danh sách sửa chữa thiết bị</h2></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>NO.</th><th>Mã thiết bị</th><th>Tên thiết bị</th><th>Ngày báo sửa</th><th>Lỗi / Nội dung sửa</th><th>Người phụ trách</th><th>Trạng thái</th><th>Ghi chú</th><th>Thao tác</th></tr></thead>
        <tbody id="repairBody"></tbody>
      </table>
    </div>
  </div>`;

  drawRepairs();
  repairCode.oninput=fillRepairNameByCode;
  repairForm.onsubmit=saveRepair;
}

function fillRepairNameByCode(){
  const code=repairCode.value.trim();
  const eq=getEquipments().find(e=>e.code===code);
  const mat=getMaterials().find(m=>m.code===code);
  repairName.value=eq?.name||mat?.name||"";
}

function saveRepair(ev){
  ev.preventDefault();
  const r={
    id:Date.now(),
    code:repairCode.value.trim(),
    name:repairName.value.trim(),
    date:repairDate.value,
    owner:repairOwner.value.trim(),
    status:repairStatus.value,
    issue:repairIssue.value.trim(),
    note:repairNote.value.trim()
  };

  const list=getRepairs();
  list.push(r);
  setRepairs(list);

  const eq=getEquipments();
  const item=eq.find(e=>e.code===r.code);
  if(item){
    item.repairStatus=r.status;
    setEquipments(eq);
  }

  renderEquipment("repairs");
}

function drawRepairs(){
  const list=getRepairs();
  repairBody.innerHTML=list.length?list.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><b style="color:#2563eb">${r.code}</b></td>
      <td><b>${r.name}</b></td>
      <td>${moneyDate(r.date)}</td>
      <td>${r.issue||""}</td>
      <td>${r.owner||""}</td>
      <td><span class="badge ${r.status==="Hoàn thành"?"green":r.status==="Đang sửa"?"yellow":"red"}">${r.status}</span></td>
      <td>${r.note||""}</td>
      <td>
        <button class="icon-btn edit-btn" onclick="completeRepair(${r.id})">✓</button>
        <button class="icon-btn delete-btn" onclick="deleteRepair(${r.id})">×</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="9" style="text-align:center">Chưa có phiếu sửa chữa</td></tr>`;
}

function completeRepair(id){
  const list=getRepairs();
  const r=list.find(x=>x.id===id);
  if(!r)return;
  r.status="Hoàn thành";
  setRepairs(list);

  const eq=getEquipments();
  const item=eq.find(e=>e.code===r.code);
  if(item){
    item.repairStatus="Bình thường";
    setEquipments(eq);
  }

  renderEquipment("repairs");
}

function deleteRepair(id){
  if(!confirm("Xóa phiếu sửa chữa này?"))return;
  setRepairs(getRepairs().filter(r=>r.id!==id));
  renderEquipment("repairs");
}

function openRepairWithEquipment(code){
  renderEquipment("repairs");
  setTimeout(()=>{
    const e=getEquipments().find(x=>x.code===code);
    repairCode.value=code;
    repairName.value=e?.name||"";
  },0);
}

/* IMPORT EXPORT BACKUP EMPLOYEES */
function exportEmployees(){
  const rows=[
    ["Mã số thẻ","Họ và tên","Ngày sinh","SĐT","CCCD","Chức vụ","Ca","Trạng thái","Khu vực","Chuyền"],
    ...getEmployees().map(e=>[e.card,e.name,e.dob,e.phone,e.cccd,e.role,e.shift,e.status,e.area,e.line])
  ];
  downloadXlsx("danh-sach-nhan-vien.xlsx","Danh sách nhân viên",rows[0],rows.slice(1));
}

function importEmployees(ev){
  const file=ev.target.files[0];
  if(!file)return;
  const reader=new FileReader();

  reader.onload=()=>{
    try{
      if(file.name.toLowerCase().endsWith(".json")){
        const data=JSON.parse(new TextDecoder("utf-8").decode(reader.result));
        if(data.employees)setEmployees(data.employees);
        if(data.users)setUsers(data.users);
        if(data.overtime)setOT(data.overtime);
        if(data.equipments)setEquipments(data.equipments);
        if(data.materials)setMaterials(data.materials);
        if(data.repairs)setRepairs(data.repairs);
        alert("Đã nhập dữ liệu JSON.");
        navigate("home");
        return;
      }

      const rows=parseCSVText(decodeExcelFile(reader.result));
      const imported=rows.slice(1).map(r=>({
        card:String(r[0]||"").trim().toUpperCase(),
        name:String(r[1]||"").trim().toUpperCase(),
        dob:String(r[2]||"").trim(),
        phone:String(r[3]||"").trim(),
        cccd:String(r[4]||"").trim(),
        role:String(r[5]||"NHÂN VIÊN").trim().toUpperCase(),
        shift:String(r[6]||"CA NGÀY").trim().toUpperCase(),
        status:String(r[7]||"ĐANG LÀM VIỆC").trim().toUpperCase(),
        area:String(r[8]||"").trim().toUpperCase(),
        line:String(r[9]||"").trim().toUpperCase(),
        avatar:defaultAvatar
      })).filter(e=>e.card&&e.name);

      if(!imported.length){
        alert("Không tìm thấy dữ liệu nhân viên hợp lệ.");
        return;
      }

      setEmployees(imported);

      const users=getUsers();
      imported.forEach(e=>{
        if(!users[e.card])users[e.card]={password:"123",completed:false};
      });
      setUsers(users);

      alert("Đã nhập dữ liệu Excel/CSV thành công.");
      navigate("home");
    }catch(err){
      console.error(err);
      alert("Không thể nhập dữ liệu.");
    }finally{
      ev.target.value="";
    }
  };

  reader.readAsArrayBuffer(file);
}

function backupData(){
  const data={
    employees:getEmployees(),
    users:getUsers(),
    overtime:getOT(),
    equipments:getEquipments(),
    materials:getMaterials(),
    repairs:getRepairs(),
    backupAt:new Date().toISOString()
  };
  download("sao-luu-cong-vu.json",JSON.stringify(data,null,2),"application/json");
}

/* MODAL */
function openModal(title,body){
  modalTitle.textContent=title;
  modalBody.innerHTML=body;
  modal.classList.remove("hidden");
  applyLanguage();
}

function closeModal(){
  modal.classList.add("hidden");
}


/* LANGUAGE: VIETNAMESE <-> CHINESE */
const LS_LANGUAGE = "cv_language_v1";

const VI_ZH = {
  "Công Vụ":"公务管理",
  "Quản lý nhân sự":"人事管理",
  "Đăng nhập hệ thống":"登录系统",
  "Lần đầu sử dụng: tài khoản là":"首次使用：账号为",
  "mã số thẻ":"员工卡号",
  "mật khẩu mặc định là":"默认密码为",
  "Đăng nhập":"登录",
  "Mã số thẻ / Mã nhân viên":"卡号 / 员工编号",
  "Nhập mật khẩu":"请输入密码",
  "Lưu mật khẩu trên máy này":"在此设备保存密码",
  "Quên mật khẩu?":"忘记密码？",
  "Cập nhật thông tin bắt buộc lần đầu":"首次必须更新信息",
  "Vui lòng hoàn tất thông tin cá nhân trước khi vào hệ thống.":"进入系统前请完成个人信息。",
  "Mã số thẻ":"卡号",
  "Họ và tên":"姓名",
  "Ngày tháng năm sinh":"出生日期",
  "Ngày sinh":"出生日期",
  "Số điện thoại":"电话号码",
  "CCCD":"身份证号",
  "Ảnh đại diện":"头像",
  "Mật khẩu mới":"新密码",
  "Nhập lại mật khẩu mới":"再次输入新密码",
  "Không được dùng 123":"不能使用123",
  "Lưu và vào hệ thống":"保存并进入系统",
  "Trang chủ":"首页",
  "Theo dõi tăng ca":"加班跟踪",
  "Trạng thái làm việc":"工作状态",
  "Trạng thái làm việc nhân viên":"员工工作状态",
  "Ca làm việc":"班次管理",
  "Quản lý đảo ca nhân viên":"员工倒班管理",
  "Cơ cấu tổ chức":"组织架构",
  "Khu vực làm việc":"工作区域",
  "Biểu đồ phân bố khu vực làm việc":"工作区域分布图",
  "Quản lý thiết bị":"设备管理",
  "QUẢN LÝ THIẾT BỊ":"设备管理",
  "Quản lý công vụ":"公务管理",
  "Bạn đang đăng nhập bằng quyền":"您当前登录权限为",
  "chỉnh sửa":"编辑",
  "Xuất nhân viên":"导出员工",
  "Nhập dữ liệu từ Excel":"从Excel导入数据",
  "Sao lưu dữ liệu":"备份数据",
  "Đăng xuất":"退出登录",
  "Tổng nhân viên":"员工总数",
  "Đang làm việc":"正在工作",
  "Nghỉ buổi":"半天休假",
  "Nghỉ cả ngày":"全天休假",
  "Tăng ca / Nghỉ tháng":"加班 / 月休",
  "Danh sách nhân viên":"员工列表",
  "Dữ liệu đồng bộ toàn hệ thống.":"全系统数据同步。",
  "Tìm mã, tên, SĐT, CCCD, khu vực...":"搜索卡号、姓名、电话、身份证号、区域...",
  "Tìm theo mã, tên, SĐT, CCCD, khu vực":"按卡号、姓名、电话、身份证号、区域搜索",
  "Tìm theo mã/tên":"按卡号/姓名搜索",
  "Tìm mã hoặc tên":"搜索卡号或姓名",
  "Thêm nhân viên":"+ 添加员工",
  "Sửa nhân viên":"编辑员工",
  "Thêm nhân viên":"添加员工",
  "Lưu nhân viên":"保存员工",
  "Làm mới":"重置",
  "Thao tác":"操作",
  "Ảnh":"照片",
  "Mã":"编号",
  "Chức vụ":"职位",
  "Ca":"班次",
  "Trạng thái":"状态",
  "Khu vực":"区域",
  "Chuyền":"产线",
  "Tăng ca":"加班",
  "Nghỉ tháng":"月休",
  "Theo dõi tăng ca":"加班跟踪",
  "Đồng bộ từ Trang chủ.":"与首页同步。",
  "Tháng Chín 2026":"2026年9月",
  "Chọn ngày nghỉ":"选择休息日",
  "Xóa ngày nghỉ":"删除休息日",
  "Chọn nhiều nhân viên nghỉ":"选择多名员工休假",
  "Ngày nghỉ":"休假日期",
  "Loại nghỉ":"休假类型",
  "N - Nghỉ cả ngày":"N - 全天休假",
  "S - Nghỉ sáng (0.5 ngày)":"S - 上午休假（0.5天）",
  "C - Nghỉ chiều (0.5 ngày)":"C - 下午休假（0.5天）",
  "Chọn tất cả":"全选",
  "Bỏ chọn tất cả":"取消全选",
  "Đã chọn:":"已选择：",
  "Lưu nghỉ cho nhân viên đã chọn":"保存已选择员工的休假",
  "Đã cập nhật":"已更新",
  "nhân viên nghỉ":"名员工休假",
  "Xóa dữ liệu tháng":"删除本月数据",
  "Số giờ tăng ca.":"加班小时数。",
  "Nghỉ sáng = 0.5 ngày.":"上午休假 = 0.5天。",
  "Nghỉ chiều = 0.5 ngày.":"下午休假 = 0.5天。",
  "Nghỉ cả ngày = 1 ngày.":"全天休假 = 1天。",
  "Trạng thái làm việc nhân viên":"员工工作状态",
  "Giờ làm hôm nay":"今日工作时数",
  "Hoàn thành công việc":"工作完成率",
  "Hoạt động":"活动",
  "Hiệu suất ổn định":"绩效稳定",
  "Xu hướng hiệu suất":"绩效趋势",
  "Hiệu suất tổng":"总体绩效",
  "Hôm nay":"今天",
  "Xem chu kỳ kế tiếp":"查看下一周期",
  "Xuất CSV":"导出CSV",
  "In lịch":"打印排班",
  "Khôi phục dữ liệu gốc":"恢复原始数据",
  "Chu kỳ đang xem":"当前周期",
  "Ngày đảo ca hiện tại":"当前倒班日期",
  "Đảo ca hệ thống lần tới":"下一次系统倒班",
  "Chu kỳ":"周期",
  "Thêm / sửa nhân viên":"添加 / 编辑员工",
  "Mã nhân viên":"员工编号",
  "Ca gốc từ ngày 07/09/2026":"自2026/09/07起始班次",
  "Thời gian đảo ca":"倒班时间",
  "Thời gian dự kiến đảo ca ban đầu":"初始预计倒班时间",
  "Dự kiến đảo ca":"预计倒班",
  "Ca sau đảo":"倒班后班次",
  "Bảng đảo ca & Danh sách chi tiết":"倒班表与详细名单",
  "Nguyên tắc đảo ca:":"倒班原则：",
  "Luân chuyển CA NGÀY ⇄ CA ĐÊM sau mỗi 14 ngày.":"每14天轮换白班 ⇄ 夜班。",
  "Ca hiện tại":"当前班次",
  "Cơ cấu tổ chức":"组织架构",
  "Phân nhóm theo chức vụ.":"按职位分组。",
  "Biểu đồ phân bố khu vực làm việc":"工作区域分布图",
  "Tỷ lệ phân bố":"分布比例",
  "Danh sách chi tiết nhân viên theo khu vực":"按工作区域划分的员工详细名单",
  "In danh sách":"打印名单",
  "Tất cả":"全部",
  "Tay cầm":"手柄",
  "Thân máy":"机身",
  "Driver":"驱动器",
  "Thiết bị":"设备",
  "Vật tư":"物料",
  "Thông tin vật tư":"物料信息",
  "Khi thêm vật tư sẽ tự cập nhật sang thiết bị.":"添加物料后将自动同步到设备。",
  "Mã vật tư":"物料编号",
  "Nhà cung cấp":"供应商",
  "Tên vật tư":"物料名称",
  "Quy cách":"规格",
  "Số lượng":"数量",
  "Đơn giá":"单价",
  "Đơn vị":"单位",
  "Ảnh vật tư":"物料图片",
  "Lý do xin mua":"申请购买原因",
  "Ghi chú":"备注",
  "Thêm vật tư":"添加物料",
  "Nhập Excel":"导入Excel",
  "Xuất Excel":"导出Excel",
  "Danh sách vật tư":"物料列表",
  "Tổng tiền":"总金额",
  "Lịch sử thiết bị":"设备历史",
  "Mã thiết bị":"设备编号",
  "Tên thiết bị":"设备名称",
  "Tổng lượt lấy":"领取总次数",
  "Lịch sử sửa chữa":"维修历史",
  "Chưa có lịch sử sửa chữa.":"暂无维修记录。",
  "QR thiết bị":"设备二维码",
  "QR demo dùng để nhận diện mã thiết bị.":"演示二维码用于识别设备编号。",
  "Mã sửa chữa":"维修编号",
  "Phiếu sửa chữa":"维修单",
  "Chưa có phiếu sửa chữa":"暂无维修单",
  "Hoàn thành":"已完成",
  "Đang sửa":"维修中",
  "Bình thường":"正常",
  "Cần sửa":"需要维修",
  "Không tìm thấy tài khoản.":"未找到账号。",
  "Mật khẩu không đúng.":"密码错误。",
  "Mật khẩu mới không được dùng 123.":"新密码不能使用123。",
  "Mật khẩu nhập lại không khớp.":"两次输入的密码不一致。",
  "Vui lòng chọn ảnh đại diện.":"请选择头像。",
  "Mã số thẻ đã tồn tại.":"卡号已存在。",
  "Xóa nhân viên này?":"确定删除该员工？",
  "Đã nhập dữ liệu Excel/CSV thành công.":"Excel/CSV数据导入成功。",
  "Không thể nhập dữ liệu.":"无法导入数据。",
  "Đã nhập dữ liệu JSON.":"JSON数据导入成功。",
  "Xóa dữ liệu tăng ca tháng?":"确定删除本月加班数据？",
  "Xóa vật tư này?":"确定删除该物料？",
  "Xóa phiếu sửa chữa này?":"确定删除该维修单？",
  "Cái":"个",
  "Bộ":"套",
  "Hộp":"盒",
  "Cuộn":"卷",
  "Kg":"公斤",
  "CA NGÀY":"白班",
  "CA ĐÊM":"夜班",
  "ĐANG LÀM VIỆC":"正在工作",
  "NGHỈ":"休假",
  "NHÂN VIÊN":"员工",
  "KỸ SƯ":"工程师",
  "TRỢ LÝ":"助理",
  "CÔNG NHÂN":"工人",
  "Chưa có vật tư":"暂无物料",
  "Chưa có dữ liệu":"暂无数据",
  "Không có dữ liệu phù hợp":"没有符合条件的数据",
  "Ngày":"白班",
  "Đêm":"夜班",
  "người":"人",
  "nhân viên":"员工",
  "giờ":"小时",
  "ngày":"天",
  "Thêm thiết bị":"添加设备",
  "Tổng thiết bị":"设备总数",
  "Tổng số lượng":"总数量",
  "Sắp hết hàng":"库存不足",
  "Tổng lượt lấy":"领取总次数",
  "Đang sửa chữa":"正在维修",
  "Sắp hết trước":"缺货优先",
  "Mới nhất":"最新",
  "Số lượng thấp":"数量低",
  "Số lượng cao":"数量高",
  "Cảnh báo chung dưới":"统一低库存警告",
  "Cài tất cả":"全部设置",
  "Cài đặt cảnh báo riêng dưới":"设置单独低库存警告",
  "Đủ tồn kho":"库存充足",
  "Mã thiết bị:":"设备编号：",
  "Tên thiết bị:":"设备名称：",
  "Nhà cung cấp:":"供应商：",
  "Serial/Quy cách:":"序列号/规格：",
  "Sửa chữa:":"维修：",
  "Số lượng hiện có:":"当前数量：",
  "Lịch sử":"历史记录",
  "QR":"二维码",
  "Sửa":"编辑",
  "Xóa":"删除",
  "Không có thiết bị.":"暂无设备。",
  "Mã thiết bị *":"设备编号 *",
  "Tên thiết bị *":"设备名称 *",
  "Nhà cung cấp":"供应商",
  "Serial/Quy cách":"序列号/规格",
  "Số lượng":"数量",
  "Cảnh báo dưới":"低于此数量时警告",
  "Trạng thái sửa chữa":"维修状态",
  "Chờ sửa":"待维修",
  "Đang sửa":"维修中",
  "Ảnh thiết bị":"设备图片",
  "Lưu thiết bị":"保存设备",
  "Lịch sử thiết bị":"设备历史",
  "Tên thiết bị":"设备名称",
  "Chưa có lịch sử sửa chữa.":"暂无维修历史。",
  "QR demo dùng để nhận diện mã thiết bị.":"演示二维码用于识别设备编号。",
  "Thông tin vật tư":"物料信息",
  "Khi thêm vật tư sẽ tự cập nhật sang thiết bị.":"添加物料后将自动同步到设备。",
  "Mã vật tư 料號 *":"物料编号 *",
  "Nhà cung cấp 供應商":"供应商",
  "Tên vật tư 品名 *":"物料名称 *",
  "Quy cách 規格":"规格",
  "Số lượng 數量":"数量",
  "Đơn giá 單價":"单价",
  "Đơn vị 單位":"单位",
  "Ảnh vật tư 圖片":"物料图片",
  "Lý do xin mua 请购原因":"申请购买原因",
  "Ghi chú 备注":"备注",
  "Nhập Excel":"导入Excel",
  "Danh sách vật tư":"物料列表",
  "Mã vật tư":"物料编号",
  "Tên vật tư":"物料名称",
  "Ảnh vật tư":"物料图片",
  "Chưa có vật tư":"暂无物料",
  "Tổng tiền":"总金额",
  "Thông tin sửa chữa thiết bị":"设备维修信息",
  "Nhập mã vật tư/mã thiết bị để tạo phiếu sửa chữa.":"请输入物料编号/设备编号以创建维修单。",
  "Mã thiết bị *":"待维修设备 / 输入设备编号或物料编号 *",
  "Ngày báo sửa":"报修日期",
  "Người phụ trách":"负责人",
  "Lỗi / Nội dung cần sửa":"故障 / 维修内容",
  "Lỗi / Nội dung sửa":"故障 / 维修内容",
  "Ghi chú sửa chữa":"维修备注",
  "Thêm phiếu sửa chữa":"添加维修单",
  "Danh sách sửa chữa thiết bị":"设备维修列表",
  "Mã sửa chữa":"维修编号",
  "Phiếu sửa chữa":"维修单",
  "Chưa có phiếu sửa chữa":"暂无维修单",
  "Đã hoàn thành":"已完成",
  "Cần sửa":"需要维修",
  "Số lượng thấp":"数量低",
  "⚠️ Sắp hết hàng":"⚠️ 库存不足",
  "Tổng lượt lấy:":"领取总次数：",
  "Tổng số lượng":"总数量",
  "Tổng thiết bị":"设备总数"
};

const ZH_VI = Object.fromEntries(Object.entries(VI_ZH).map(([vi,zh])=>[zh,vi]));

function language(){
  return localStorage.getItem(LS_LANGUAGE) || "vi";
}

function translateString(text, lang){
  if(!text || !text.trim()) return text;
  const dict = lang==="zh" ? ZH_VI : VI_ZH;
  const targetDict = lang==="zh" ? VI_ZH : ZH_VI;
  let out=text;
  // First handle exact matches.
  const exact = dict[text.trim()];
  if(exact) return text.replace(text.trim(), exact);
  // Then replace known phrases, longest first.
  Object.keys(dict).sort((a,b)=>b.length-a.length).forEach(k=>{
    if(out.includes(k)) out=out.split(k).join(dict[k]);
  });
  return out;
}

function applyLanguage(){
  const lang=language();
  document.documentElement.lang=lang==="zh"?"zh-CN":"vi";
  document.querySelectorAll("#languageSelect").forEach(s=>s.value=lang);

  // Normal text nodes.
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const parent=node.parentElement;
    if(!parent || ["SCRIPT","STYLE","INPUT","TEXTAREA"].includes(parent.tagName)) return;
    if(parent.closest("#languageSelect")) return;
    node.nodeValue=translateString(node.nodeValue,lang);
  });

  // Form option labels: keep their internal values unchanged so app logic continues to work.
  document.querySelectorAll("option").forEach(opt=>{
    const viValue=opt.value || opt.textContent.trim();
    if(lang==="zh"){
      opt.textContent=VI_ZH[viValue] || translateString(opt.textContent,"zh");
    }else{
      opt.textContent=ZH_VI[opt.textContent.trim()] || opt.textContent;
    }
  });

  // Common placeholders/titles.
  document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
    el.placeholder=translateString(el.placeholder,lang);
  });
  document.querySelectorAll("[title]").forEach(el=>{
    el.title=translateString(el.title,lang);
  });
}

function initLanguage(){
  const select=document.getElementById("languageSelect");
  if(!select)return;
  select.value=language();
  select.onchange=()=>{
    localStorage.setItem(LS_LANGUAGE,select.value);
    // Re-render current page so dynamic UI text is translated cleanly.
    const active=document.querySelector(".nav-item.active");
    if(active && document.getElementById("appScreen") && !document.getElementById("appScreen").classList.contains("hidden")){
      navigate(active.dataset.page);
    }else{
      applyLanguage();
    }
  };
  applyLanguage();
}

/* INIT */
seed();
initLogin();
initProfile();
initLanguage();

if(currentUser()){
  const users=getUsers();
  const card=currentUser();
  if(users[card]?.completed){
    openApp("home");
  }else{
    fillProfile(card);
    show("profileScreen");
  }
}else{
  show("loginScreen");
}