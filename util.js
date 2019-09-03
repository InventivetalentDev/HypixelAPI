const request = require("request");
const crypto = require("crypto");

module.exports.verifyMinecraftUsername = function (username, cb) {
    request({
        url: "https://api.mojang.com/users/profiles/minecraft/" + username
    }, function (err, res, body) {
        if (err) {
            console.warn(err);
            cb(err, null);
        } else {
            if (body.length > 0) {
                cb(null, JSON.parse(body));
            }else{
                cb(null, false);
            }
        }
    })
};

module.exports.createUrlHash= function (parsedUrl) {
  return  crypto.createHash("sha256").update(parsedUrl.protocol + "_" + parsedUrl.host + "_" + parsedUrl.pathname + "_" + parsedUrl.username + "_" + parsedUrl.password + "_" + parsedUrl.href).digest("hex")
};