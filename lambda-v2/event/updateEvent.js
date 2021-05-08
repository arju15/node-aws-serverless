const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();

const validate = function(body) {
  const schema = Joi.object().keys({
    user_id: Joi.number().required(),
    parent_id: Joi.number().required(),
    description: Joi.string().required(),
    event_type: Joi.string().required(),
    event_image: Joi.string().required(),
    address: Joi.string().required(),
    start_date_time: Joi.string().required(),
    end_date_time: Joi.string().required(),
    event_location: Joi.string().required(),
    longitude: Joi.required(),
    latitude: Joi.required(),
    category: Joi.string().required(),
    event_name: Joi.string().required(),
    phone: Joi.required(),
    email: Joi.string().required(),
    ticket_type: Joi.string().required(),
    state: Joi.string().required(),
    admission_ticket_type: Joi.string().required(),
    timezone: Joi.string().required(),
    venue_is: Joi.string().required(),
    street_address: Joi.string().required(),
    address_state: Joi.string().required(),
    city: Joi.string().required(),
    country_code: Joi.string().required(),
    country: Joi.string().required(),
    zipcode: Joi.number().required(),
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
    var whereQry = { event_id: eventId, user_id: userId };

    return MDBObject.dataUpdate("event_master", apiData, whereQry)
      .then(data => {
        response = { success: true, message: "Event update successfully!" };
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
