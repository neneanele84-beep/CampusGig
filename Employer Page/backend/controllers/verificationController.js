const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const studentsPath = path.join(__dirname, '../data/students.json');
const employersPath = path.join(__dirname, '../data/employers.json');

function readJson(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function getStore(role) {
  return role === 'employer' ? { file: employersPath } : { file: studentsPath };
}
function findAccount(role, identifier) {
  const { file } = getStore(role);
  const value = String(identifier || '').trim().toLowerCase();
  return readJson(file).find(account =>
    String(account.id) === value ||
    String(account.email || '').toLowerCase() === value
  );
}
function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    company: account.company || '',
    university: account.university || '',
    phone: account.phone || account.cell || '',
    emailVerified: !!account.emailVerified,
    verified: !!account.emailVerified,
    status: account.status || 'Active'
  };
}
function makeCode() {
  return String(crypto.randomInt(100000, 1000000));
}
function ensureFields(account) {
  if (typeof account.emailVerified !== 'boolean') account.emailVerified = false;
  if (!account.status) account.status = 'Active';
  // Only email verification is used for account access.
}
async function sendEmailCode(account, code) {
  const message = `Your CampusGig verification code is ${code}. It expires in 10 minutes.`;

  if (process.env.RESEND_API_KEY && (process.env.RESEND_FROM || process.env.EMAIL_FROM)) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          from: process.env.RESEND_FROM || process.env.EMAIL_FROM,
          to: [account.email],
          subject: 'CampusGig Verification Code',
          text: message
        })
      });
      if (response.ok) return true;
      const providerMessage = await response.text().catch(() => '');
      console.error(`[CampusGig email] Resend rejected request (${response.status}): ${providerMessage.slice(0, 500)}`);
    } catch (error) {
      console.error(`[CampusGig email] Resend request failed: ${error.name || 'Error'}: ${error.message || 'unknown error'}`);
    }
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[CampusGig email] Resend did not send and SMTP fallback is not configured. Check RESEND_API_KEY and EMAIL_FROM/RESEND_FROM.');
    return false;
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: account.email,
      subject: 'CampusGig Verification Code',
      text: message
    });
    return true;
  } catch (error) {
    console.error(`[CampusGig email] SMTP delivery failed: ${error.message || 'unknown error'}`);
    return false;
  }
}
async function sendVerification(req, res) {
  try {
    const role = req.body.role === 'employer' ? 'employer' : 'student';
    const { file } = getStore(role);
    const accounts = readJson(file);
    const identifier = String(req.body.id || req.body.email || '').trim().toLowerCase();
    const index = accounts.findIndex(account =>
      String(account.id) === identifier ||
      String(account.email || '').toLowerCase() === identifier
    );
    if (index < 0) return res.status(404).json({ success: false, message: 'Account not found' });

    const account = accounts[index];
    ensureFields(account);
    if (account.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended.' });
    }
    if (account.emailVerified) {
      return res.json({ success: true, sent: false, message: 'Email is already verified.', account: publicAccount(account) });
    }

    account.verification = account.verification || {};
    const previous = account.verification.email;
    if (previous && previous.sentAt && Date.now() - previous.sentAt < 30000) {
      const seconds = Math.ceil((30000 - (Date.now() - previous.sentAt)) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${seconds} seconds before requesting another code.` });
    }

    const code = makeCode();
    account.verification.email = {
      codeHash: crypto.createHash('sha256').update(code).digest('hex'),
      expiresAt: Date.now() + 10 * 60 * 1000,
      sentAt: Date.now()
    };
    saveJson(file, accounts);

    const sent = await sendEmailCode(account, code);
    if (!sent) {
      if (process.env.NODE_ENV === 'development' && process.env.DEV_OTP_MODE === 'true') {
        console.warn(`[CampusGig DEV OTP] email code for ${account.email}: ${code}`);
        return res.json({ success: true, sent: false, developmentMode: true, message: 'Provider delivery is unavailable. A development-only code was printed in the backend terminal.' });
      }
      delete account.verification.email;
      saveJson(file, accounts);
      return res.status(503).json({ success: false, message: 'Email delivery is not configured or the email provider rejected the request. Check the Resend/SMTP settings.' });
    }
    return res.json({ success: true, sent: true, message: 'Verification code sent to your email address.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not send verification code.' });
  }
}
function verify(req, res) {
  try {
    const role = req.body.role === 'employer' ? 'employer' : 'student';
    const { file } = getStore(role);
    const accounts = readJson(file);
    const identifier = String(req.body.id || req.body.email || '').trim().toLowerCase();
    const index = accounts.findIndex(account =>
      String(account.id) === identifier ||
      String(account.email || '').toLowerCase() === identifier
    );
    if (index < 0) return res.status(404).json({ success: false, message: 'Account not found' });

    const account = accounts[index];
    ensureFields(account);
    if (account.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended.' });
    }
    const entry = account.verification?.email;
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Enter the 6-digit email verification code.' });
    }
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    if (!entry || entry.expiresAt < Date.now() || entry.codeHash !== hash) {
      return res.status(400).json({ success: false, message: 'Invalid or expired email verification code.' });
    }
    account.emailVerified = true;
    if (account.verification) {
      delete account.verification.email;
      if (!Object.keys(account.verification).length) delete account.verification;
    }
    saveJson(file, accounts);
    return res.json({ success: true, message: 'Email verified successfully.', account: publicAccount(account) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not verify email address.' });
  }
}
function status(req, res) {
  const role = req.query.role === 'employer' ? 'employer' : 'student';
  const account = findAccount(role, req.query.id || req.query.email);
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  ensureFields(account);
  res.json({ success: true, account: publicAccount(account) });
}
module.exports = { sendVerification, verify, status, publicAccount, readJson, saveJson, getStore, ensureFields };
