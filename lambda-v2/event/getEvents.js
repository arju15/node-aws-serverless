const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');


module.exports.handler = async function (event, context, callback) {

  var response = { success: false, message: "Server error! Please try again later" };

  try {
    let user = await utils.verifyUser(event.headers.Authorization);
    let resource = event.requestContext.resourcePath;

    let userId = user['id'];

    var whereQry = { user_id: userId };

    if (resource == "/event/{event_id}") {
      let eventId = event.pathParameters.event_id;
      whereQry.event_id = eventId;
    }
    // var fieldsObj = "`reward_id`, `title`, `description`, `image`, `no_of_people`, `start_date`, `end_date`, `reward_type`, `winner_type`, `terms_condition`, `date_created`, `date_modified`, `status`";
    var fieldsObj = "*";
    return MDBObject.getData("event_master", fieldsObj, whereQry).then((data) => {
      if (data.length > 0) {
        response = { success: true, message: "Event list successfully!", data: data }
      }
      else {
        response = { success: false, message: "No events found!" }
      }
      return awsRequestHelper.respondWithJsonBody(200, response);
    }).catch((error) => {
      console.log("error", error);
      return awsRequestHelper.respondWithJsonBody(500, response);
    });

  } catch (err) {
    response.message = err.message;
    if (err && err.status_code == 400) {
      return awsRequestHelper.respondWithJsonBody(400, response);
    }
    return awsRequestHelper.respondWithJsonBody(500, response);
  }
};
