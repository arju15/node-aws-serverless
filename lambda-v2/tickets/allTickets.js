"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let user = await utils.verifyUser(event.headers.Authorization);
        let whereQry = { user_id: user['id'] };
        let fieldsObj = "user_tickets.user_id, event_master.event_image, event_master.address, event_master.category,  event_master.description, event_master.event_id, event_master.event_name, event_master.start_date_time, event_master.end_date_time, event_master.status, user_tickets.ticket_qty, user_tickets.event_status, user_tickets.attendee, user_tickets._ticket_id";
        
        let existingRecords = await DBManager.getJoinedData('user_tickets', 'event_master', 'event_id', 'event_id', fieldsObj, whereQry);
        if(existingRecords && existingRecords.length){
            response = { success: true, message: "All Tickets", data: existingRecords };
        }
        else {
            response = { success: true, message: "No tickets booked."}
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
