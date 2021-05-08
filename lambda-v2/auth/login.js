"use strict";
var md5 = require('md5');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const _ = require('lodash');
const utils = require('./../common/utils');
const Joi = require('joi');

const validate = function (body) {
    const schema = Joi.object().keys({
        username: Joi.string().required(),
        password: Joi.string().required()
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
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        var password = md5(apiData['password']);

        let usernameLogin = {
            username: apiData['username'],
            password: password
        }
        let emailLogin = {
            email: apiData['username'],
            password: password
        }
        var isAuth = false;
        response.message = "Invalid username or password";
        let resultUsername = await DBManager.getData('user_master', "*", usernameLogin);
        let resultEmail = await DBManager.getData('user_master', "*", emailLogin);
        if(resultUsername && resultUsername.length > 0){
            var userResult = resultUsername[0];
            isAuth = true;
        }
        else if(resultEmail && resultEmail.length > 0){
            var userResult = resultEmail[0];
            isAuth = true;
        }
        else{

        }

        if(isAuth){
            if (userResult && userResult['password'] === password) {
                let user = {
                    id: userResult['user_id'],
                    username: userResult['username'],
                    email: userResult['email']
                };
           
                let token = utils.createJWT(user);
                
                let responseData = {
                    user_id: userResult['user_id'],
                    email: userResult['email'],
                    username: userResult['username'],
                    first_name: userResult['first_name'],
                    last_name: userResult['last_name'],
                    profile_pic: userResult['profile_pic'],
                    about_you: userResult['about_you'],
                    city: userResult['city'],
                    city_lat: userResult['city_lat'],
                    city_long: userResult['city_long'],
                    token
                };
                response = { success: true, message: "Login success", data: responseData };
            }
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
