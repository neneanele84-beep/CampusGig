const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/jobs.json");

function getJobs() {
    const data = fs.readFileSync(filePath, "utf8");

    return JSON.parse(data);
}

function saveJobs(jobs) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(jobs, null, 2)
    );
}

module.exports = {
    getJobs,
    saveJobs
};