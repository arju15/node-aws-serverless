"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const Joi = require('joi');

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.string(),
        type_going: Joi.string()
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
        let whereQry = { user_id: user['id'], event_id: apiData['event_id'] };

        let data = {
            event_id: apiData['event_id'],
            name: user['username'],
            type_going: apiData['type_going'],
            user_id: user['id']
        }

        let existingRecords = await DBManager.getData('going_users_in_event', '*', whereQry);
        if(existingRecords && existingRecords.length){
            await DBManager.dataUpdate("going_users_in_event", data, whereQry);
            response = { success: true, message: "Event updated Successfully." };
        }
        else {
            await DBManager.dataInsert('going_users_in_event', data);
            response = { success: true, message: "Event inserted Successfully"}
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
