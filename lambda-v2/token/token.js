const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let method = event.httpMethod;
    switch(method){
        case 'POST':
            const postTokenHandler = require('./postToken');
            return await postTokenHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}