const express = require("express");
const {
    createApplication,
    getApplications,
    getStudentApplications,
    updateApplicationStatus,
    getStudentNotifications,
    getRankedApplications
} = require("../controllers/applicationController");

const router = express.Router();
router.get("/", getApplications);
router.get("/student", getStudentApplications);
router.post("/", createApplication);
router.put("/:id/status", updateApplicationStatus);
router.get("/notifications/student", getStudentNotifications);
router.get("/job/:jobId/ranked", getRankedApplications);
module.exports = router;
