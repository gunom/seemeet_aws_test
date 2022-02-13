const express = require('express');
const router = express.Router();

router.get("/list", require('./friendListGET'));
router.post("/search",require('./friendSearchGET'));
router.post("/addFriend",require('./friendAddPOST.js'));
router.put("/block",require('./friendBlockPUT'));
router.put("/cancelblock",require('./friendCancelBlockPUT'));
//안쓰는기능
router.put("/accept",require('./friendAcceptPUT(unuse)'));
module.exports = router;