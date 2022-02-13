const util = require('../../lib/util');
const statusCode = require('../../constants/statusCode');
const responseMessage = require('../../constants/responseMessage');
const db = require('../../db/db');
const { planDB } = require('../../db');
const jwtHandlers = require('../../lib/jwtHandlers');
const { send } = require('../../lib/slack');

module.exports = async (req, res) => {
  //let userId=req.get("id");
  const { accesstoken } = req.headers;
  const { year, month } = req.params;

  if (!year || !month) {
    await send(`year: ${year}\nmonth: ${month}\n`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;
    if (!userId || !accesstoken) {
      await send(`userId ${userId}\naccesstoken: ${accesstoken}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    var alpha = year;
    var beta = parseInt(month) - 1;

    if (beta == 0) {
      alpha = parseInt(year) - 1;
      beta = 12;
    }
    const plan1 = await planDB.get3MonthPlan(client, userId, parseInt(alpha), parseInt(beta));

    const plan = await planDB.get3MonthPlan(client, userId, parseInt(year), parseInt(month));

    alpha = year;
    beta = parseInt(month) + 1;

    if (beta == 13) {
      alpha = parseInt(year) + 1;
      beta = 1;
    }

    const plan2 = await planDB.get3MonthPlan(client, userId, parseInt(alpha), parseInt(beta));

    const data = [...plan1, ...plan, ...plan2];

    if (!data) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_POST));

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ONE_POST_SUCCESS, data));
  } catch (error) {
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};
