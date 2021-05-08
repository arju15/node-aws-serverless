"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const Joi = require('joi');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let user = await utils.verifyUser(event.headers.Authorization);
        let parameters = event.queryStringParameters;
        let user_id = '';
        let whereQry;

        if(event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
            if('user_id' in parameters && parameters.user_id){
                user_id = parameters.user_id;
               whereQry = { _user_id: user_id };
            }
        }
        else{
                 whereQry = { _user_id: user['id']};
            }
        let fieldsObj = "event_master.event_id, event_master.event_image, event_master.address, event_master.category, event_master.description, event_master.event_name, going_users_in_event.type_going"
        
        let existingRecords = await DBManager.getJoinedData('going_users_in_event', 'event_master', 'event_id', 'event_id', fieldsObj, whereQry);
        if(existingRecords && existingRecords.length){
            response = { success: true, message: "Interested Events", data: existingRecords };
        }
        else {
            response = { success: true, message: "No events found."}
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
