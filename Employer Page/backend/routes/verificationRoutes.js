const express = require('express');
const { sendVerification, verify, status } = require('../controllers/verificationController');
const router = express.Router();
router.get('/status', status);
router.post('/send', sendVerification);
router.post('/verify', verify);
module.exports = router;
