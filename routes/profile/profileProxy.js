const request = require("request");
const nbt = require("prismarine-nbt");

const nbtKeys = [
    "talisman_bag",
    "inv_contents",
    "potion_bag",
    "quiver",
    "fishing_bag",
    "ender_chest_contents",
    "inv_armor",
    "candy_inventory_contents"
];

module.exports = function (vars, pool) {
    return function (req, res) {

        if (!req.query.user) {
            res.status(400).json({
                success: false,
                msg: "Missing user"
            });
            return;
        }
        let user = req.query.user.trim();

        if (!req.query.profile) {
            res.status(400).json({
                success: false,
                msg: "Missing profile"
            });
            return;
        }
        let profile = req.query.profile.trim();


        let date = new Date();
        let time = date.getTime();


        console.log("Querying Hypixel API for " + user + "...");
        request({
            url: "https://api.hypixel.net/skyblock/profile?key=" + vars.hypixel.apiKey + "&profile=" + profile,
            json: true,
            headers: {
                'User-Agent': 'inventive-profile-proxy'
            }
        }, function (err, response, body) {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "Failed to query Hypixel API"
                });
                return;
            }
            if (response.statusCode !== 200) {
                res.status(500).json({
                    success: false,
                    msg: "Hypixel API returned non-ok status code (" + response.statusCode + ")"
                });
                return;
            }
            if (!body.success) {
                res.status(500).json({
                    success: false,
                    msg: "Hypixel API returned success:false"
                });
                return;
            }
            if (!body.profile) {
                res.status(404).json({
                    success: false,
                    msg: "Profile not found"
                });
                return;
            }

            let memberData = body.profile.members[user];
            if (!memberData) {
                res.status(404).json({
                    success: false,
                    msg: "Player not found in profile"
                });
                return;
            }
            memberData.user = user;
            memberData.profile = profile;

            let promises = [];

            if (req.query.parseNbt && req.query.parseNbt.length > 0) {
                let keys;
                if (req.query.parseNbt === "true" || req.query.parseNbt === "all") {
                    keys = nbtKeys;
                } else {
                    keys = req.query.parseNbt.split(",");
                }
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if (memberData.hasOwnProperty(key)) {
                        memberData[key + "_"] = memberData[key];
                        let data = new Buffer(memberData[key].data, "base64");
                        promises.push(new Promise((resolve, reject) => {
                            nbt.parse(data, function (err, parsed) {
                                if (err) {
                                    console.warn(err);
                                    memberData[key] = "_NBT_PARSE_ERROR_";
                                    resolve();
                                } else {
                                    memberData[key] = parsed;
                                    resolve();
                                }
                            });
                        }))
                    }
                }
            }

            function respond() {
                res.set("Cache-Control", "public, max-age=" + 86400);
                res.set("Last-Modified", (new Date(memberData.last_save).toUTCString()));
                res.set("ETag",new Buffer(memberData.last_save+memberData.profile+memberData.user).toString("base64"));

                res.json(memberData);
            }

            if (promises.length === 0) {
                respond();
            } else {
                Promise.all(promises).then(respond);
            }
        });
    };
};
