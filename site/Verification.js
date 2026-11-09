
const API_URL = 'https://campusgig-jf2e.onrender.com';

const user = JSON.parse(
  localStorage.getItem('campusgig-current-user') || '{}'
);

if (!user.id || !['student', 'employer'].includes(user.role)) {
  window.location.href = 'Login/Login Page.html';
  throw new Error('No valid CampusGig student/employer session.');
}

const role = user.role;

const page =
  role === 'employer'
    ? 'Employer Page/Employer.html'
    : 'Student Page/Student.html';

const $ = id => document.getElementById(id);

$('accountName').textContent = user.name || 'CampusGig user';
$('accountEmail').textContent = user.email || '-';

function api(path, options = {}) {
  return fetch(API_URL + path, {
    ...options,
    signal: options.signal || AbortSignal.timeout(15000),
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  }).then(async response => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'CampusGig server error.');
    }

    return data;
  });
}

function render(account) {
  user.emailVerified = !!account.emailVerified;
  user.verified = user.emailVerified;
  user.status = account.status || 'Active';

  localStorage.setItem(
    'campusgig-current-user',
    JSON.stringify(user)
  );

  $('emailStatus').textContent =
    user.emailVerified ? 'Verified' : 'Not Verified';

  const badge = $('emailBadge');

  badge.textContent = user.emailVerified
    ? 'Verified'
    : 'Not Verified';

  badge.className = `badge ${
    user.emailVerified ? 'yes' : 'no'
  }`;

  $('emailBox').style.display =
    user.emailVerified ? 'none' : 'block';

  const canContinue =
    user.status !== 'Suspended';

  $('continueBtn').disabled =
    !user.emailVerified || !canContinue;

  $('continueUnverifiedBtn').hidden =
    user.emailVerified || !canContinue;

  if (user.status === 'Suspended') {
    setMessage(
      'email',
      'This account has been suspended. Contact CampusGig support.'
    );

    $('emailBox').style.display = 'none';
    $('continueBtn').disabled = true;
    $('continueUnverifiedBtn').hidden = true;
  }
}

function setMessage(type, message, success = false) {
  const element = $(`${type}Message`);

  element.textContent = message;
  element.className =
    `message ${success ? 'success' : 'error'}`;
}

function setSending(sending) {
  const button = $('sendEmail');

  button.disabled = sending;
  button.textContent = sending
    ? 'Sending...'
    : 'Send email code';
}

async function sendEmail() {
  setSending(true);

  try {
    const data = await api('/api/verification/send', {
      method: 'POST',
      body: JSON.stringify({
        role,
        id: user.id,
        type: 'email'
      })
    });

    setMessage('email', data.message, true);

    sessionStorage.setItem(
      `campusgig-${role}-${user.id}-email-sent`,
      String(Date.now())
    );

  } catch (error) {
    setMessage(
      'email',
      error.name === 'TimeoutError' ||
      error.name === 'AbortError'
        ? 'The request timed out. Check the CampusGig server and try again.'
        : error.message
    );
  } finally {
    setSending(false);
  }
}

async function verifyEmail() {
  const code = $('emailCode').value.trim();

  if (!/^\d{6}$/.test(code)) {
    setMessage(
      'email',
      'Enter the 6-digit verification code.'
    );
    return;
  }

  const button = $('verifyEmail');
  button.disabled = true;

  try {
    const data = await api('/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify({
        role,
        id: user.id,
        type: 'email',
        code
      })
    });

    setMessage('email', data.message, true);

    $('emailCode').value = '';

    render(data.account);

  } catch (error) {
    setMessage(
      'email',
      error.name === 'TimeoutError' ||
      error.name === 'AbortError'
        ? 'Verification timed out. Please try again.'
        : error.message
    );
  } finally {
    button.disabled = false;
  }
}

async function load() {
  try {
    const data = await api(
      `/api/verification/status?role=${encodeURIComponent(role)}&id=${encodeURIComponent(user.id)}`
    );

    render(data.account);

  } catch (error) {
    setMessage(
      'email',
      error.name === 'TimeoutError' ||
      error.name === 'AbortError'
        ? 'CampusGig server timed out. Please try again.'
        : error.message
    );
  }
}

$('sendEmail').onclick = sendEmail;
$('verifyEmail').onclick = verifyEmail;

$('continueBtn').onclick = () => {
  if (
    user.emailVerified &&
    user.status !== 'Suspended'
  ) {
    window.location.href = page;
  }
};

$('continueUnverifiedBtn').onclick = () => {
  if (!user.emailVerified && user.status !== 'Suspended') {
    window.location.href = page;
  }
};

$('logoutBtn').onclick = () => {
  sessionStorage.clear();

  localStorage.removeItem('campusgig-current-user');

  window.location.href = 'Login/Login Page.html';
};

load();
