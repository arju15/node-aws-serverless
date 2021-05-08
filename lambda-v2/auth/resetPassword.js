"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');

const validate = function (body) {
    const schema = Joi.object().keys({
        newPassword: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (err, value) {

            if (err) {
                reject({ status_code: 400, message: 'Invalid input' });
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

        let newPassword = md5(apiData['newPassword']);
        let whereQry = { user_id: user['id'] };
        let existingRecords = await DBManager.getData('user_master', '*', whereQry, "OR");
       
        if(existingRecords && existingRecords.length){
                await DBManager.dataUpdate("user_master", { "password": newPassword }, whereQry);
                response = { success: true, message: "Password changed Successfully." };
        }
        else {
            response = { success: false, message: "Invalid token!" };
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    
    }catch(err){
        console.log("catchError", err);
        if (err && err.status_code == 400) {
            response.message = err.message;
          return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
