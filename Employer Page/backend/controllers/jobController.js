const fs = require("fs");
const path = require("path");
const { isAllowedJobLocation } = require("../utils/locationUtils");
const employerFilePath = path.join(__dirname, "../data/employers.json");

function getEmployers() {
    if (!fs.existsSync(employerFilePath)) return [];
    return JSON.parse(fs.readFileSync(employerFilePath, "utf8"));
}

const filePath = path.join(__dirname, "../data/jobs.json");

function readJobs() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJobs(jobs) { fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2)); }
function notifyStudents(job) {
    const studentsPath = path.join(__dirname, "../data/students.json");
    const notificationsPath = path.join(__dirname, "../data/notifications.json");
    const students = fs.existsSync(studentsPath) ? JSON.parse(fs.readFileSync(studentsPath, "utf8")) : [];
    const notifications = fs.existsSync(notificationsPath) ? JSON.parse(fs.readFileSync(notificationsPath, "utf8")) : [];
    students.forEach(student => notifications.push({ id: `${Date.now()}-${student.id}-${job.id}`, recipientId: String(student.id), recipientEmail: student.email, type: "job_posted", title: "New gig posted", message: `${job.title} is now available.`, jobId: job.id, read: false, createdAt: new Date().toISOString() }));
    fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
}

function todayString() {
    return new Date().toISOString().split("T")[0];
}

function validateJobFields(data) {
    const {
        title,
        location,
        description,
        skills,
        payment,
        duration,
        startDate,
        endDate,
        deadline
    } = data;

    if (!title || !location || !description || !skills || !payment || !startDate || !endDate || !deadline) {
        return "All job fields are required";
    }

    if (!isAllowedJobLocation(location)) {
        return "Job location must be Richards Bay, Empangeni, or a nearby area";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) return "Choose a valid job start date and end date; the end date cannot be before the start date.";

    if (deadline < todayString()) {
        return "Application deadline cannot be in the past";
    }

    return null;
}

function getJobs(req, res) {
    try {
        const employerId = String(req.query.employerId || "").trim();
        const jobs = readJobs().filter(job => employerId ? String(job.employerId || "") === employerId : job.approved !== false && job.status !== "Removed" && job.status !== "Closed");

        res.json({
            success: true,
            jobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not load jobs"
        });
    }
}

function createJob(req, res) {
    try {
        const employerId = String(req.body.employerId || "").trim();
        const employer = getEmployers().find(e => String(e.id) === employerId);
        if (!employer || employer.status === "Suspended" || employer.emailVerified !== true) {
            return res.status(403).json({ success: false, message: "Your employer account must be active and email verified before posting jobs." });
        }
        const validationError = validateJobFields(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const jobs = readJobs();

        const job = {
            id: Date.now().toString(),
            title: req.body.title.trim(),
            location: req.body.location.trim(),
            description: req.body.description.trim(),
            skills: req.body.skills.trim(),
            payment: String(req.body.payment).trim(),
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            duration: `${req.body.startDate} to ${req.body.endDate}`,
            deadline: req.body.deadline,
            status: "Active",
            approved: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            employerId: String(req.body.employerId || "").trim(),
            employerName: String(req.body.employerName || "").trim(),
            employerEmail: String(req.body.employerEmail || "").trim().toLowerCase()
        };

        jobs.push(job);
        saveJobs(jobs);
        notifyStudents(job);

        res.status(201).json({
            success: true,
            message: "Job posted successfully",
            job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not create job"
        });
    }
}

function updateJob(req, res) {
    try {
        const jobs = readJobs();
        const index = jobs.findIndex(job => job.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const owner = getEmployers().find(e => String(e.id) === String(jobs[index].employerId));
        if (!owner || owner.status === "Suspended" || owner.emailVerified !== true) {
            return res.status(403).json({ success: false, message: "Your employer account must be active and verified before managing jobs." });
        }

        const updatedData = {
            ...jobs[index],
            ...req.body
        };

        const validationError = validateJobFields(updatedData);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        updatedData.id = jobs[index].id;
        updatedData.employerId = jobs[index].employerId;
        updatedData.employerName = jobs[index].employerName;
        updatedData.employerEmail = jobs[index].employerEmail;
        updatedData.createdAt = jobs[index].createdAt;
        updatedData.updatedAt = new Date().toISOString();

        jobs[index] = updatedData;
        saveJobs(jobs);

        res.json({
            success: true,
            message: "Job updated successfully",
            job: updatedData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not update job"
        });
    }
}

function deleteJob(req, res) {
    try {
        const jobs = readJobs();
        const index = jobs.findIndex(job => job.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const deletedJob = jobs.splice(index, 1)[0];
        saveJobs(jobs);

        res.json({
            success: true,
            message: "Job deleted successfully",
            job: deletedJob
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not delete job"
        });
    }
}

module.exports = {
    getJobs,
    createJob,
    updateJob,
    deleteJob
};
