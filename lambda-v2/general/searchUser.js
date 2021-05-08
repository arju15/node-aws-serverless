"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        await utils.verifyUser(event.headers.Authorization);
        let parameters = event.queryStringParameters;
        let key = '';
        if(event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
            if('key' in parameters && parameters.key){
                key = parameters.key;
            }
        let whereQry = { username: key, city: key, description: key };
        let fieldsObj = "user_id, username, city, description, first_name, last_name, profile_pic";
        
        let existingRecords = await DBManager.searchData('user_master', fieldsObj, whereQry);
        if(existingRecords && existingRecords.length) {
            response = { success: true, message: `Results with ${key}`, data: existingRecords };
        }
        else {
            response = { success: false, message: "0 Results found"}
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
        }else{
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, "Please provide query parameters, key=abc");
        }
    }catch(err) {
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
          return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
