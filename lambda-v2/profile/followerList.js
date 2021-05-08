"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

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
        let fieldsObj = "user_master.user_id, user_master.username, user_master.first_name, user_master.last_name "
       
        let existingRecords = await DBManager.getJoinedData('follow_users', 'user_master', '_user_id', 'user_id', fieldsObj, whereQry );
        if(existingRecords && existingRecords.length){
            response = { success: true, message: "Followers List", data: existingRecords };
        }
        else {
            response = { success: true, message: "No followers found."}
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
