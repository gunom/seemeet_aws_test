const _ = require('lodash');
const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const deleteUser = async (client, userId) => {
  const { rows } = await client.query(
    `UPDATE "user" as u
        SET is_deleted = TRUE, updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
    [userId],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const returnUser = async(client, email)=>{
  const {rows} = await client.query(
    `UPDATE "user" as u
      SET is_deleted =false, updated_at = now()
      WHERE email = $1 AND is_deleted = true
      RETURNING *
    `,
    [email],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const addUser = async(client, email, username,id_Firebase)=>{
    const {rows} = await client.query(
        `
        INSERT INTO "user"
        (email,username,id_Firebase)
        VALUES
        ($1, $2, $3)
        RETURNING *
        `,
    [email, username, id_Firebase],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getUserByIdFirebase = async (client, idFirebase) => {
  const { rows } = await client.query(
    `
        SELECT * FROM "user" as u
        WHERE id_firebase = $1
        AND is_deleted = FALSE
        `,
    [idFirebase],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const getUserinfoByuserIds = async (client,userIds)=>{
    const{rows}= await client.query(
        `
        SELECT u.id,u.username,u.email FROM "user" u
        WHERE id IN(${userIds.join()})
        AND is_deleted = FALSE
        ORDER BY username
        `,
    );
    return convertSnakeToCamel.keysToCamel(rows);
}

module.exports = {deleteUser,addUser,getUserByIdFirebase,getUserinfoByuserIds,returnUser};