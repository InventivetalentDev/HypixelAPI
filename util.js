const request = require("request");

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