"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const ITEMS_PER_PAGE = 10;

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        await utils.verifyUser(event.headers.Authorization);
        let parameters = event.queryStringParameters;
        let offset = 0;
        let limit = ITEMS_PER_PAGE;
        if(event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
            if('limit' in parameters && parameters.limit){
                limit = parameters.limit;
            }
            if('offset' in parameters && parameters.offset) {
                offset = parameters.offset * limit;
            }
        let totalRecord = await DBManager.countRecord('user_master');    
        var fieldsObj = " `user_id`, `username`, `first_name`, `last_name`, `about_you`, `profile_pic`, `city`, `description`, `email`";     

        let existingRecords = await DBManager.getLimitData('user_master',fieldsObj, offset, limit);
        
        if(existingRecords && existingRecords.length) {
            response = { success: true, message: "All User List", data: existingRecords, total: totalRecord[0].total, page: parseInt(parameters.page), limit };
        }
        else {
            response = { success: true, message: "No User Found.", data: []}
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
       }else{
        awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, "Please provide query parameters");
    }
    }catch(err){
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
          return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
