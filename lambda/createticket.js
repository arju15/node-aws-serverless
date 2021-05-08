const QRCode = require('qrcode');
const BUCKET_IMAGE = 'promoappdata' + process.env.API_PREFIX;
const QB = require('quickblox');
const Joi = require('joi');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const awsRequestHelper = require('./common/awsRequestHelper');
const className = 'Events';
const jwt = require('jsonwebtoken');
const moment = require('moment');
const AWSManager = require('./common/awsmanager');
const _ = require('lodash'),
    fs = require('fs');
const QBM = require('./common/qbmanager');
const QBManager = new QBM();
const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";

const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

//Validate body
const validate = async (body) => {
    const ticket = Joi.object().keys({
        type: Joi.string().required(),
        quantity: Joi.number().integer(),
        price: Joi.number()
    })
    const schema = Joi.object().keys({
        event_id: Joi.string().required(),
        paypalEmail: Joi.string(),
        attendee: Joi.number().required(),
        tickets: Joi.array().items(ticket),
        total_amount: Joi.number()
    });

    return new Promise((resolve, reject) => {

        Joi.validate(body, schema, {
            abortEarly: false
        }, function (err, value) {

            if (err) {
                reject(err);
            }
            else {
                resolve(value);
            }
        });
    });
};

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

//get eventID 
const getDataFromQB = function (id) {
    const filter = { _id: id };
    return new Promise((resolve, reject) => {
        QB.data.list(className, filter, function (err, result) {
            console.log("filter", filter);
            if (err) {
                console.log("err", err);
                resolve([]);
            } else {
                resolve(result.items);
            }
        });
    });
};

//post data in USerTickets table
const insertCode = function (postParam) {
    return new Promise((resolve, reject) => {
        QB.data.create('UserTickets', postParam, function (err, res) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

//Create JWT
const createJWT = (parsedBody) => {
    console.log('Inside createJWT', parsedBody);
    // Create a JWT 
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

//generate QRCode
const generateQR = async (parsedBody, token, ticket_id) => {
    console.log('Inside generateQR', token, BUCKET_IMAGE);
    let key = `${parsedBody.event_id}/${parsedBody.attendee}/${ticket_id}.png`;
    console.log("key", key);
    try {
        let qrCode = await QRCode.toDataURL(token);
        const base64Data = new Buffer(qrCode.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const type = qrCode.split(';')[0].split('/')[1];
        let params = {
            Body: base64Data,
            Bucket: BUCKET_IMAGE,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: `image/${type}`,
            Key: key
        };
        await S3.putObject(params).promise();
        return `https://s3.${process.env.REGION}.amazonaws.com/${BUCKET_IMAGE}/${key}`;
    } catch (err) {
        console.error(err)
    }
};

//update eventRemainingTicket in event table
const updateRemainingTicket = function (event, remTicket, childRef) {
    return new Promise((resolve, reject) => {
        const params = { _id: event, tickets: remTicket, childReferences: childRef };
        console.log("params", params);
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

const updateTicketWithQRCode = async (id, QRCode) => {
    return new Promise((resolve, reject) => {
        const params = { _id: id, qrcode: QRCode };
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

const getEventOrganizer = async(id) =>{
    let response = await QBManager.getUsers({filter: { field: 'id', param: 'in', value: [id] }});
    console.log(response);
    if(response && response.length > 0){
        return response[0];
    }
    return null;
}

// This function notifies organiser
const notifyOrganiser = async(body,event,notifyOrganiser) => {
    console.log('Inside notifyOrganiser');
    let tmpl = fs.readFileSync('./lambda/emailtemplates/organiser-notified-when-attendee-buys-ticket.html', 'utf8');
    let mailSubject = `Ticket Purchase for ${event.event_name}`;
    let event_url = `${process.env.UI_BASE_URL}/#!/eventdetails/${event._id}`;
    console.log(AWSManager.MAIL_PARAMS);
    let templateVars=Object.assign({
        eventUrl: event_url,
        eventName: event.event_name,
        userTicket: body.tickets,
        totalQuantity: body.total_amount,
        purchasedOn: moment.utc().format(dateFormat)
    },AWSManager.MAIL_PARAMS);
    
    let mailBody = _.template(tmpl)(templateVars);
    await AWSManager.sendEmail([notifyOrganiser.email],mailBody,mailSubject);
}

exports.handler = async function (event, context, callback) {
    console.log("Got event: ", JSON.stringify(event));
    try {
        let postbody = JSON.parse(event.body || {});
        console.log("getting body", postbody);

        //validate body
        let parsedBody = await validate(postbody);

        if (parsedBody) {
            const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
            await session(params);

            // Get events detail from event_id
            let events = await getDataFromQB(parsedBody.event_id);
            console.log('Got events',events);
            if (!events || events.length === 0) {
                awsRequestHelper.callbackRespondWithSimpleMessage(callback, 400, 'Invalid event');
                return;
            }

            //Insert  QRCode into UserTicket
            let postParam = {
                attendee: parsedBody.attendee,
                event_id: parsedBody.event_id,
                checkedin: false,
                event_status: 'pending',
                purchased_on: moment.utc().valueOf(),
                tickets: JSON.stringify(parsedBody.tickets),
                total_amount: parsedBody.total_amount,
                _parent_id: parsedBody.event_id
            };
            if('paypalEmail' in parsedBody && parsedBody.paypalEmail){
                postParam.paypalEmail = parsedBody.paypalEmail; 
            }
            console.log("postParam ",postParam);

            let QRdata = await insertCode(postParam);
            console.log("Inserted data ", QRdata);


            let ticket_id = QRdata._id;

            let qrtext = {
                id: parsedBody.event_id,
                attendee: parsedBody.attendee,
                ticket: ticket_id
            };
            //Create JWT
            let token = await createJWT(qrtext);
            //Generate QRcode
            const QRCode = await generateQR(parsedBody, token, ticket_id);
            console.log("token ",token);
            console.log("QRCode ", QRCode);
            //update ticket with qrcode
            await updateTicketWithQRCode(ticket_id, QRCode);

            if(events && events.length > 0 && 'tickets' in events[0] && 'childReferences' in events[0]) {
                let childRef = events[0].childReferences;
                if(childRef && childRef.length > 0){
                    if(!childRef.includes(ticket_id)){
                        childRef.push(ticket_id);
                    }
                }else{
                    childRef = ([ticket_id]);
                }

                console.log("childReferences", childRef);

                //event tickets in event table
                let totalTicket = [];
                if(!(events[0].tickets)){
                    totalTicket = [];
                }else{
                    totalTicket = JSON.parse(events[0].tickets)
                }
                console.log("totalticket", totalTicket);

                let remt_ticket = [];
                let userTicket = parsedBody.tickets;
                if(userTicket && (userTicket.length > 0) && totalTicket && (totalTicket.length > 0)){
                    remt_ticket = totalTicket.map((j)=>{
                        let newUserTicket = userTicket.filter((i)=>(i.type == j.name));
                        if(newUserTicket.length>0){
                            for(let i of newUserTicket){
                                console.log("i,j", i, j);
                                if(i.quantity && j.remQuantity) {
                                    j.remQuantity = j.remQuantity - i.quantity;
                                }
                                else if(i.quantity && !j.remQuantity){
                                    j.remQuantity = j.quantity - i.quantity;
                                }
                            }
                        }
                        return j;
                    });
                }

                console.log("ticketupdate", remt_ticket);

                let updatestatus = await updateRemainingTicket(events[0]._id, JSON.stringify(remt_ticket), childRef);
                console.log("updatestatus", updatestatus);
            }

            let json = { id: QRdata._id };
            console.log("id "+json.id);

            let eventOrganiser = await getEventOrganizer(events[0].user_id);
            await notifyOrganiser(parsedBody,events[0],eventOrganiser);
            return awsRequestHelper.respondWithJsonBody(200, json);
        }
    } catch (err) {
        console.log("Inside Error", err);
        if (err.name == 'ValidationError') {
            return awsRequestHelper.respondWithSimpleMessage( 400, err.message);
        } else {
            return awsRequestHelper.respondWithSimpleMessage( 500, err.message);
        }
    }
};

