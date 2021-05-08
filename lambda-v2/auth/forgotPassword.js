"use strict";
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const _ = require('lodash');
const awsManager = require('../common/awsmanager');

const validate = function (body) {
    const schema = Joi.object().keys({
        email: Joi.string().required()
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
//Create JWT
const createJWT = (parsedBody) => {
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};
module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try{
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let whereQry = {  email: apiData['email'] };
        var fieldsObj = "`user_id`, `username`, `email`";
        let existingRecords = await DBManager.getData('user_master', fieldsObj, whereQry, "OR");
        if(existingRecords.length){
            let result = existingRecords[0];
            let user = {
                id: result['user_id'],
                username: result['username'],
                email: result['email']
            }
            let token = await createJWT(user);
            let tmpl = fs.readFileSync('./lambda-v2/emailTemplates/reset-password.html', 'utf8');
            let templateVars = {
                base_url: process.env.UI_BASE_URL,
                resetPasswordUrl: `${process.env.RESET_PASSWORD_URL}?token=${token}`,
                name: user.username,
                title: 'RESET PASSWORD'
            };
            let body = _.template(tmpl)(templateVars);
            var toAddress = new Array(user.email);
            var mailResponse = awsManager.sendEmail(
                toAddress,
                body,
                'Reset Password',
                process.env.FROM
            );
            response = { success: true, message: "Reset password link sent to Email, Please check your mail."}; 
        }else{
            response.message = "Email not exits in system";
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
