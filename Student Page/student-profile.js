(() => {
  const user = JSON.parse(localStorage.getItem('campusgig-current-user') || '{}');
  if (!user.id || user.role !== 'student') return;
  document.getElementById('student-logout-btn')?.addEventListener('click', () => {
    sessionStorage.clear();
    localStorage.removeItem('campusgig-current-user');
    window.location.href = '../Login/Login Page.html';
  });
  const API = 'https://campusgig-jf2e.onrender.com/api/students/profile';
  const link = document.querySelector('.edit-profile-btn');
  if (!link) return;
  link.href = '#edit-profile';
  const modal = document.createElement('section');
  modal.id = 'student-profile-editor';
  modal.hidden = true;
  modal.innerHTML = `<div class="student-profile-card"><button type="button" id="student-profile-close" aria-label="Close">×</button><h2>Edit student profile</h2><form id="student-profile-form" class="student-profile-grid">
    <label>First name<input name="firstName" required minlength="2"></label><label>Surname<input name="surname" required minlength="2"></label>
    <label>Date of birth<input name="dateOfBirth" type="date" required></label><label>Age (automatic)<input name="age" type="number" readonly></label>
    <label>Email<input name="email" type="email" required></label><label>Phone<input name="phone" type="tel" required></label>
    <label>House number<input name="houseNumber" required></label><label>Street name<input name="streetName" required></label>
    <label>Suburb<input name="suburb" required></label><label>City / town<select name="cityTown" required><option>Richards Bay</option><option>Empangeni</option><option>Esikhaleni</option><option>Ngwelezane</option><option>Nseleni</option><option>Felixton</option><option>KwaMbonambi</option><option>Other nearby area</option></select></label><label>Other nearby area (if selected)<input name="otherArea"></label>
    <label>Postal code<input name="postalCode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label><label>Province<select name="province" required><option>KwaZulu-Natal</option><option>Eastern Cape</option><option>Free State</option><option>Gauteng</option><option>Limpopo</option><option>Mpumalanga</option><option>Northern Cape</option><option>North West</option><option>Western Cape</option></select></label>
    <label>Country<input name="country" value="South Africa" readonly></label><label>Gender<input name="gender" required></label>
    <label>Languages (comma separated)<input name="languages" required></label><label>University<input name="university" required></label>
    <p class="student-profile-message" id="student-profile-message" role="status"></p><button type="submit">Save changes</button></form></div>`;
  document.body.appendChild(modal);
  const style = document.createElement('style');
  style.textContent = `#student-profile-editor{position:fixed;inset:0;z-index:9999;background:#0009;display:grid;place-items:center;padding:16px;overflow:auto}#student-profile-editor[hidden]{display:none}.student-profile-card{background:#fff;color:#172033;width:min(760px,100%);max-height:94vh;overflow:auto;border-radius:18px;padding:24px;position:relative}.student-profile-card>button:first-child{position:absolute;right:16px;top:10px}.student-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.student-profile-grid label{display:grid;gap:5px;font-size:13px}.student-profile-grid input,.student-profile-grid select{padding:10px;border:1px solid #ccd2dc;border-radius:8px;min-width:0}.student-profile-grid button,.student-profile-card>button{padding:10px 16px;cursor:pointer}.student-profile-message{grid-column:1/-1}@media(max-width:600px){.student-profile-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  const form = modal.querySelector('form');
  const field = name => form.elements[name];
  function calcAge(value) { if (!value) return ''; const d=new Date(value+'T00:00:00'),t=new Date();let n=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))n--;return n; }
  field('dateOfBirth').max = new Date().toISOString().slice(0,10);
  field('dateOfBirth').addEventListener('change',()=>{const n=calcAge(field('dateOfBirth').value);field('age').value=n;field('dateOfBirth').setCustomValidity(n<17?'Students must be at least 17 years old.':'');});
  async function load() {
    const r=await fetch(`${API}?id=${encodeURIComponent(user.id)}`);const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not load profile');
    const p=d.student;['firstName','surname','dateOfBirth','email','phone','houseNumber','streetName','suburb','cityTown','otherArea','postalCode','province','country','gender','university'].forEach(k=>{field(k).value=p[k]||'';});
    field('otherArea').value=p.otherArea||'';field('age').value=p.age??calcAge(p.dateOfBirth);field('languages').value=Array.isArray(p.languages)?p.languages.join(', '):'';
  }
  link.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();modal.hidden=false;try{await load();}catch(err){modal.querySelector('#student-profile-message').textContent=err.message;}});
  modal.querySelector('#student-profile-close').addEventListener('click',()=>modal.hidden=true);
  form.addEventListener('submit',async e=>{e.preventDefault();const payload={id:user.id};['firstName','surname','dateOfBirth','email','phone','houseNumber','streetName','suburb','cityTown','otherArea','postalCode','province','country','gender','university'].forEach(k=>payload[k]=field(k).value.trim());payload.name=payload.firstName+' '+payload.surname;payload.age=calcAge(payload.dateOfBirth);if(!Number.isInteger(payload.age)||payload.age<17){modal.querySelector('#student-profile-message').textContent='Students must be at least 17 years old.';return;}payload.otherArea=field('otherArea').value.trim();payload.languages=field('languages').value.split(',').map(x=>x.trim()).filter(Boolean);
    try{const r=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not update profile');const updated=d.student;localStorage.setItem('campusgig-current-user',JSON.stringify({...user,name:updated.name,email:updated.email,university:updated.university,phone:updated.phone}));document.querySelectorAll('.username,.profile-username').forEach(x=>x.textContent=updated.name);document.querySelectorAll('.profile-email').forEach(x=>x.textContent=updated.email);modal.querySelector('#student-profile-message').textContent='Profile updated successfully.';setTimeout(()=>modal.hidden=true,900);}catch(err){modal.querySelector('#student-profile-message').textContent=err.message;}
  });
})();
