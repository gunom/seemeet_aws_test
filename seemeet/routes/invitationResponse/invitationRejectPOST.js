const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { invitationResponseDB, invitationDB } = require('../../../db');
const { send } = require('../../../lib/slack');

module.exports = async (req, res) => {
  const { invitationId } = req.params;
  const { accesstoken } = req.headers;

  if (!invitationId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationDB.getInvitationById(client, invitationId);
    const guests = await invitationDB.getGuestByInvitationId(client, invitationId);

    const guestIds = guests.map(function (value) {
      return value['id'];
    });

    if (!guestIds.includes(userId)) {
      await send(`
      req.originalURL: ${req.originalUrl}
      guestsIds: ${guestIds}
      userId: ${userId}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 약속에 포함된 게스트가 아닙니다.'));
    }

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
    const data = await invitationResponseDB.rejectInvitation(client, userId, invitationId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_REJECT_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_REJECT_SUCCESS, data));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
