const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/employers.json");

function getEmployers() {
    const data = fs.readFileSync(filePath, "utf8");

    return JSON.parse(data);
}

function saveEmployers(employers) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(employers, null, 2)
    );
}

module.exports = {
    getEmployers,
    saveEmployers
};