const jwtDecode = require('jwt-decode');
const Joi = require('joi');
const awsRequestHelper = require('./common/awsRequestHelper');
const QB = require('quickblox');
const moment = require('moment');

//Validate body
const validate = async (data) => {
    const schema = Joi.object().keys({
        qrcode: Joi.string().required(),
        checkedin_by: Joi.number().integer().required(),
        eventid: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(data, schema, {
            abortEarly: false
        }, function (err, value) {
            if (err) {
                console.log("err", err);
                reject(err);
            }
            else {
                resolve(value);
            }
        });
    });
};
//Decode JWT Token
const tokenDecode = function (token) {
    console.log("inside JWT decode")
    const tokendecode = jwtDecode(token);
    console.log("tokendecode", tokendecode);
    return tokendecode;
}

//Create session
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

const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

//get event data from events table
const eventFromDb = async (id) => {
    const filter = { _id: id };
    return new Promise((resolve, reject) => {
        QB.data.list('Events', filter, function (err, result) {
            console.log("filter", filter);
            if (err) {
                console.log("err", err);
                resolve([]);
            } else {
                //console.log("result", result.items);
                resolve(result.items);
            }
        });
    });
}

//get ticketid from ticket table
const userticket = async (id) => {
    const filter = { _id: id };
    return new Promise((resolve, reject) => {
        QB.data.list('UserTickets', filter, function (err, result) {
            if (err) {
                console.log("err", err);
                reject(err);
            } else {
                resolve(result.items);
            }
        });
    });
}
//update status 
const updateticket = async (id) => {
    return new Promise((resolve, reject) => {
        let checkedinat = moment.utc().valueOf();
        const params = { _id: id, checkedin: true, checkedin_at: checkedinat };
        console.log("params", params);
        QB.data.update('UserTickets', params, function (err, result) {
            if (result) {
                resolve(result);
            } else {
                // error
                console.log("Error", err);
                reject(err);
            }
        });
    })
}

const updateEventWithTotalCheckedIn = async (event, count) => {
    return new Promise((resolve, reject) => {
        const params = { _id: event, ticketsCheckedIn: count };
        console.log("ticketsCheckedIn params", params);
        QB.data.update('Events', params, function (err, result) {
            if (result) {
                resolve(result);
            } else {
                // error
                console.log("Error", err);
                reject(err);
            }
        });
    })
}

//Retreive useremail through id
const attendeeDetail = function (Id) {
    return new Promise((resolve, reject) => {
        const params = { filter: { field: 'id', param: 'in', value: [Id] } };
        QB.users.listUsers(params, function (err, result) {
            if (result) {
                resolve(result.items);
            } else {
                // error
                console.log("Error", err);
                reject(err);
            }
        });
    })
}
exports.handler = async (event, context, callback) => {
    console.log("got event", JSON.stringify(event));

    try {
        //Input
        let body = JSON.parse(event.body || '{}');
        console.log("POSTBody", body);
        //validate body
        let postBody = await validate(body);
        console.log("postbody", postBody);
        if (postBody) {
            let decodejwt = '';
            try {
                decodejwt = await tokenDecode(postBody.qrcode);
                console.log("decoded data", decodejwt);
            } catch (error) {
                return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 403, 'Invalid JWT token');
            }

            if (!decodejwt.id) {
                return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Missing eventID');
            }

            if (!decodejwt.attendee) {
                return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Invalid attendee');
            }

            if(!decodejwt.ticket){
                return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Invalid ticket');
            }

            if (postBody.eventid != decodejwt.id) {
                return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Ticket Not Matching Event');
            }

            const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
            await session(params);

            //get eventid from ticketid
            let eventDetail = await eventFromDb(decodejwt.id);
            console.log("ticket info", eventDetail);
            let ticket;
            if (eventDetail && eventDetail.length > 0 && 'user_id' in eventDetail[0] && 'event_admin' in eventDetail[0] && 'tickets' in eventDetail[0]) {
                let eventAdmins = [];
                if (!(eventDetail[0].event_admin)) {
                    eventAdmins = [];
                } else {
                    eventAdmins = JSON.parse(eventDetail[0].event_admin).map(a => a.id);
                }
                if ((eventDetail[0].claimed_by && (postBody.checkedin_by == parseInt(eventDetail[0].claimed_by))) || postBody.checkedin_by === eventDetail[0].user_id || eventAdmins.includes(postBody.checkedin_by)) {
                    ticket = await userticket(decodejwt.ticket);
                    if ('checkedin' in ticket[0]) {
                        if (ticket[0].checkedin) {
                            return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'This ticket is already checkedin');
                        } else {
                            await updateticket(ticket[0]._id);
                        }
                    } else {
                        return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Invalid Ticket');
                    }
                }
                else{
                    return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'You are not Authorized to perform this operation');
                }
                let user = await attendeeDetail(decodejwt.attendee);
                console.log("user", user);

                let eventTickets = [];
                if (!(eventDetail[0].tickets)) {
                    eventTickets = [];
                } else {
                    eventTickets = JSON.parse(eventDetail[0].tickets).map(q => q.quantity);
                }

                //sum all the quantity
                let total_ticket = eventTickets.reduce((sum, a) => sum + a);
                console.log("total ticket", total_ticket);

                let ticketsCheckedIn = 0;
                if(eventDetail[0] && eventDetail[0].ticketsCheckedIn){
                    ticketsCheckedIn += eventDetail[0].ticketsCheckedIn;
                }
                if(ticket && ticket[0] && ticket[0].tickets){
                    let applicableTickets = JSON.parse(ticket[0].tickets);
                    for(let t of applicableTickets){
                        if(("quantity" in t) && t.quantity){
                            ticketsCheckedIn += t.quantity;
                        }
                    }
                }
                console.log("ticketsCheckedIn: ",ticketsCheckedIn);
                await updateEventWithTotalCheckedIn(decodejwt.id, ticketsCheckedIn);

                let json = {
                    totalTicketsCheckedIn: ticketsCheckedIn,
                    totalTickets: total_ticket,
                    eventid: decodejwt.id
                };
                if(user && user[0]){
                    json.attendee = user[0];
                }
                if(ticket && ticket[0]){
                    json.ticketDetail = ticket[0];
                }
                console.log("json: "+JSON.stringify(json));
                return awsRequestHelper.callbackRespondWithJsonBody(callback, 200, json)
            }
        }
    } catch (err) {
        console.log("Error", err);
        if (err.name == 'ValidationError') {
            return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, err.message);
        } else if (err.name == 'JsonWebTokenError') {
            return awsRequestHelper.callbackRespondWithSimpleMessage(callback, 401, 'Invalid Token');
        } else if (err.code == 403) {
            return awsRequestHelper.callbackRespondWithSimpleMessage(callback, err.code, err.message);
        }
    }
}