const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const { invitationDB } = require('../../../db');
const { send } = require('../../../lib/slack');
const jwtHandlers = require('../../../lib/jwtHandlers');

module.exports = async (req, res) => {
  const { invitationId } = req.params;
  const { accesstoken } = req.headers;
  if (!invitationId) {
    await send(`
      req.originalURL: ${req.originalUrl}
      invitationId: ${invitationId}
    `);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationDB.getInvitationById(client, invitationId);
    if (!invitation) {
      await send(`
      req.originalURL: ${req.originalUrl}
      invitationId: ${invitationId}
      `);
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
    }
    if (invitation.isConfirmed || invitation.isCancled) {
      await send(`
        req.originalURL: ${req.originalUrl}
        isConfirmed: ${invitation.isConfirmed}
        isCancled: ${invitation.isCancled}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_CONFIRM));
    }
    const host = await invitationDB.getHostByInvitationId(client, invitationId);
    if (host.id != userId) {
      await send(`
      req.originalURL: ${req.originalUrl}
      hostId: ${host.id}
      userId: ${userId}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 유저가 보낸 약속이 아닙니다.'));
    }
    const data = await invitationDB.cancleInvitation(client, invitationId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_CANCLE_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_CANCLE_SUCCESS, data));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
