"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');
const validate = function (body) {
    const schema = Joi.object().keys({
        token: Joi.string().required()
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
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let userId = user['id'];
        let token = apiData['token'];
        console.log("apiData", apiData);
        let whereQry = { token: token, _user_id: userId };
        let existingRecords = await DBManager.getData('app_token_master', '*', whereQry, "AND");

        if (existingRecords.length) {
            await DBManager.dataDelete("app_token_master", whereQry);
            response = { success: true, message: "Logout and Token deleted Successfully" };
        } else {
            response.message = "Token does not exist.";
        }

        return awsRequestHelper.respondWithJsonBody(200, response);

    } catch (err) {
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
