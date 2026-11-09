const { isAllowedEmail, validPhone } = require('./authSecurity');
function ageFromDob(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const birth = new Date(0);
  birth.setUTCFullYear(year, month - 1, day);
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;

  const now = new Date();
  const currentYear = now.getFullYear(), currentMonth = now.getMonth() + 1, currentDay = now.getDate();
  if (year > currentYear || (year === currentYear && (month > currentMonth || (month === currentMonth && day > currentDay)))) return null;
  let age = currentYear - year;
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age--;
  return age;
}
function validateProfile(data, role) {
  const required = ['firstName','surname','dateOfBirth','email','phone','houseNumber','streetName','suburb','cityTown','postalCode','province','country','gender'];
  for (const key of required) if (!String(data[key] ?? '').trim()) return `Please provide ${key}.`;
  if (!/^[\p{L}][\p{L}\p{M}' -]{1,49}$/u.test(String(data.firstName).trim())) return 'Enter a valid first name.';
  if (!/^[\p{L}][\p{L}\p{M}' -]{1,59}$/u.test(String(data.surname).trim())) return 'Enter a valid surname.';
  const age = ageFromDob(data.dateOfBirth);
  if (age === null || (role === 'student' ? age < 17 : age < 0 || age > 120)) return role === 'student' ? 'Students must be at least 17 years old.' : 'Date of birth must be valid and the calculated age must be between 0 and 120.';
  if (!isAllowedEmail(data.email)) return 'Use a valid Gmail or Outlook email address.';
  if (!validPhone(data.phone)) return 'Enter a valid phone number.';
  if (!/^\d{4}$/.test(String(data.postalCode))) return 'Postal code must contain exactly four digits.';
  const areas = ['Richards Bay','Empangeni','Esikhaleni','Ngwelezane','Nseleni','Felixton','KwaMbonambi'];
  if (!areas.includes(data.cityTown) && !(data.otherArea && String(data.otherArea).trim().length >= 2)) return 'Choose a supported nearby area or specify another nearby area.';
  if (!['KwaZulu-Natal','Eastern Cape','Free State','Gauteng','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'].includes(data.province)) return 'Choose a valid South African province.';
  if (data.country !== 'South Africa') return 'Country must be South Africa.';
  if (!['Male','Female'].includes(data.gender) && !/^Custom: .{2,50}$/.test(data.gender)) return 'Choose Male, Female, or describe a custom gender.';
  if (!Array.isArray(data.languages) || data.languages.length < 1 || data.languages.some(x => typeof x !== 'string' || x.length > 40)) return 'Select at least one language.';
  if (role === 'student' && String(data.university || '').trim().length < 2) return 'Enter a valid university.';
  if (role === 'employer' && String(data.company || '').trim().length < 2) return 'Enter a valid business or organisation name.';
  return null;
}
function profileFields(data) {
  const age = ageFromDob(data.dateOfBirth);
  return { firstName:String(data.firstName).trim(), surname:String(data.surname).trim(), name:`${String(data.firstName).trim()} ${String(data.surname).trim()}`, dateOfBirth:data.dateOfBirth, age, email:String(data.email).trim().toLowerCase(), phone:String(data.phone).trim(), houseNumber:String(data.houseNumber).trim(), streetName:String(data.streetName).trim(), suburb:String(data.suburb).trim(), cityTown:String(data.cityTown).trim(), postalCode:String(data.postalCode).trim(), province:data.province, country:data.country, gender:String(data.gender).trim(), languages:data.languages, university:String(data.university || '').trim(), company:String(data.company || '').trim(), otherArea:String(data.otherArea || '').trim() };
}
module.exports = { ageFromDob, validateProfile, profileFields };
