const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();

const validate = function (body) {
  const schema = Joi.object().keys({
    user_id: Joi.number().required()
  });
  return new Promise((resolve, reject) => {
    Joi.validate(body, schema, {
      abortEarly: false
    }, function (err, value) {
      if (err) {
        reject({ status_code: 400, message: err.details[0].message });
      }
      else {
        resolve(value);
      }
    });
  });
}

module.exports.handler = async function (event, context, callback) {

  var response = { success: false, message: "Server error! Please try again later" };

  try {
    let resource = event.requestContext.resourcePath;
    let userId = event.queryStringParameters.user_id;
    var whereQry = { _user_id: userId };
    if(resource == "/reward/{reward_id}"){
        let rewardId = event.pathParameters.reward_id;
        whereQry.reward_id = rewardId;
    }
    var fieldsObj = "`reward_id`, `title`, `description`, `image`, `no_of_people`, `start_date`, `end_date`, `reward_type`, `winner_type`, `terms_condition`, `date_created`, `date_modified`, `status`";

    return MDBObject.getData("reward_master", fieldsObj, whereQry).then((data) => {
        if(data.length > 0){
            response = { success: true, message: "Reward list successfully!", data: data }
        }
        else{
            response = { success: false, message: "No rewards found!" }
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
