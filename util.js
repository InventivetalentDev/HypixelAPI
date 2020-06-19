const request = require("request");
const crypto = require("crypto");
const vars = require("./vars");

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

module.exports.postDiscordMessage = function (content, channel) {
    if (!vars.discord || !vars.discord.token) return;
    if (!channel) channel = vars.discord.channel;
    request({
        method: "POST",
        url: "https://discordapp.com/api/channels/" + channel + "/messages",
        headers: {
            "Authorization": "Bot " + vars.discord.token,
            "User-Agent": "MineSkin"
        },
        json: {
            content: content
        }
    }, function (err, res, body) {
        if (err) {
            console.warn(err);
            return;
        }
        if (res.statusCode !== 200) {
            console.warn(res.statusCode);
            console.warn(body);
        }
    })
};

module.exports.sendDiscordDirectMessage = function (content, receiver) {
    if (!vars.discord || !vars.discord.token) return;
    request({
        method: "POST",
        url: "https://discordapp.com/api/users/@me/channels",
        headers: {
            "Authorization": "Bot " + vars.discord.token,
            "User-Agent": "MineSkin"
        },
        json: {
            recipient_id: receiver
        }
    }, function (err, res, body) {
        if (err) {
            console.warn(err);
            return;
        }
        if (res.statusCode !== 200) {
            console.warn(res.statusCode);
            console.warn(body);
        } else {
            module.exports.postDiscordMessage(content, body.id);
        }
    })
};
