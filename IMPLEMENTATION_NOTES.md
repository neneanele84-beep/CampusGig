# CampusGig update notes

## Registration and validation
- Student and employer registration now collect separate first name and surname, date of birth, calculated age, email, South African phone, house/unit number, street, suburb, city/town, postal code, province, country, gender, languages, and the role-specific university or business name.
- City/town options cover Richards Bay, Empangeni and nearby listed areas, with an "Other nearby area" choice that requires the area name.
- Gender offers Male, Female and Custom; Custom requires a description.
- Age is calculated from date of birth in the browser and recalculated/validated on the backend. It is never trusted as a manually supplied value.
- Registration is validated on both client and server. Email addresses are no longer restricted to Gmail/Outlook domains.

## Profiles
- Students have a new Edit Profile overlay backed by GET/PUT `/api/students/profile`.
- Employers have a full Edit Profile overlay backed by the existing GET/PUT `/api/employers/profile` endpoints.
- Both profile update endpoints revalidate profile data and prevent duplicate email addresses.

## Jobs and notifications
- Employer job posting and editing now use start-date and end-date fields; the backend validates the date range and stores both dates. The displayed `duration` value is generated from the selected dates for compatibility with existing screens.
- Students can save/unsave gigs from the existing Saved Jobs UI. Saved jobs currently use browser local storage, so they are specific to that browser/device.
- Posting a job creates server-side notifications for student accounts. Application status changes create notifications for the affected student. Student dashboards poll the notifications endpoint every minute.

## Run locally
1. Install backend dependencies in `Employer Page/backend` with `npm install`.
2. Configure the backend environment using `.env.example` (mail/OTP settings may be needed for verification).
3. Start the API with `npm start` from `Employer Page/backend` (default `http://localhost:3000`).
4. Serve the `CampusGig` folder through a local web server and open `Homepage.html`.

## Render deployment
- Backend Web Service: Root Directory `Employer Page/backend`, Build Command `npm ci`, Start Command `node server.js`.
- Configure `NODE_ENV=production` and email delivery credentials in the backend service's Render environment settings. Render supplies `PORT`.
- Static Site: Root Directory `.`, Build Command `node build-site.js`, Publish Directory `site`. The build script copies only the frontend pages and assets into `site`; it excludes backend code, local JSON data, and development files.
- Frontend API calls currently target the deployed backend URL configured in the frontend source. Update that URL in the frontend source before deployment if the Render backend URL changes.
- The backend currently persists records in JSON files on the service filesystem. Render's ordinary filesystem is ephemeral; use a managed database for user/job/application records or attach and configure a persistent disk before accepting real data.

## Important deployment note
This project currently uses JSON files and client-supplied account IDs for profile operations. Before public production deployment, add authenticated server sessions/JWTs and enforce ownership/authorization on every profile, job, application and notification endpoint; move user/job data to a database; and configure HTTPS and secure secrets. Existing account JSON files contain plaintext passwords and must not be deployed; affected accounts should reset their passwords. Credentials were committed in prior revisions, so rotate the email-provider credentials. Removing sensitive files from the current Git tree does not remove them from Git history; history cleanup requires a coordinated rewrite and force-push.
