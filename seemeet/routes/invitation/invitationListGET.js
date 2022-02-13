const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const { invitationDB } = require('../../../db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { send } = require('../../../lib/slack');

module.exports = async (req, res) => {
  const { accesstoken } = req.headers;

  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;

    if (!userId) {
      await send(`
      req.originalURL: ${req.originalUrl},
      userId: ${userId}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    const invitations = await invitationDB.getAllInvitation(client, userId);

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_INVITATION_SUCCESS, invitations));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
