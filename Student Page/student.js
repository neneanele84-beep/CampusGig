const storedUser = JSON.parse(localStorage.getItem('campusgig-current-user') || '{}');
const currentUser = storedUser.role === 'student' ? storedUser : {
    role: 'student',
    name: 'Student User',
    email: ''
};

const usernameEls = document.querySelectorAll('.username, .profile-username');
const emailEls = document.querySelectorAll('.profile-email');

if (currentUser.name) {
    usernameEls.forEach((el) => {
        if (el) el.textContent = currentUser.name;
    });
}

if (currentUser.email) {
    emailEls.forEach((el) => {
        if (el) el.textContent = currentUser.email;
    });
}

const completionProgress = document.getElementById('completion-progress');
const completionText = document.getElementById('completion-text');

if (completionProgress) {
    completionProgress.style.width = '75%';
}

if (completionText) {
    completionText.textContent = 'Profile 75% Complete';
}

function getApplications() {
    try {
        const savedValue = localStorage.getItem('campusgig-applications');
        const parsed = savedValue ? JSON.parse(savedValue) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

async function syncStudentApplications() {
    try {
        const user = JSON.parse(localStorage.getItem('campusgig-current-user') || '{}');
        if (!user.email) return;

        const response = await fetch(`https://campusgig-jf2e.onrender.com/api/applications/student?email=${encodeURIComponent(user.email)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data.success || !Array.isArray(data.applications)) return;

        localStorage.setItem('campusgig-applications', JSON.stringify(data.applications));
        updateApplicationCount();
        if (typeof renderApplicationsPanel === 'function') renderApplicationsPanel();
    } catch (error) {}
}

function updateApplicationCount() {
    const countElement = document.getElementById('applications-count');
    const statusElement = document.querySelector('.stat-card .stat-change');
    const applicationCount = getApplications().length;

    if (countElement) {
        countElement.textContent = String(applicationCount);
    }

    if (statusElement) {
        statusElement.textContent = applicationCount === 0
            ? 'No applications yet'
            : applicationCount === 1
                ? '1 application submitted'
                : `${applicationCount} applications submitted`;
    }
}

updateApplicationCount();

const searchInput = document.querySelector('.search-container input');
const searchButton = document.querySelector('.search-btn');
const jobList = document.getElementById('job-list');
const emptyJobs = document.getElementById('empty-jobs');
const savedCount = document.querySelector('.saved-icon')?.nextElementSibling?.querySelector('.stat-number');
const savedJobsKey = 'campusgig-saved-jobs';
let savedJobs = 0;

function getSavedJobs() {
    try {
        const stored = JSON.parse(localStorage.getItem(savedJobsKey) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function renderSavedJobs() {
    const savedPanel = document.getElementById('saved-panel');
    const savedList = document.getElementById('saved-job-list');
    const savedEmpty = document.getElementById('saved-empty');
    const saved = getSavedJobs();

    if (savedPanel && savedList && savedEmpty) {
        savedList.innerHTML = '';

        if (saved.length === 0) {
            savedEmpty.hidden = false;
            savedList.hidden = true;
            return;
        }

        savedEmpty.hidden = true;
        savedList.hidden = false;

        saved.forEach((jobTitle) => {
            const item = document.createElement('button');
            item.className = 'saved-job-item saved-job-button';
            item.type = 'button';
            item.setAttribute('aria-label', `View details for ${jobTitle}`);
            item.innerHTML = `<span>${escapeHtml(jobTitle)}</span>`;

            item.addEventListener('click', () => {
                const matchingJob = Array.from(document.querySelectorAll('.job-card')).find((jobCard) => {
                    return jobCard.querySelector('h3')?.textContent?.trim() === jobTitle;
                });

                if (matchingJob) openJobDetail(matchingJob);
            });

            savedList.appendChild(item);
        });
    }
}

function formatApplicationDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getApplicationStatus(application) {
    return application?.status || application?.applicationStatus || 'Submitted';
}

function openApplicationDetails(application, applicationIndex) {
    const modal = document.createElement('div');
    modal.className = 'gig-detail-modal-backdrop';
    modal.id = 'application-details-modal';

    const skills = Array.isArray(application.skills) && application.skills.length
        ? application.skills.map((skill) => escapeHtml(skill)).join(', ')
        : 'Not provided';

    modal.innerHTML = `
        <div class="gig-detail-modal application-details-modal">
            <div class="gig-detail-head">
                <div>
                    <span class="gig-detail-kicker">Application details</span>
                    <h3>${escapeHtml(application.gigTitle || application.currentPosition || 'Application')}</h3>
                </div>
                <button class="gig-detail-close" type="button" aria-label="Close application details">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="gig-detail-body">
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Applicant</span>
                    <span class="gig-detail-value">${escapeHtml(application.name || 'Not provided')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Email</span>
                    <span class="gig-detail-value">${escapeHtml(application.email || 'Not provided')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Phone</span>
                    <span class="gig-detail-value">${escapeHtml(application.phone || 'Not provided')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Postal address</span>
                    <span class="gig-detail-value">${escapeHtml(application.postalAddress || 'Not provided')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Skills</span>
                    <span class="gig-detail-value">${skills}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Status</span>
                    <span class="gig-detail-value">${escapeHtml(getApplicationStatus(application))}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Submitted</span>
                    <span class="gig-detail-value">${escapeHtml(formatApplicationDate(application.submittedAt))}</span>
                </div>
                <div class="gig-detail-description">
                    <span class="gig-detail-label">Timetable</span>
                    <p>${escapeHtml(application.timetableFileName || 'No timetable uploaded')}</p>
                </div>
            </div>

            <div class="gig-detail-actions application-detail-actions">
                <button class="gig-detail-back application-detail-back" type="button">Back</button>
                <button class="application-cancel-btn" type="button">Cancel application</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('.gig-detail-close').addEventListener('click', closeModal);
    modal.querySelector('.application-detail-back').addEventListener('click', closeModal);
    modal.querySelector('.application-cancel-btn').addEventListener('click', () => {
        if (!window.confirm('Cancel this application? This action cannot be undone.')) return;

        const applications = getApplications();
        applications.splice(applicationIndex, 1);
        localStorage.setItem('campusgig-applications', JSON.stringify(applications));
        closeModal();
        renderApplicationsPanel();
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
}

function renderApplicationsPanel() {
    const applicationsPanel = document.getElementById('applications-panel');
    const applicationsList = document.getElementById('application-list');
    const applicationsEmpty = document.getElementById('applications-empty');
    const applications = getApplications();

    if (!applicationsPanel || !applicationsList || !applicationsEmpty) return;

    applicationsList.innerHTML = '';

    if (applications.length === 0) {
        applicationsEmpty.hidden = false;
        applicationsList.hidden = true;
        return;
    }

    applicationsEmpty.hidden = true;
    applicationsList.hidden = false;

    applications.forEach((application) => {
        const item = document.createElement('div');
        item.className = 'saved-job-item';
        const status = getApplicationStatus(application);
        item.innerHTML = `
            <button class="application-row application-detail-button" type="button" aria-label="View details for ${escapeHtml(application.gigTitle || application.currentPosition || 'application')}">
                <span>
                    <strong>${escapeHtml(application.gigTitle || application.currentPosition || 'Application')}</strong>
                    <small>${escapeHtml(formatApplicationDate(application.submittedAt))}</small>
                </span>
                <span class="application-status">${escapeHtml(status)}</span>
            </button>
        `;

        item.querySelector('.application-detail-button').addEventListener('click', () => {
            openApplicationDetails(application, applications.indexOf(application));
        });

        applicationsList.appendChild(item);
    });
}

function ensureSavedPanel() {
    const currentView = window.location.hash ? window.location.hash.slice(1) : 'dashboard';
    const isJobBrowseView = ['find-work', 'browse'].includes(currentView);

    if (isJobBrowseView) {
        const existingPanel = document.getElementById('saved-panel');
        if (existingPanel) existingPanel.hidden = true;
        return;
    }

    let savedPanel = document.getElementById('saved-panel');
    if (!savedPanel) {
        savedPanel = document.createElement('section');
        savedPanel.id = 'saved-panel';
        savedPanel.className = 'saved-panel';
        savedPanel.innerHTML = `
            <div class="jobs-heading">
                <div>
                    <p class="section-kicker">Saved</p>
                    <h2>Saved gigs</h2>
                </div>
            </div>
            <div class="saved-job-list" id="saved-job-list"></div>
            <p class="empty-jobs" id="saved-empty">No saved jobs yet</p>
        `;

        const jobsSection = document.getElementById('find-work');
        if (jobsSection && jobsSection.parentNode) {
            jobsSection.parentNode.insertBefore(savedPanel, jobsSection.nextSibling);
        }
    }

    savedPanel.hidden = false;
    renderSavedJobs();
}

function ensureApplicationsPanel() {
    const currentView = window.location.hash ? window.location.hash.slice(1) : 'dashboard';
    const isApplicationView = ['applications', 'track'].includes(currentView);

    let applicationsPanel = document.getElementById('applications-panel');
    if (!applicationsPanel) {
        applicationsPanel = document.createElement('section');
        applicationsPanel.id = 'applications-panel';
        applicationsPanel.className = 'saved-panel';
        applicationsPanel.innerHTML = `
            <div class="jobs-heading">
                <div>
                    <p class="section-kicker">Applications</p>
                    <h2>Application status</h2>
                </div>
            </div>
            <div class="saved-job-list" id="application-list"></div>
            <p class="empty-jobs" id="applications-empty">No applications yet</p>
        `;

        const findWorkSection = document.getElementById('find-work');
        const insertionTarget = findWorkSection || document.getElementById('saved-panel');
        if (insertionTarget && insertionTarget.parentNode) {
            insertionTarget.parentNode.insertBefore(applicationsPanel, insertionTarget.nextSibling);
        }
    }

    applicationsPanel.hidden = !isApplicationView;
    renderApplicationsPanel();
}

function readCard(jobCard) {
    if (!jobCard) return null;

    const job = {
        title: jobCard.querySelector('h3')?.textContent?.trim() || '',
        description: jobCard.querySelector('.job-description')?.textContent?.trim() || '',
        meta: jobCard.querySelector('.job-meta')?.textContent?.trim() || '',
        tags: Array.from(jobCard.querySelectorAll('.tag-list span') || []).map((tag) => tag.textContent.trim()),
        posted: jobCard.querySelector('.job-card-topline span')?.textContent?.trim() || '',
        proposals: jobCard.querySelector('.job-card-topline span:nth-child(3)')?.textContent?.trim() || '',
        location: jobCard.querySelector('.job-footer span:last-of-type .material-symbols-outlined') ? 'Remote/Location' : '',
        payment: jobCard.querySelector('.job-footer .verified')?.textContent?.trim() || ''
    };

    const footerSpans = Array.from(jobCard.querySelectorAll('.job-footer > span')) || [];
    const locationText = footerSpans.find((span) => span.querySelector('.material-symbols-outlined')?.textContent === 'location_on')?.textContent?.trim() || '';
    const spentText = footerSpans.find((span) => !span.querySelector('.material-symbols-outlined') && !span.classList.contains('verified'))?.textContent?.trim() || '';

    job.location = locationText.replace('location_on', '').trim();
    job.spent = spentText || '';

    return job;
}

function openJobDetail(jobCard) {
    const job = readCard(jobCard);
    if (!job) return;

    const modal = document.createElement('div');
    modal.className = 'gig-detail-modal-backdrop';
    modal.id = 'gig-detail-modal-backdrop';

    modal.innerHTML = `
        <div class="gig-detail-modal">
            <div class="gig-detail-head">
                <div>
                    <span class="gig-detail-kicker">CampusGig gig</span>
                    <h3>${escapeHtml(job.title)}</h3>
                </div>
                <button class="gig-detail-close" id="gig-detail-close" type="button" aria-label="Close">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="gig-detail-body">
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Posted</span>
                    <span class="gig-detail-value">${escapeHtml(job.posted || 'Recently')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Proposals</span>
                    <span class="gig-detail-value">${escapeHtml(job.proposals || 'Open')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Pay & experience</span>
                    <span class="gig-detail-value">${escapeHtml(job.meta || 'Hourly / Flexible')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Location</span>
                    <span class="gig-detail-value">${escapeHtml(job.location || 'Remote')}</span>
                </div>
                <div class="gig-detail-row">
                    <span class="gig-detail-label">Budget / spent</span>
                    <span class="gig-detail-value">${escapeHtml(job.spent || '$0 spent')}</span>
                </div>
                <div class="gig-detail-description">
                    <span class="gig-detail-label">Job description</span>
                    <p>${escapeHtml(job.description)}</p>
                </div>
                <div class="gig-detail-tags">
                    ${(job.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>

            <div class="gig-detail-actions">
                <button class="gig-detail-back" id="gig-detail-back" type="button">Back</button>
                <button class="gig-detail-apply" id="gig-detail-apply" type="button">Apply</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#gig-detail-close').addEventListener('click', close);
    modal.querySelector('#gig-detail-back').addEventListener('click', close);
    modal.querySelector('#gig-detail-apply').addEventListener('click', () => {
        const selectedJob = {
            id: job.id,
            title: job.title,
            description: job.description,
            tags: job.tags
        };
        localStorage.setItem('campusgig-selected-job', JSON.stringify(selectedJob));
        close();
        window.location.href = 'application page.html';
    });
}

function openApplicationPage(jobCard) {
    const jobTitle = jobCard?.querySelector('h3')?.textContent?.trim() || 'Selected gig';
    const jobDescription = jobCard?.querySelector('.job-description')?.textContent?.trim() || '';
    const tags = Array.from(jobCard?.querySelectorAll('.tag-list span') || []).map((tag) => tag.textContent.trim());
    const selectedJob = {
        id: jobCard?.dataset.jobId || '',
        title: jobTitle,
        description: jobDescription,
        tags
    };

    localStorage.setItem('campusgig-selected-job', JSON.stringify(selectedJob));
    window.location.href = 'application page.html';
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function formatPostedDate(dateValue) {
    const hoursAgo = Math.max(1, Math.round((Date.now() - new Date(dateValue).getTime()) / 3600000));
    return hoursAgo < 24 ? `Posted ${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago` : 'Posted yesterday';
}

function jobCardTemplate(job) {
    const searchText = [job.title, job.description, job.location, job.experience, ...(job.tags || [])].join(' ');
    const budget = job.budget ? `${job.paymentType || 'Hourly'}: ${job.budget}` : (job.paymentType || 'Hourly');

    return `<article class="job-card" data-job-id="${escapeHtml(job.id)}" data-search="${escapeHtml(searchText.toLowerCase())}">
        <div class="job-card-topline">
            <span>${escapeHtml(formatPostedDate(job.postedAt))}</span><span class="dot-separator">•</span><span>Proposals: ${escapeHtml(job.proposals)}</span>
            <button class="save-job-btn" type="button" aria-label="Save ${escapeHtml(job.title)} job" aria-pressed="false"><span class="material-symbols-outlined">bookmark_border</span></button>
        </div>
        <h3>${escapeHtml(job.title)}</h3>
        <p class="job-meta">${escapeHtml(budget)} <span>•</span> ${escapeHtml(job.experience)} <span>•</span> Est. time: ${escapeHtml(job.duration)}</p>
        <p class="job-description">${escapeHtml(job.description)}</p>
        <div class="tag-list">${(job.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="job-footer"><span class="verified"><span class="material-symbols-outlined">verified</span> ${job.verified ? 'Payment verified' : 'Payment not verified'}</span><span>${escapeHtml(job.spent)}</span><span><span class="material-symbols-outlined">location_on</span> ${escapeHtml(job.location)}</span><button class="apply-btn" type="button">View gig</button></div>
    </article>`;
}

function attachJobInteractions() {
    const saved = new Set(getSavedJobs());

    document.querySelectorAll('.save-job-btn').forEach((button) => {
        const jobTitle = button.closest('.job-card')?.querySelector('h3')?.textContent?.trim() || 'Saved job';
        const isCurrentlySaved = saved.has(jobTitle);
        button.setAttribute('aria-pressed', String(isCurrentlySaved));
        const icon = button.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isCurrentlySaved ? 'bookmark' : 'bookmark_border';

        button.addEventListener('click', () => {
            const currentTitle = button.closest('.job-card')?.querySelector('h3')?.textContent?.trim() || 'Saved job';
            const isSaved = button.getAttribute('aria-pressed') === 'true';
            const updatedSaved = new Set(getSavedJobs());

            if (isSaved) {
                updatedSaved.delete(currentTitle);
            } else {
                updatedSaved.add(currentTitle);
            }

            localStorage.setItem(savedJobsKey, JSON.stringify(Array.from(updatedSaved)));
            button.setAttribute('aria-pressed', String(!isSaved));
            if (icon) icon.textContent = isSaved ? 'bookmark_border' : 'bookmark';

            savedJobs = updatedSaved.size;
            if (savedCount) savedCount.textContent = String(savedJobs);
            renderSavedJobs();
        });
    });

    savedJobs = saved.size;
    if (savedCount) savedCount.textContent = String(savedJobs);
    renderSavedJobs();
}

if (jobList) {
    jobList.addEventListener('click', (event) => {
        const applyButton = event.target.closest('.apply-btn');
        if (!applyButton) return;
        const card = applyButton.closest('.job-card');
        if (card) openJobDetail(card);
    });
}

ensureSavedPanel();
ensureApplicationsPanel();

const viewLinks = document.querySelectorAll('.nav-link, .sidebar-menu a');
const dashboardSections = document.querySelectorAll('.dashboard-only');

function setActiveView(viewName) {
    const normalizedView = viewName || 'dashboard';
    const isJobBrowseView = ['find-work', 'browse'].includes(normalizedView);
    const isApplicationsView = ['applications', 'track'].includes(normalizedView);
    const rightPanel = document.querySelector('.right-panel');
    const savedPanel = document.getElementById('saved-panel');
    const applicationsPanel = document.getElementById('applications-panel');

    dashboardSections.forEach((section) => {
        section.hidden = isJobBrowseView || isApplicationsView;
    });

    if (rightPanel) {
        rightPanel.hidden = isJobBrowseView || isApplicationsView;
    }

    if (savedPanel) {
        savedPanel.hidden = isJobBrowseView || isApplicationsView;
    }

    if (applicationsPanel) {
        applicationsPanel.hidden = !isApplicationsView;
    }

    const jobsSection = document.getElementById('find-work');
    if (jobsSection) {
        jobsSection.hidden = isApplicationsView;
    }
}

viewLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = link.getAttribute('href') || '#dashboard';
        const nextView = target.startsWith('#') ? target.slice(1) : target;
        setActiveView(nextView);
        window.location.hash = target;
    });
});

setActiveView(window.location.hash ? window.location.hash.slice(1) : 'dashboard');

function filterJobs() {
    const query = searchInput?.value.trim().toLowerCase() || '';
    let visibleJobs = 0;

    document.querySelectorAll('.job-card').forEach((job) => {
        const searchSource = [
            job.dataset.search || '',
            job.querySelector('h3')?.textContent || '',
            job.querySelector('.job-description')?.textContent || '',
            job.querySelector('.job-meta')?.textContent || '',
            Array.from(job.querySelectorAll('.tag-list span')).map((tag) => tag.textContent).join(' '),
            Array.from(job.querySelectorAll('.job-footer > span')).map((span) => span.textContent).join(' ')
        ].join(' ').toLowerCase();

        const matches = !query || searchSource.includes(query);
        job.hidden = !matches;
        if (matches) visibleJobs += 1;
    });

    if (emptyJobs) {
        emptyJobs.hidden = visibleJobs !== 0;
        if (!query) {
            emptyJobs.textContent = 'No gigs match your search yet.';
        } else if (visibleJobs === 0) {
            emptyJobs.textContent = `No jobs found for "${searchInput.value.trim()}". Try another keyword or check back later.`;
        }
    }
}

if (searchInput) {
    searchInput.addEventListener('input', filterJobs);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterJobs();
        }
    });
}

if (searchButton) {
    searchButton.addEventListener('click', (event) => {
        event.preventDefault();
        filterJobs();
    });
}

attachJobInteractions();

function normaliseJobs(jobs) {
    return jobs.map((job) => ({
        ...job,
        postedAt: job.createdAt || job.updatedAt || new Date().toISOString(),
        proposals: 'Open',
        experience: 'Entry level',
        paymentType: 'Payment',
        budget: `R${job.payment}`,
        spent: `R${job.payment}`,
        verified: true,
        tags: String(job.skills || '')
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
    }));
}

async function loadJobs() {
    try {
        const response = await fetch('https://campusgig-jf2e.onrender.com/api/jobs');

        if (!response.ok) throw new Error('Jobs API unavailable');

        const data = await response.json();
        const jobs = Array.isArray(data.jobs) ? normaliseJobs(data.jobs) : [];

        if (!jobList) return;

        jobList.innerHTML = jobs.map(jobCardTemplate).join('');
        if (emptyJobs) {
            emptyJobs.hidden = jobs.length > 0;
            emptyJobs.textContent = jobs.length === 0
                ? 'No active jobs are available right now.'
                : 'No gigs match your search yet.';
        }

        attachJobInteractions();
        filterJobs();
    } catch (error) {
        if (emptyJobs) {
            emptyJobs.hidden = false;
            emptyJobs.textContent = 'Unable to load jobs. Check that the CampusGig backend is running.';
        }
    }
}

loadJobs();



(function () {
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    const notificationBtn = document.querySelector('.notification-btn');

    function getNotifications() {
      try {
        return JSON.parse(localStorage.getItem('campusgig-notifications') || '[]');
      } catch {
        return [];
      }
    }

    function saveNotifications(notifications) {
      localStorage.setItem('campusgig-notifications', JSON.stringify(notifications));
    }

    function sanitizeNotifications() {
      const notifications = getNotifications();

      const uniqueNotifications = [];
      const seen = new Set();

      notifications.forEach((notif) => {
        const key = `${notif.message}|${notif.jobIndex ?? 'none'}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueNotifications.push(notif);
        }
      });

      const limited = uniqueNotifications.slice(0, 3);
      saveNotifications(limited);
      return limited;
    }

    function addNotification(title, message, type = 'job', jobIndex = null) {
      const notifications = getNotifications();
      const newNotif = {
        id: Date.now(),
        title,
        message,
        type,
        time: new Date().toLocaleTimeString(),
        read: false,
        jobIndex
      };

      notifications.unshift(newNotif);

      const unique = [];
      const seen = new Set();

      notifications.forEach((notif) => {
        const key = `${notif.message}|${notif.jobIndex ?? 'none'}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(notif);
        }
      });

      const limited = unique.slice(0, 3);
      saveNotifications(limited);
      renderNotifications();
      updateBadgeCount();
      updateNotificationHeader();
    }

    function updateNotificationHeader() {
      const notifications = getNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      const notificationCount = document.getElementById('notification-count');
      if (notificationCount) {
        notificationCount.textContent = `${unreadCount} new`;
      }
    }

    function renderNotifications() {
      const notifications = getNotifications();
      notificationList.innerHTML = '';

      if (notifications.length === 0) {
        notificationList.innerHTML = '<div style="padding: 12px; color: #94a3b8; text-align: center; font-size: 12px;">No notifications yet</div>';
        return;
      }

      notifications.forEach((notif, idx) => {
        const notifItem = document.createElement('button');
        notifItem.type = 'button';
        notifItem.className = 'notification-item';
        notifItem.style.cssText = `
          width: 100%;
          background: transparent;
          border: none;
          text-align: left;
          padding: 0;
          cursor: pointer;
          opacity: ${notif.read ? '0.5' : '1'};
          transition: opacity 0.3s ease;
        `;
        notifItem.innerHTML = `
          <div style="padding: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <strong style="color: #fff; font-size: 13px;">${notif.title}</strong>
              <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">${notif.message}</p>
              <small style="color: #64748b; font-size: 11px;">${notif.time}</small>
            </div>
            ${notif.read ? '<span style="color: #22c55e; font-size: 12px; margin-left: 8px;">✓✓</span>' : ''}
          </div>
        `;

        notifItem.addEventListener('click', () => {
          
          const allNotifications = getNotifications();
          allNotifications[idx].read = true;
          saveNotifications(allNotifications);

          if (notif.jobIndex !== null) {
            
            notificationDropdown.classList.remove('open');
            notificationBtn.setAttribute('aria-expanded', 'false');

            
            const findWorkSection = document.getElementById('find-work');
            if (findWorkSection) {
              findWorkSection.hidden = false;
            }

        
            setActiveView('find-work');
            window.location.hash = '#find-work';

            
            setTimeout(() => {
              if (findWorkSection) {
                findWorkSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                setTimeout(() => {
                  const jobCards = document.querySelectorAll('.job-card');
                  const targetJob = jobCards[notif.jobIndex];

                  if (targetJob) {
                    targetJob.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetJob.classList.add('job-highlight');
                    setTimeout(() => targetJob.classList.remove('job-highlight'), 2200);
                  }
                }, 600);
              }
            }, 300);
          } else {
            notificationDropdown.classList.remove('open');
            notificationBtn.setAttribute('aria-expanded', 'false');
          }

          renderNotifications();
          updateBadgeCount();
          updateNotificationHeader();
        });

        notificationList.appendChild(notifItem);
      });
    }

    function updateBadgeCount() {
      const unreadCount = getNotifications().filter(n => !n.read).length;
      notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    }

    notificationBtn.addEventListener('click', () => {
      notificationDropdown.classList.toggle('open');
      notificationBtn.setAttribute('aria-expanded', notificationDropdown.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-wrapper')) {
        notificationDropdown.classList.remove('open');
        notificationBtn.setAttribute('aria-expanded', 'false');
      }
    });

    function checkForNewJobs() {
      const jobs = document.querySelectorAll('.job-card');
      const notifications = sanitizeNotifications();

      jobs.forEach((jobCard, index) => {
        const jobTitle = jobCard.querySelector('h3')?.textContent || 'New Job';
        const posted = jobCard.querySelector('.job-card-topline span')?.textContent || 'Recently';

        if (posted.includes('hour') || posted.includes('minutes') || posted.includes('day')) {
          const jobExists = notifications.some(n =>
            n.message.includes(jobTitle) && n.jobIndex === index
          );

          if (!jobExists) {
            addNotification(
              '🎉 New Job Posted!',
              jobTitle,
              'job',
              index
            );
          }
        }
      });
    }

    async function syncServerNotifications() {
      const account = JSON.parse(localStorage.getItem('campusgig-current-user') || '{}');
      if (!account.email) return;
      try {
        const response = await fetch(`https://campusgig-jf2e.onrender.com/api/applications/notifications/student?email=${encodeURIComponent(account.email)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data.success || !Array.isArray(data.notifications)) return;
        const existing = getNotifications();
        const merged = [...data.notifications.map(n => ({...n, time:new Date(n.createdAt).toLocaleString('en-ZA')})), ...existing];
        const unique = [...new Map(merged.map(n => [String(n.id), n])).values()].slice(0,30);
        saveNotifications(unique); renderNotifications(); updateBadgeCount(); updateNotificationHeader();
      } catch (error) { /* Local notifications remain available while offline. */ }
    }
    sanitizeNotifications();
    renderNotifications();
    updateBadgeCount();
    updateNotificationHeader();
    syncServerNotifications();
    setInterval(syncServerNotifications, 60000);

    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).then(response => {
        if (args[0].includes('/api/jobs')) {
          setTimeout(() => checkForNewJobs(), 500);
        }
        return response;
      });
    };

    window.notifyNewJob = function(jobTitle, jobIndex = null) {
      addNotification('🎉 New Job Posted!', jobTitle, 'job', jobIndex);
    };

    window.notifyEmail = function(sender, subject) {
      addNotification('📧 New Email', `From: ${sender} - ${subject}`, 'email');
    };

    
    window.checkForNewJobs = checkForNewJobs;
})();
