const express=require('express');
const controller=require('../controllers/passwordController');
const router=express.Router();
router.get('/security-question',controller.getSecurityQuestion);
router.post('/setup-security',controller.setupSecurityQuestion);
router.post('/verify-answer',controller.verifySecurityAnswer);
router.post('/reset',controller.resetPassword);
module.exports=router;
