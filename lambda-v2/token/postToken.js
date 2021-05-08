"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');

const validate = function (body) {
    const schema = Joi.object().keys({
        token: Joi.string().required(),
        device_type: Joi.string().required()
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
        let user_id = user['id'];

        let data = {
            token: apiData['token'],
            device_type: apiData['device_type'],
            _user_id: user_id
        }
        let existingRecords = await DBManager.getData('app_token_master', '*', data, "AND");

        if(!existingRecords.length){
            await DBManager.dataInsert("app_token_master", data);
            response = { success: true, message: "Token stored Successfully" }; 
        }else{
            response.message = "Token already exist.";
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
