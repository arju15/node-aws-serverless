"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const utils = require('./../common/utils');

const validate = function (body) {
    const schema = Joi.object().keys({
        username: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        city: Joi.string().required(),
        city_lat: Joi.string().required(),
        city_long: Joi.string().required()
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
    try{
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let user = {
            username: apiData['username'],
            email: apiData['email'],
            password: md5(apiData['password']),
            city: apiData['city'],
            city_lat: apiData['city_lat'],
            city_long: apiData['city_long']
        }

        let whereQry = { username: apiData['username'], email: apiData['email'] };
        let existingRecords = await DBManager.getData('user_master', 'user_id', whereQry, "OR");
        if(!existingRecords.length){
            await DBManager.dataInsert("user_master", user);
            var fieldsObj = "`user_id`, `username`, `first_name`, `last_name`, `email`, `profile_pic`, `about_you`, `city`, `city_lat`, `city_long`";
            let res = await DBManager.getData("user_master", fieldsObj, whereQry, "OR");
            let result = res[0];
            let profileData = {
                id: result['user_id'],
                username: result['username'],
                email: result['email']
            }
            
            let token = utils.createJWT(profileData);

            let data = {
                profile: result,
                token
            };
            response = { success: true, message: "Register Successfully", data: data }; 
        }else{
            response.message = "Username or email already exist.";
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
