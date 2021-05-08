const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/user/followUser':
            const searchEventHandler = require('./followUser');
            return await searchEventHandler.handler(event,context,callback);
        case '/user/unfollowUser':
            const updateAddressHandler = require('./unfollowUser');
            return await updateAddressHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}