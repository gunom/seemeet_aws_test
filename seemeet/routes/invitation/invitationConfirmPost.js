const functions = require('firebase-functions');
const util = require('../../../lib/util');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const { invitationDB } = require('../../../db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { send } = require('../../../lib/slack');

module.exports = async (req, res) => {
  const { invitationId } = req.params;
  const { dateId } = req.body;
  const { accesstoken } = req.headers;

  if (!dateId || !accesstoken) {
    await send(`
    req.originalURL: ${req.originalUrl}
    dateId: ${dateId},
    accesstoken: ${accesstoken}
    `);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationDB.getInvitationById(client, invitationId);
    const invitationByDateId = await invitationDB.getInvitationByDateId(client, dateId, invitationId);
    if (!invitationByDateId) {
      await send(
        `
        req.originalURL: ${req.originalUrl},
        invitation: ${JSON.stringify(invitation)}
        dateId: ${invitationByDateId}
        `,
      );
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_INVITATION_DATE));
    }
    if (!invitation) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
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
    const guests = await invitationDB.getGuestByInvitationId(client, invitationId);
    const data = await invitationDB.confirmInvitation(client, host, invitationId, guests, dateId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_CONFIRM_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_CONFIRM_SUCCESS, data));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
