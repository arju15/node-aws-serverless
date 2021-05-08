"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils')
const Joi = require('joi');

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.string(),
        address: Joi.string(),
        street_address: Joi.string(),
        city: Joi.string(),
        address_state: Joi.string(),
        zipcode: Joi.string(),
        country: Joi.string()
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
        let whereQry = { event_id: apiData['event_id']};
        delete apiData.event_id;
        
        let existingRecords = await DBManager.getData('event_master', '*', whereQry);

        if(existingRecords && existingRecords.length){
            await DBManager.dataUpdate("event_master", apiData, whereQry);
            response = { success: true, message: "Address updated Successfully." };
        }
        else {
            response = { success: false, message: "No matching Event found."}
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
