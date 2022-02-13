const express = require('express');
const router = express.Router();

router.post('/register', require('./authSignupPOST'));
router.post('/login', require('./authLoginEmailPOST'));
module.exports = router;
