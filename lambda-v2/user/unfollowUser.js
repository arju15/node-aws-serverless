"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const Joi = require('joi');
const validate = function (body) {
    const schema = Joi.object().keys({
        follow_user_id: Joi.string()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (err, value) {

            if (err) {
                reject({ status_code: 400, message: err.details[0].message });
            }
            else {
                resolve(value);
            }
        });
    });
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let whereQry = { follow_user_id: apiData['follow_user_id'], _user_id: user['id'] };

        let existingRecords = await DBManager.getData('follow_users', '*', whereQry);
        if(existingRecords && existingRecords.length){
            await DBManager.dataDelete('follow_users', whereQry, "AND")
            response = { success: true, message: "User unfollowed." };
        }
        else {
            response = { success: false, message: "No data found"}
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    }catch(err){
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
          return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
