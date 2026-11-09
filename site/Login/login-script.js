const API_URL = 'https://campusgig-jf2e.onrender.com';
const STUDENT_PAGE = '../Student Page/Student.html';
const EMPLOYER_PAGE = '../Employer Page/Employer.html';
const VERIFICATION_PAGE = '../Verification.html';
let passwordResetToken = '';
let resetQuestionLoaded = false;
let pendingLogin = null;

// Read the role and action selected on the homepage and preselect the matching account type.
function applyHomepageIntent() {
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get('role');
  const intent = params.get('intent');
  const roleSelect = document.getElementById('login-role');
  const intentText = document.getElementById('login-intent');

  if (roleSelect && ['student', 'employer'].includes(requestedRole)) {
    roleSelect.value = requestedRole;
  }
  if (intentText) {
    if (intent === 'browse' || requestedRole === 'student') {
      intentText.textContent = 'Log in or create a student account to browse and apply for gigs.';
    } else if (intent === 'post' || requestedRole === 'employer') {
      intentText.textContent = 'Log in or create an employer account to post and manage gigs.';
    }
  }
}

function showSection(name) {
  ['login-view','student-register','employer-register','forgot-view','security-setup-view'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const target = ({login:'login-view',student:'student-register',employer:'employer-register',forgot:'forgot-view',setup:'security-setup-view'})[name];
  if (target) document.getElementById(target).style.display = 'block';
  if (name !== 'forgot') resetForgotFlow();
}
function showMessage(message, isSuccess = true) {
  const studentView=document.getElementById('student-register');
  const employerView=document.getElementById('employer-register');
  const target=studentView && studentView.style.display!=='none' ? 'student-message' : employerView && employerView.style.display!=='none' ? 'employer-message' : 'login-message';
  const msg=document.getElementById(target);
  if(msg){msg.textContent=message;msg.className=`message ${isSuccess?'success':'error'}`;}
}
function showForgotMessage(message, isSuccess = false) {
  const msg = document.getElementById('forgot-message');
  if (msg) { msg.textContent = message; msg.className = `message ${isSuccess ? 'success' : 'error'}`; }
}
function resetForgotFlow() {
  passwordResetToken = ''; resetQuestionLoaded = false;
  const q=document.getElementById('reset-question-text'); if(q)q.textContent='';
  const answer=document.getElementById('reset-answer'); if(answer){answer.value='';answer.style.display='none';}
  const verify=document.getElementById('verify-security-answer');if(verify)verify.style.display='none';
  const pass=document.getElementById('forgot-step-password');if(pass)pass.style.display='none';
  const first=document.getElementById('forgot-step-question');if(first)first.style.display='block';
  const msg=document.getElementById('forgot-message');if(msg)msg.textContent='';
}
async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'CampusGig server error');
  return data;
}
function saveCurrentUser(role, user) {
  sessionStorage.clear();
  const currentUser = {
    id:user.id, role, name:user.name, email:user.email, company:user.company||'',
    university:user.university||'', phone:user.phone||user.cell||'',
    emailVerified:!!user.emailVerified,
    verified:!!user.verified, status:user.status||'Active'
  };
  localStorage.setItem('campusgig-current-user', JSON.stringify(currentUser));
  return currentUser;
}
function validAllowedEmail(value) {
  const email=String(value||'').trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email);
}
function validPhone(value) { return /^\+27\d{9}$/.test(String(value || '')); }
function validPassword(value) { return typeof value === 'string' && value.length > 0; }
function registrationError(message, field) {
  const error = new Error(message);
  error.field = field;
  return error;
}
function validateRegistration(payload) {
  if (!/^[\p{L}][\p{L}\p{M}' -]{1,49}$/u.test(payload.firstName)) throw registrationError('Enter a valid first name.', 'first-name');
  if (!/^[\p{L}][\p{L}\p{M}' -]{1,59}$/u.test(payload.surname)) throw registrationError('Enter a valid surname.', 'surname');
  if (!payload.dateOfBirth || !Number.isInteger(payload.age) || payload.age < (payload.role === 'student' ? 17 : 0) || (payload.role === 'employer' && payload.age > 120)) throw registrationError(payload.role === 'student' ? 'Students must be at least 17 years old. Your age is calculated from your date of birth.' : 'Enter a valid date of birth; age is calculated automatically.', 'dob');
  if (!validAllowedEmail(payload.email)) throw registrationError('Enter a valid email address.', 'email');
  if (!validPhone(payload.phone)) throw registrationError('Enter the 9-digit contact number after +27.', 'phone');
  const fieldFor = {houseNumber:'house-number',streetName:'street-name',suburb:'suburb',cityTown:'city',postalCode:'postal-code',province:'province',country:'country',gender:'gender'};
  for (const key of Object.keys(fieldFor)) if (!String(payload[key] || '').trim()) throw registrationError('Complete all address and personal information fields.', fieldFor[key]);
  if (!/^\d{4}$/.test(payload.postalCode)) throw registrationError('Postal code must contain exactly four digits.', 'postal-code');
  if (payload.cityTown === 'Other nearby area' && (!payload.otherArea || payload.otherArea.trim().length < 2)) throw registrationError('Please specify your nearby area.', 'other-area');
  if (payload.gender.startsWith('Custom: ') && (!payload.customGender || payload.customGender.trim().length < 2)) throw registrationError('Please describe your gender selection.', 'custom-gender');
  if (!Array.isArray(payload.languages) || !payload.languages.length) throw registrationError('Select at least one language you speak.', 'languages');
  if (payload.role === 'student' && (!payload.university || payload.university.trim().length < 2)) throw registrationError('Enter your university.', 'university');
  if (payload.role === 'employer' && (!payload.company || payload.company.trim().length < 2)) throw registrationError('Enter your business or organisation name.', 'company');
  if (!validPassword(payload.password)) throw registrationError('Enter a password.', 'password');
  if (payload.password !== payload.confirmPassword) throw registrationError('Passwords do not match.', 'confirm-password');
  if (!payload.securityQuestion) throw registrationError('Choose a security question and provide your answer.', 'security-question');
  if (!payload.securityAnswer || payload.securityAnswer.trim().length < 2) throw registrationError('Choose a security question and provide your answer.', 'security-answer');
}
function showRegistrationError(prefix, error) {
  showMessage(error.message || 'Could not create account.', false);
  if (!error.field) return;
  const field = document.getElementById(`${prefix}-${error.field}`);
  if (!field || field.hidden) return;
  field.scrollIntoView({ behavior:'smooth', block:'center' });
  field.focus({ preventScroll:true });
}
function calculateAge(dob) {
  if (!dob) return '';
  const birth = new Date(`${dob}T00:00:00`), today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) return '';
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}
function readRegistration(prefix, role) {
  const value = id => document.getElementById(`${prefix}-${id}`)?.value.trim() || '';
  const languages = [...document.querySelectorAll(`#${prefix}-languages input[name="languages"]:checked`)].map(input => input.value);
  const payload = { role, firstName:value('first-name'), surname:value('surname'), name:`${value('first-name')} ${value('surname')}`.trim(), dateOfBirth:value('dob'), age:calculateAge(value('dob')), email:value('email'), phone:`+27${value('phone')}`, houseNumber:value('house-number'), streetName:value('street-name'), suburb:value('suburb'), cityTown:value('city'), otherArea:value('other-area'), postalCode:value('postal-code'), province:value('province'), country:value('country'), gender:value('gender') === 'Custom' ? `Custom: ${value('custom-gender')}` : value('gender'), customGender:value('custom-gender'), languages, university:value('university'), company:value('company'), password:value('password'), confirmPassword:value('confirm-password'), securityQuestion:value('security-question'), securityAnswer:value('security-answer') };
  return payload;
}
function setupRegistration(prefix) {
  const dob = document.getElementById(`${prefix}-dob`), age = document.getElementById(`${prefix}-age`);
  const gender = document.getElementById(`${prefix}-gender`), customGender = document.getElementById(`${prefix}-custom-gender`);
  const city = document.getElementById(`${prefix}-city`), otherArea = document.getElementById(`${prefix}-other-area`);
  dob.max = new Date().toISOString().slice(0,10);
  dob.addEventListener('change', () => { const n = calculateAge(dob.value); age.value = n === '' ? '' : n; dob.setCustomValidity(n === '' ? 'Choose a valid date that is not in the future.' : prefix === 'student' && n < 17 ? 'Students must be at least 17 years old.' : n < 0 ? 'Enter a valid date of birth.' : ''); });
  gender.addEventListener('change', () => { customGender.hidden = gender.value !== 'Custom'; customGender.required = gender.value === 'Custom'; if (!customGender.required) customGender.value=''; });
  city.addEventListener('change', () => { otherArea.hidden = city.value !== 'Other nearby area'; otherArea.required = city.value === 'Other nearby area'; if (!otherArea.required) otherArea.value=''; });
  const postal = document.getElementById(`${prefix}-postal-code`); postal.addEventListener('input', () => postal.value = postal.value.replace(/\D/g,'').slice(0,4));
  const phone = document.getElementById(`${prefix}-phone`); phone.addEventListener('input', () => phone.value = phone.value.replace(/\D/g,'').slice(0,9));
}
setupRegistration('student'); setupRegistration('employer');
function completeLogin(role,user) { saveCurrentUser(role,user); const verified=!!user.emailVerified; window.location.href=verified?(role==='student'?STUDENT_PAGE:EMPLOYER_PAGE):VERIFICATION_PAGE; }
async function login() {
  const identifier=document.getElementById('login-identifier').value.trim();
  const password=document.getElementById('login-password').value;
  if (!validAllowedEmail(identifier)) { showMessage('Enter a valid valid email address.',false); return; }
  try {
    const role=document.getElementById('login-role').value;
    const result=await api(role==='student'?'/api/students/login':'/api/employers/login',{method:'POST',body:JSON.stringify({email:identifier,password})});
    const user=role==='student'?result.student:result.employer;
    if(user.status==='Suspended'){showMessage('This account has been suspended. Please contact CampusGig support.',false);return;}
    if (!user.securityQuestionSet) { pendingLogin={role,user}; document.getElementById('setup-email').value=user.email; showSection('setup'); document.getElementById('setup-message').textContent='Please set a security question to enable password recovery.'; return; }
    completeLogin(role,user);
  } catch(error) { showMessage(error.message||'Invalid email or password.',false); }
}
applyHomepageIntent();

document.getElementById('login-form').addEventListener('submit',async e=>{e.preventDefault();await login();});

for (const [role, prefix, formId, endpoint] of [['student','student','student-form','/api/students/register'],['employer','employer','employer-form','/api/employers/register']]) {
  document.getElementById(formId).addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const payload = readRegistration(prefix, role);
      payload.password = document.getElementById(`${prefix}-password`).value;
      payload.confirmPassword = document.getElementById(`${prefix}-confirm-password`).value;
      payload.securityQuestion = document.getElementById(`${prefix}-security-question`).value;
      payload.securityAnswer = document.getElementById(`${prefix}-security-answer`).value;
      validateRegistration(payload);
      const data = await api(endpoint, { method:'POST', body:JSON.stringify(payload) });
      saveCurrentUser(role, role === 'student' ? data.student : data.employer);
      window.location.href = VERIFICATION_PAGE;
    } catch (error) { showRegistrationError(prefix, error); }
  });
}

document.getElementById('save-security-setup').addEventListener('click',async()=>{
  if(!pendingLogin){document.getElementById('setup-message').textContent='Please log in again to continue.';return;}
  const password=document.getElementById('setup-password').value;const securityQuestion=document.getElementById('setup-security-question').value;const securityAnswer=document.getElementById('setup-security-answer').value;
  if(!password||!securityQuestion||securityAnswer.trim().length<2){document.getElementById('setup-message').textContent='Complete all fields.';return;}
  try{await api('/api/password/setup-security',{method:'POST',body:JSON.stringify({role:pendingLogin.role,email:pendingLogin.user.email,password,securityQuestion,securityAnswer})});const info=pendingLogin;pendingLogin=null;completeLogin(info.role,info.user);}
  catch(error){document.getElementById('setup-message').textContent=error.message;}
});

const loadQuestionButton=document.getElementById('load-security-question');
loadQuestionButton.addEventListener('click',async()=>{
  const role=document.getElementById('reset-role').value;const email=document.getElementById('reset-email').value.trim();
  if(!validAllowedEmail(email)){showForgotMessage('Enter the registered Email address.');return;}
  try{const data=await api(`/api/password/security-question?role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`);document.getElementById('reset-question-text').textContent=data.question;document.getElementById('reset-answer').style.display='block';document.getElementById('verify-security-answer').style.display='block';resetQuestionLoaded=true;showForgotMessage('Answer your security question to continue.',true);}
  catch(error){showForgotMessage(error.message);}
});
document.getElementById('verify-security-answer').addEventListener('click',async()=>{
  if(!resetQuestionLoaded)return;const role=document.getElementById('reset-role').value;const email=document.getElementById('reset-email').value.trim();const answer=document.getElementById('reset-answer').value;
  if(!answer.trim()){showForgotMessage('Enter your security answer.');return;}
  try{const data=await api('/api/password/verify-answer',{method:'POST',body:JSON.stringify({role,email,answer})});passwordResetToken=data.resetToken;document.getElementById('forgot-step-question').style.display='none';document.getElementById('forgot-step-password').style.display='block';showForgotMessage('Security answer confirmed. Choose a new password.',true);}
  catch(error){showForgotMessage(error.message);}
});
document.getElementById('save-new-password').addEventListener('click',async()=>{
  const role=document.getElementById('reset-role').value;const email=document.getElementById('reset-email').value.trim();const password=document.getElementById('reset-new-password').value;const confirmPassword=document.getElementById('reset-confirm-password').value;
  if(!passwordResetToken){showForgotMessage('Your reset session is missing. Start again.');return;}
  if(!validPassword(password)){showForgotMessage('Enter a password.');return;}
  if(password!==confirmPassword){showForgotMessage('Passwords do not match.');return;}
  try{const data=await api('/api/password/reset',{method:'POST',body:JSON.stringify({role,email,resetToken:passwordResetToken,password,confirmPassword})});passwordResetToken='';showForgotMessage(data.message,true);document.getElementById('forgot-step-password').style.display='none';setTimeout(()=>showSection('login'),1400);}
  catch(error){showForgotMessage(error.message);}
});
