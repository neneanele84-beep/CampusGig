const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const output = path.join(root, 'site');
const files = [
  ['Homepage.html', 'Homepage.html'],
  ['Homepage.html', 'index.html'],
  ['mystyle.css', 'mystyle.css'],
  ['Verification.html', 'Verification.html'],
  ['Verification.css', 'Verification.css'],
  ['Verification.js', 'Verification.js'],
  ['Login/Login Page.html', 'Login/Login Page.html'],
  ['Login/login-script.js', 'Login/login-script.js'],
  ['Login/login-style.css', 'Login/login-style.css'],
  ['Student Page/Student.html', 'Student Page/Student.html'],
  ['Student Page/student.js', 'Student Page/student.js'],
  ['Student Page/student.css', 'Student Page/student.css'],
  ['Student Page/student-profile.js', 'Student Page/student-profile.js'],
  ['Student Page/active-gigs.js', 'Student Page/active-gigs.js'],
  ['Student Page/application page.html', 'Student Page/application page.html'],
  ['Employer Page/Employer.html', 'Employer Page/Employer.html'],
  ['Employer Page/Employer.css', 'Employer Page/Employer.css'],
  ['Employer Page/employer-profile.js', 'Employer Page/employer-profile.js']
];

fs.rmSync(output, { recursive: true, force: true });

for (const [source, destination] of files) {
  const sourcePath = path.join(root, source);
  const destinationPath = path.join(output, destination);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

console.log(`Prepared static site in ${path.relative(root, output)} (${files.length} files).`);
