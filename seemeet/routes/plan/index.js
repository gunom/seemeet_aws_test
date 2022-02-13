const express = require('express');
const router = express.Router();


router.get('/response/:dateId', require('./planDateGET'));
router.get('/month/:year/:month', require('./planMonthGET'));
router.get('/detail/:planId', require('./planDetailGET'));
router.get('/comeplan/:year/:month', require('./planComeGET'));
router.get('/invitationplan/:year/:month', require('./planinvitationGET'));
router.get('/lastplan/:year/:month/:day', require('./planLastGET'));
module.exports = router;