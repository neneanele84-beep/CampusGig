const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/applications.json");

function getApplications() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }

    const data = fs.readFileSync(filePath, "utf8").trim();
    return data ? JSON.parse(data) : [];
}

function saveApplications(applications) {
    fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
}

module.exports = {
    getApplications,
    saveApplications
};
