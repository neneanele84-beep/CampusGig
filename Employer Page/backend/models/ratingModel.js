const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/ratings.json");

function getRatings() {
    const data = fs.readFileSync(filePath, "utf8");

    return JSON.parse(data);
}

function saveRatings(ratings) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(ratings, null, 2)
    );
}

module.exports = {
    getRatings,
    saveRatings
};