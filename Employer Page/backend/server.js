require('dotenv').config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const employerRoutes = require("./routes/employerRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const studentRoutes = require("./routes/studentRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const passwordRoutes = require("./routes/passwordRoutes");

const app = express();
const dataDirectory = path.join(__dirname, "data");
const dataFiles = [
    "applications.json",
    "employers.json",
    "jobs.json",
    "notifications.json",
    "ratings.json",
    "reports.json",
    "students.json"
];

fs.mkdirSync(dataDirectory, { recursive: true });
for (const file of dataFiles) {
    const filePath = path.join(dataDirectory, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]", { flag: "wx" });
    }
}

const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/employers", employerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/password", passwordRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CampusGig backend is running"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusGig backend listening on port ${PORT}`);
});