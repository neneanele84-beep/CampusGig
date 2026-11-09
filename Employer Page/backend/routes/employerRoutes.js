const express = require("express");
const {
    registerEmployer,
    loginEmployer,
    getProfile,
    updateProfile
} = require("../controllers/employerController");

const router = express.Router();
router.post("/register", registerEmployer);
router.post("/login", loginEmployer);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
module.exports = router;
