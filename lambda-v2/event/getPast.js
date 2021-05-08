"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');


module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let user = await utils.verifyUser(event.headers.Authorization);
        var datetime = new Date();
        var todayDate = datetime.toISOString().slice(0,10);
        let sqlQuery = `SELECT * from event_master where _user_id = ${user['id']} AND start_date_time <'${todayDate}'`;
        let existingRecords = await DBManager.runQuery(sqlQuery);
        if(existingRecords && existingRecords.length){
            response = { success: true, message: "Past Event", data: existingRecords};
        }
        else {
            response = { success: true, message: "No record found."}
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