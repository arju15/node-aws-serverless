const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const AWS = require('aws-sdk');
const BUCKET_IMAGE = 'promoappdata' + process.env.API_PREFIX;
const S3 = new AWS.S3();
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();

const validate = function (body) {
  const schema = Joi.object().keys({
    is_draft: Joi,
    description: Joi.string().allow(""),
    event_type: Joi.string().allow(""),
    event_image: Joi.string().allow(""),
    address: Joi.string().allow(""),
    sponsored_event: Joi,
    isPHQ: Joi,
    guest: Joi.string().allow(""),
    start_date_time: Joi.string().allow(""),
    end_date_time: Joi.string().allow(""),
    longitude: Joi.allow(""),
    latitude: Joi.allow(""),
    category: Joi.string().allow(""),
    event_name: Joi.string().allow(""),
    phone: Joi.allow(""),
    email: Joi.string().allow(""),
    ticket_type: Joi.string().allow(""),
    state: Joi.string().allow(""),
    admission_ticket_type: Joi.string().allow(""),
    timezone: Joi.string().allow(""),
    venue_is: Joi.string().allow(""),
    street_address: Joi.string().allow(""),
    address_state: Joi.string().allow(""),
    city: Joi.string().allow(""),
    country_code: Joi.string().allow(""),
    country: Joi.string().allow(""),
    zipcode: Joi.string().allow("")
  });
  return new Promise((resolve, reject) => {
    Joi.validate(body, schema, {
      abortEarly: false,
      allowUnknown: true
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
    let user = await utils.verifyUser(event.headers.Authorization);
    let apiData = JSON.parse(event.body);
    await validate(apiData);

    apiData._user_id = user['id'];

    var fileName = user.id + "-" + new Date().getTime();
    let key = `event-images/${fileName}.png`;
    let eventImage = apiData['event_image'];
    if (eventImage) {
      const base64Data = new Buffer(eventImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      const type = eventImage.split(';')[0].split('/')[1];
      let params = {
        Body: base64Data,
        Bucket: BUCKET_IMAGE,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: `image/${type}`,
        Key: key
      };
      await S3.putObject(params).promise();
      apiData.event_image = `https://s3.${process.env.REGION}.amazonaws.com/${BUCKET_IMAGE}/${key}`;
    }
    else{
      apiData.event_image = "";
    }

    return MDBObject.dataInsert("event_master", apiData).then((data) => {
      response = { success: true, message: "Event create successfully!" }
      return awsRequestHelper.respondWithJsonBody(200, response);
    }).catch((error) => {
      console.log("error", error);
      return awsRequestHelper.respondWithJsonBody(500, response);
    });

  } catch (err) {
    console.log("catchError", err);
    response.message = err.message;
    if (err && err.status_code == 400) {
      return awsRequestHelper.respondWithJsonBody(400, response);
    }
    return awsRequestHelper.respondWithJsonBody(500, response);
  }
};
