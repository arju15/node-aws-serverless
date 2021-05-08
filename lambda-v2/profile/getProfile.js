const awsRequestHelper = require("../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../common/mysqlmanager");
const DBManager = new MDB();

module.exports.handler = async function (event, context, callback) {
  var response = { success: false, message: "Server error! Please try again later" };
  try {
    let userId =  event.pathParameters['user_id'];
    var whereQry = { user_id: userId };
    var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`";
    return DBManager.getData("user_master", fieldsObj, whereQry).then((data) => {
        if(data.length > 0){
            response = { success: true, message: "Profile data", data: data }
        }
        else{
            response = { success: false, message: "No user found!" }
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
