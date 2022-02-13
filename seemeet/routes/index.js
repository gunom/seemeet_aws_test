const express = require('express');
const router = express.Router();

router.use('/plan', require('./plan'));
// router.use('/invitation', require('./invitation'));
// router.use('/invitation-response', require('./invitationResponse'));
// router.use('/friend', require('./friend'));
// router.use('/auth', require('./auth'));
router.use('/user', require('./user'));

module.exports = router;
