const { getApplications, saveApplications } = require("../models/applicationModels");
const fs = require("fs");
const path = require("path");
const { rankCandidates, rankCandidate } = require("../utils/locationUtils");

const jobsPath = path.join(__dirname, "../data/jobs.json");
const studentsPath = path.join(__dirname, "../data/students.json");
const employersPath = path.join(__dirname, "../data/employers.json");

function getAccount(email) {
    const value = String(email || "").toLowerCase();
    for (const file of [studentsPath, employersPath]) {
        if (!fs.existsSync(file)) continue;
        const found = JSON.parse(fs.readFileSync(file, "utf8")).find(a => String(a.email || "").toLowerCase() === value);
        if (found) return found;
    }
    return null;
}

function getJobs() {
    if (!fs.existsSync(jobsPath)) return [];
    return JSON.parse(fs.readFileSync(jobsPath, "utf8"));
}


function addStudentNotification(application, status) {
    const file = path.join(__dirname, "../data/notifications.json");
    const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    const job = getJobs().find(j => String(j.id) === String(application.jobId));
    const messages = { Accepted: "Your application was accepted.", Rejected: "Your application was not successful.", Shortlisted: "Your application has been shortlisted.", Completed: "Your gig has been marked completed." };
    list.push({ id: `${Date.now()}-${application.id}`, recipientEmail: application.email, type: `application_${status.toLowerCase()}`, title: `Application ${status.toLowerCase()}`, message: `${messages[status] || `Your application status is ${status}.`} ${job ? `Gig: ${job.title}.` : ''}`, jobId: application.jobId, applicationId: application.id, read: false, createdAt: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(list, null, 2));
}
function getApplicationsForEmployer(req, res) {
    try {
        const applications = getApplications();
        const jobs = getJobs();
        const employerId = String(req.query.employerId || "").trim();

        const filtered = employerId
            ? applications.filter(application => {
                const job = jobs.find(j => String(j.id) === String(application.jobId));
                return job && String(job.employerId || "") === employerId;
            })
            : applications;

        const enriched = filtered.map(application => {
            const job = jobs.find(job => String(job.id) === String(application.jobId)) || null;
            const proximity = job ? rankCandidate(
                application.cityTown || application.postalAddress || "",
                job.location
            ) : null;
            return { ...application, job, proximity };
        }).sort((a, b) => (b.proximity?.score || 0) - (a.proximity?.score || 0));

        res.json({
            success: true,
            applications: enriched
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not load applications" });
    }
}

function getApplicationsForStudent(req, res) {
    try {
        const email = String(req.query.email || "").trim().toLowerCase();
        const name = String(req.query.name || "").trim().toLowerCase();
        const applications = getApplications().filter(application => {
            return (email && String(application.email || "").toLowerCase() === email) ||
                   (name && String(application.name || "").toLowerCase() === name);
        });
        res.json({ success: true, applications });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not load student applications" });
    }
}

function createApplication(req, res) {
    try {
        const account = getAccount(req.body?.email);
        if (!account || !String(account.email || "").trim()) {
            return res.status(403).json({ success: false, message: "A registered CampusGig student account is required to apply." });
        }
        if (account.status === "Suspended" || account.emailVerified !== true) {
            return res.status(403).json({ success: false, message: "Your account must be active and email verified before applying for jobs." });
        }
        const requiredFields = ["jobId", "name", "email", "phone", "gigTitle", "submittedAt", "status"];
        const missingField = requiredFields.find(field => !req.body?.[field]);
        if (missingField) return res.status(400).json({ success: false, message: `Missing required application field: ${missingField}` });

        const jobs = getJobs();
        const job = jobs.find(item => String(item.id) === String(req.body.jobId));
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        const application = {
            id: Date.now().toString(),
            jobId: String(req.body.jobId),
            name: String(req.body.name).trim(),
            email: String(req.body.email).trim(),
            phone: String(req.body.phone).trim(),
            postalAddress: String(req.body.postalAddress || "").trim(),
            age: String(req.body.age || "").trim(),
            gender: String(req.body.gender || "").trim(),
            university: String(req.body.university || "").trim(),
            currentPosition: String(req.body.currentPosition || "").trim(),
            language: String(req.body.language || "").trim(),
            skills: Array.isArray(req.body.skills) ? req.body.skills : [],
            timetableFileName: String(req.body.timetableFileName || "No timetable uploaded"),
            availabilityNote: String(req.body.availabilityNote || "").trim(),
            gigTitle: String(req.body.gigTitle).trim(),
            submittedAt: req.body.submittedAt,
            status: "Submitted",
            createdAt: new Date().toISOString()
        };

        const applications = getApplications();
        const duplicate = applications.find(a =>
            String(a.jobId) === String(application.jobId) &&
            String(a.email).toLowerCase() === application.email.toLowerCase()
        );
        if (duplicate) return res.status(409).json({ success: false, message: "You have already applied for this job" });

        applications.push(application);
        saveApplications(applications);
        res.status(201).json({ success: true, message: "Application submitted successfully", application });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not save application" });
    }
}

function updateApplicationStatus(req, res) {
    try {
        const applications = getApplications();
        const index = applications.findIndex(a => String(a.id) === String(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, message: "Application not found" });

        const allowed = ["Submitted", "Shortlisted", "Accepted", "Rejected", "Completed"];
        const status = String(req.body.status || "").trim();
        if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid application status" });

        applications[index].status = status;
        applications[index].updatedAt = new Date().toISOString();
        if (status === "Accepted") applications[index].acceptedAt = new Date().toISOString();
        saveApplications(applications);
        addStudentNotification(applications[index], status);

        res.json({ success: true, message: `Application ${status.toLowerCase()}`, application: applications[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not update application" });
    }
}

function getRankedApplications(req, res) {
    try {
        const job = getJobs().find(item => String(item.id) === String(req.params.jobId));
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        const applications = getApplications().filter(a => String(a.jobId) === String(job.id));
        res.json({ success: true, job, applications: rankCandidates(applications, job.location) });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not rank candidates" });
    }
}

function getStudentNotifications(req, res) {
    try { const email = String(req.query.email || "").trim().toLowerCase(); const id = String(req.query.id || ""); const file = path.join(__dirname, "../data/notifications.json"); const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []; res.json({ success: true, notifications: rows.filter(n => (email && String(n.recipientEmail || "").toLowerCase() === email) || (id && String(n.recipientId || "") === id)).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)) }); } catch (e) { res.status(500).json({ success:false, message:"Could not load notifications" }); }
}

module.exports = {
    getStudentNotifications,
    createApplication,
    getApplications: getApplicationsForEmployer,
    getStudentApplications: getApplicationsForStudent,
    updateApplicationStatus,
    getRankedApplications
};
