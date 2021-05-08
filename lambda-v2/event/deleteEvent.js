const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();

const validate = function(body) {
  const schema = Joi.object().keys({
    user_id: Joi.number().required()
  });
  return new Promise((resolve, reject) => {
    Joi.validate(
      body,
      schema,
      {
        abortEarly: false
      },
      function(err, value) {
        if (err) {
          reject({ status_code: 400, message: err.details[0].message });
        } else {
          resolve(value);
        }
      }
    );
  });
};

module.exports.handler = async function(event, context, callback) {
  var response = {
    success: false,
    message: "Server error! Please try again later"
  };

  try {
    let eventId = event.pathParameters.event_id;
    let apiData = JSON.parse(event.body);
    await validate(apiData);

    var userId = apiData.user_id;
    delete apiData.user_id;

    var dataObj = { is_deleted: 1 };
    var whereQry = { event_id: eventId, user_id: userId };

    return MDBObject.dataUpdate("event_master", dataObj, whereQry)
      .then(data => {
        response = { success: true, message: "Event delete successfully!" };
        return awsRequestHelper.respondWithJsonBody(200, response);
      })
      .catch(error => {
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
