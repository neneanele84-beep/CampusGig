const LOCATION_COORDINATES = {
    "Richards Bay": { lat: -28.7807, lon: 32.0383 },
    "Empangeni": { lat: -28.7619, lon: 31.8933 },
    "Mtunzini": { lat: -28.9553, lon: 31.7570 },
    "Esikhaleni": { lat: -28.8833, lon: 32.0833 },
    "Felixton": { lat: -28.8170, lon: 31.8920 },
    "Mthunzini": { lat: -28.9553, lon: 31.7570 },
    "Meerensee": { lat: -28.7700, lon: 32.0600 },
    "Arboretum": { lat: -28.7600, lon: 32.0200 },
    "Brackenham": { lat: -28.7900, lon: 32.0500 },
    "Alton": { lat: -28.7300, lon: 32.0100 }
};

const PRIMARY_LOCATIONS = ["Richards Bay", "Empangeni"];
const NEARBY_RADIUS_KM = 35;

function normaliseLocation(value = "") {
    return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function findKnownLocation(value = "") {
    const normalized = normaliseLocation(value);
    return Object.keys(LOCATION_COORDINATES).find(
        name => {
            const known = normaliseLocation(name);
            return normalized === known ||
                normalized.includes(known) ||
                known.includes(normalized);
        }
    );
}

function isAllowedJobLocation(location = "") {
    const normalized = normaliseLocation(location);

    if (
        normalized === "richards bay" ||
        normalized === "richardsbay" ||
        normalized === "empangeni"
    ) {
        return true;
    }

    return normalized.includes("nearby") ||
        normalized.includes("richards bay") ||
        normalized.includes("empangeni");
}

function distanceKm(fromLocation, toLocation) {
    const from = LOCATION_COORDINATES[findKnownLocation(fromLocation)];
    const to = LOCATION_COORDINATES[findKnownLocation(toLocation)];

    if (!from || !to) return null;

    const earthRadius = 6371;
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lon - from.lon) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rankCandidate(candidateLocation, jobLocation) {
    const candidate = findKnownLocation(candidateLocation);
    const job = findKnownLocation(jobLocation);

    if (!candidate || !job) {
        const candidateText = normaliseLocation(candidateLocation);
        const jobText = normaliseLocation(jobLocation);

        if (candidateText && jobText && candidateText === jobText) {
            return { score: 100, proximity: "Same area", distanceKm: 0 };
        }

        return {
            score: 0,
            proximity: "Location not verified",
            distanceKm: null
        };
    }

    const distance = distanceKm(candidate, job);

    if (distance === null) {
        return { score: 0, proximity: "Location not verified", distanceKm: null };
    }

    let score = Math.max(0, Math.round(100 - distance * 2.5));

    if (normaliseLocation(candidate) === normaliseLocation(job)) {
        score = 100;
    }

    return {
        score,
        distanceKm: Math.round(distance * 10) / 10,
        proximity:
            distance <= 5 ? "Very close" :
            distance <= 15 ? "Local" :
            distance <= NEARBY_RADIUS_KM ? "Nearby" :
            "Outside local area"
    };
}

function rankCandidates(candidates = [], jobLocation) {
    return candidates
        .map(candidate => {
            const location =
                candidate.location ||
                candidate.studentLocation ||
                candidate.address ||
                candidate.city ||
                "";

            return {
                ...candidate,
                location,
                proximity: rankCandidate(location, jobLocation)
            };
        })
        .sort((a, b) => b.proximity.score - a.proximity.score);
}

module.exports = {
    PRIMARY_LOCATIONS,
    NEARBY_RADIUS_KM,
    isAllowedJobLocation,
    rankCandidate,
    rankCandidates
};
