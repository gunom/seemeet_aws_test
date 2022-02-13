const express = require('express');
const router = express.Router();

router.get('/list', require('./invitationListGET'));
router.post('/', require('./invitationPOST'));
router.get('/:invitationId', require('./invitationGET'));
router.post('/:invitationId', require('./invitationConfirmPost'));
router.put('/:invitationId', require('./invitationCanclePUT'));

module.exports = router;
