"use strict";
const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../common/mysqlmanager");
const DBManager = new MDB();
const utils = require('../common/utils');

module.exports.handler = async function (event, context, callback) {
  var response = { success: false, message: "Server error! Please try again later" };
  try {
    let user = await utils.verifyUser(event.headers.Authorization);  
    var whereQry = { notify_user_id: user['id'] };
    var fieldsObj = "`id`, `_user_id`, `date_created`, `notif_type`, `payload_data`, `notify_user_id`, `notify_text` ";
    
    let existingRecords = await DBManager.getData("user_notification", fieldsObj, whereQry)
        if(existingRecords && existingRecords.length){
            response = { success: true, message: 'Notification', data: existingRecords }
        }
        else{
            response = { success: false, message: 'No notification found!' }
        }
      return awsRequestHelper.respondWithJsonBody(200, response);
  } catch (err) {
    response.message = err.message;
    if (err && err.status_code == 400) {
      return awsRequestHelper.respondWithJsonBody(400, response);
    }
    return awsRequestHelper.respondWithJsonBody(500, response);
  }
};
