const crypto = require('crypto');

const SECURITY_QUESTIONS = [
  { id: 'first_school', question: 'What was the name of your first school?' },
  { id: 'first_pet', question: 'What was the name of your first pet?' },
  { id: 'birth_city', question: 'In which city were you born?' },
  { id: 'childhood_friend', question: 'What was the first name of a childhood friend?' },
  { id: 'first_teacher', question: 'What was the surname of a teacher you remember?' }
];

function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function isAllowedEmail(value) {
  const email = normalizeEmail(value);
  const match = email.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i);
  if (!match) return false;
  return true;
}
function validName(value) { return typeof value === 'string' && /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(value.trim()); }
function validPhone(value) {
  const phone = String(value || '').replace(/[\s()-]/g, '');
  return /^(?:\+27\d{9}|0\d{9}|\+[1-9]\d{7,14})$/.test(phone);
}
function passwordIssue(value) {
  return typeof value === 'string' && value.length > 0 ? '' : 'Password is required.';
}
function hashSecret(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(value), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifySecret(value, encoded) {
  if (typeof encoded !== 'string' || !encoded.startsWith('scrypt$')) return false;
  const [, salt, expectedHex] = encoded.split('$');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(String(value), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function normalizeAnswer(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function publicAccount(account) {
  return {
    id: account.id, name: account.name, email: account.email,
    company: account.company || '', university: account.university || '',
    phone: account.phone || account.cell || '',
    emailVerified: !!account.emailVerified,
    verified: !!account.emailVerified,
    firstName: account.firstName || '', surname: account.surname || '', dateOfBirth: account.dateOfBirth || '', age: account.age ?? '', houseNumber: account.houseNumber || '', streetName: account.streetName || '', suburb: account.suburb || '', cityTown: account.cityTown || '', postalCode: account.postalCode || '', province: account.province || '', country: account.country || '', gender: account.gender || '', languages: account.languages || [],
    status: account.status || 'Active', securityQuestionSet: !!(account.securityQuestionId && account.securityAnswerHash)
  };
}
module.exports = { SECURITY_QUESTIONS, normalizeEmail, isAllowedEmail, validName, validPhone, passwordIssue, hashSecret, verifySecret, normalizeAnswer, publicAccount };
