"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const BUCKET_IMAGE = 'promoappdata' + process.env.API_PREFIX;
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('../common/utils');

const validate = function (body) {
    const schema = Joi.object().keys({
        first_name: Joi.string().allow(""),
        last_name: Joi.string().allow(""),
        city: Joi.string().allow(""),
        city_lat: Joi.string().allow(""),
        city_long: Joi.string().allow(""),
        about_you: Joi.string().allow(""),
        profile_pic: Joi.string(),
        email: Joi.string().allow("")
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
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        console.log(apiData);
        let key = `${user.username}/${user.id}.png`;
        let profileImage = apiData['profile_pic'];
        if (profileImage) {
            const base64Data = new Buffer(profileImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const type = profileImage.split(';')[0].split('/')[1];
            let params = {
                Body: base64Data,
                Bucket: BUCKET_IMAGE,
                ACL: 'public-read',
                // ContentEncoding: 'base64',
                ContentType: `image/${type}`,
                Key: key
            };
            await S3.putObject(params).promise();
            apiData.profile_pic = `https://s3.${process.env.REGION}.amazonaws.com/${BUCKET_IMAGE}/${key}`;
        }
        let whereQry = { user_id: user['id'] };
        let existingRecords = await DBManager.getData('user_master', '*', whereQry, "OR");

        if (existingRecords && existingRecords.length) {
            await DBManager.dataUpdate("user_master", apiData, whereQry);

            let resultData = await DBManager.getData('user_master', '*', whereQry, "OR");
            var userResult = resultData[0];
            let responseData = {
                email: userResult['email'],
                username: userResult['username'],
                first_name: userResult['first_name'],
                last_name: userResult['last_name'],
                profile_pic: userResult['profile_pic'],
                about_you: userResult['about_you'],
                city: userResult['city'],
                city_lat: userResult['city_lat'],
                city_long: userResult['city_long']
            };
            response = { success: true, message: "Profile updated Successfully.", data: responseData };
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (err) {
        console.log("catchError", err);
        response.message = err.message;
        if (err && err.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}
