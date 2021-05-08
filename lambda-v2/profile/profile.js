const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/profile/{user_id}':
            const profileHandler = require('./getProfile');
            return await profileHandler.handler(event,context,callback);
        case '/profile/update':
            const profileUpdateHandler = require('./updateProfile');
            return await profileUpdateHandler.handler(event,context,callback);
        case '/profile/getFollowerList':
            const followerListHandler = require('./followerList');
            return await followerListHandler.handler(event,context,callback);
        case '/profile/getFollowingList':
            const followingListHandler = require('./followingList');
            return await followingListHandler.handler(event,context,callback);
        case '/profile/getInterestedEventsList':
            const interestedEventsListHandler = require('./interestedEvents');
            return await interestedEventsListHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}