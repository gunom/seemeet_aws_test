const express = require('express');
const router = express.Router();

router.post('/:invitationId', require('./invitationResponsePOST'));
router.post('/:invitationId/reject', require('./invitationRejectPOST'));

module.exports = router;
