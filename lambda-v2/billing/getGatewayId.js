"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let user = await utils.verifyUser(event.headers.Authorization);
        // let fieldsObj = "user_master.user_id, user_master.username, user_master.first_name, user_master.last_name "
       
        let existingRecords = await DBManager.getData('user_payment_gateway', 'gateway_id', { _user_id: user['id'] });
        if(existingRecords && existingRecords.length){
            response = { success: true, message: "Gateway Id", data: existingRecords };
        }
        else {
            response = { success: true, message: "Invalid User"}
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
