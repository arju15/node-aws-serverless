"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let fieldsObj = "category_id, category_name, slug";
        
        let existingRecords = await DBManager.getData('event_categories_master', fieldsObj);
        if(existingRecords && existingRecords.length){
            response = { success: true, message: 'All Category List', data: existingRecords };
        }
        else {
            response = { success: true, message: 'No Category Found.'}
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
