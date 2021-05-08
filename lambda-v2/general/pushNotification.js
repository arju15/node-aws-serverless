"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const Joi = require('joi');

const validate = function (body) {
    const schema = Joi.object().keys({
        notif_type: Joi.string(),
        payload_data: Joi.string(),
        notify_user_id: Joi.string(),
        notify_text: Joi.string()
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
        
        let data = {
           _user_id: user['id'],
           notif_type: apiData['notif_type'],
           payload_data: apiData['payload_data'],
           notify_user_id: apiData['notify_user_id'],
           notify_text: apiData['notify_text']
        }
        
        await DBManager.dataInsert('user_notification', data);
        response = { success: true, message: "Notification pushed successfully."}
                  
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
