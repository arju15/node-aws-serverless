"use strict";
const rp = require('request-promise');
const QB = require('quickblox');
const awsRequestHelper = require('./common/awsRequestHelper');
const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};
const className = 'Events';

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

const session = function (params) {
    return new Promise((resolve, reject) => {
        QB.createSession(params, function (err, result) {
            if (err) {
                reject(err);
            }

            if (result) {
                resolve(result);
            }
        });
    });

};
const updateData = (className, data) => {
    return new Promise((resolve, reject) => {
        QB.data.update(className, data, function (err, res) {
            if (err) {
                reject(err);
                console.log(err);
            } else {
                console.log(res);
                resolve(res);
            }
        });
    });
};

module.exports.handler = function (event, context, callback) {
    let body = JSON.parse(event.body);
    console.log('Got Event::',event);
    const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
    session(params)
        .then(result => {
            console.log('from get session:', result);
            let data = {
                _id:event.pathParameters.id,
                notify_subscribe:body.unsubscribe
            };
            return updateData(className,data);
        }).then(response=>{
            console.log('final response',response);
            awsRequestHelper.callbackRespondWithJsonBody(callback, 200,response);
        }).catch(err=>{
            console.log('error in updating is::',err);
            awsRequestHelper.callbackRespondWithSimpleMessage(callback, 500, err);
        });

};