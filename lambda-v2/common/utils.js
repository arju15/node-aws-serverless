const jwt = require("jsonwebtoken");

//Create JWT
const createJWT = parsedBody => {
  return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

//Verify TOKEN
const verifyJWT = token => {
   return jwt.verify(token, process.env.SHARED_SECRET);;
}

const verifyUser = function (JWTtoken) {
  const token = JWTtoken;
  return new Promise((resolve, reject) => {
      try {
        let decoded = verifyJWT(token);
        let user = decoded;
        console.log(decoded, token)
        if(user && user.id){
           resolve(user);
        }
      }
      catch(err){
        reject({ status_code: 400, message: 'Unauthorized' });
      }
  });    
}


module.exports = {
  verifyUser,
  verifyJWT,
  createJWT
};
