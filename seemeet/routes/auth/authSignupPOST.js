//이름 아이디 성별 생년월일 비밀번호 비밀번호 확인
const functions = require('firebase-functions');
const util = require('../../../lib/util');
const admin = require('firebase-admin');
const statusCode = require('../../../constants/statusCode');
const responseMessage = require('../../../constants/responseMessage');
const db = require('../../../db/db');
const jwtHandlers = require('../../../lib/jwtHandlers');
const { userDB } = require('../../../db');
const { stubString } = require('lodash');
const { send } = require('../../../lib/slack');

module.exports = async (req, res) => {

  const {email, username,password,passwordConfirm} = req.body
  
  // 필요한 값이 없을 때 보내주는 response
  if (!email || !username ||!password ||!passwordConfirm){
    await send(`email : ${email}\nusername : ${username}`)
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  } 

  if(password.length < 8) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST,responseMessage.PASSWORD_LENGTH_SHORT));

  if(password != passwordConfirm) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST,responseMessage.PASSWORD_IS_NOT_CORRECT));

  
  let client;
  try {
    client = await db.connect(req);
    const userFirebase = await admin
    .auth()
    .createUser({email, password, username})
    .then((user)=>user)
    .catch((e)=>{
        console.log(e);
        return {err:true, error :e };
    });

    if(userFirebase.err){
        if(userFirebase.error.code === 'auth/email-already-exists'){
          const checkuser = await userDB.returnUser(client,email);
          if(!checkuser){
            return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, '해당 이메일을 가진 유저가 이미 있습니다.'));
          }else{
            return res.status(statusCode.OK).json(util.success(statusCode.OK, '재가입하였습니다.'))
          }

        }else if(userFirebase.error.code === 'auth/invalid-password'){
            return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, ' 비밀번호 형식이 잘못되었습니다. 패스워드는 최소 6자리의 문자열이어야합니다.')); 
        }else if(userFirebase.error.code === 'auth/invalid-email'){
            return res.status(statusCode.NOT_FOUND).json(util.fail(statusCode.NOT_FOUND, '이메일 형식이 올바르지 않습니다.'))
        }else {
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(util.fail(statusCode.INTERNAL_SERVER_ERROR,responseMessage.INTERNAL_SERVER_ERROR));
        }
    }
    const id_Firebase = userFirebase.uid;
    const user = await userDB.addUser(client, email, username, id_Firebase);
    if(!user){
      await send(`email : ${email}, username : ${username}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    const {accesstoken} = jwtHandlers.sign(user);
    if(!accesstoken){
      await send(`accesstoken : ${accesstoken}`);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST,responseMessage.NULL_VALUE));
    }
    
    // 성공적으로 users를 가져왔다면, response를 보내줍니다.
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.CREATED_USER, {user,accesstoken}));
    
    // try문 안에서 에러가 발생했을 시 catch문으로 error객체가 넘어옵니다.
    // 이 error 객체를 콘솔에 찍어서 어디에 문제가 있는지 알아냅니다.
    // 이 때 단순히 console.log만 해주는 것이 아니라, Firebase 콘솔에서도 에러를 모아볼 수 있게 functions.logger.error도 함께 찍어줍니다.
  } catch (error) { 
    functions.logger.error(`[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`, `[CONTENT] ${error}`);
    console.log(error);
    await send(error);
    // 그리고 역시 response 객체를 보내줍니다.
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
    
    // finally문은 try문이 끝나든 catch문이 끝나든 반드시 실행되는 블록입니다.
    // 여기서는 db.connect(req)를 통해 빌려온 connection을 connection pool에 되돌려줍니다.
    // connection을 되돌려주는 작업은 반드시 이루어져야 합니다.
    // 그렇지 않으면 요청의 양이 일정 수준을 넘어갈 경우 쌓이기만 하고 해결되지 않는 문제가 발생합니다.
  } finally {
    client.release();
  }
};
