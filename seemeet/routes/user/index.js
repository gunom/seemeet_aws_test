const express = require('express');
const router = express.Router();

router.delete('/userDelete',require('./userDELETE'));
module.exports = router;