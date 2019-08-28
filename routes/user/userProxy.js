const request = require("request");

module.exports = function (vars, pool) {
    return function (req, res) {

        if (!req.query.user) {
            res.status(400).json({
                success: false,
                msg: "Missing user"
            });
            return;
        }
        let user = req.query.user;
        user = user.trim();

        let date = new Date();
        let time = date.getTime();


        function queryUserFromHypixel(existingUser) {
            console.log("Querying Hypixel API for " + user + "...");
            request({
                url: "https://api.hypixel.net/player?key=" + vars.hypixel.apiKey + "&" + (user.length > 16 ? "uuid" : "name") + "=" + user,
                json: true,
                headers: {
                    'User-Agent': 'inventive-player-proxy'
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
                if (!body.player) {
                    markUserAsNonExisting();
                    res.status(404).json({
                        success: false,
                        msg: "Player not found",
                        player: {
                            isValid: false
                        }
                    });
                    return;
                }
                let player = body.player;

                let formatted = {
                    isValid: true,
                    uuid: player.uuid,
                    name: player.displayname || player.playername,
                    rank: player.rank /* youtubers & staff */ || player.newPackageRank || player.packageRank || "NONE",
                    firstLogin: player.firstLogin,
                    lastLogin: player.lastLogin,
                    karma: player.karma || 0,
                    networkExp: player.networkExp,
                    userLanguage: player.userLanguage || "ENGLISH",
                    mostRecentGame: player.mostRecentGameType || "NONE",
                    lastUpdate: time,
                    cached: false
                };

                if (req.query.includeHypixelData) {
                    formatted.hypixelData = player;
                }

                let firstLoginDate = new Date(formatted.firstLogin);
                let lastLoginDate = new Date(formatted.lastLogin);


                pool.query(
                    "INSERT INTO players (lastUpdate, isValid, uuid, name, rank, firstLogin, lastLogin, karma, networkExp, userLanguage, mostRecentGame) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE lastUpdate=?, isValid=?, uuid=?, name=?, rank=?, firstLogin=?, lastLogin=?, karma=?, networkExp=?, userLanguage=?, mostRecentGame=?",
                    [date, true, formatted.uuid, formatted.name, formatted.rank, firstLoginDate, lastLoginDate, formatted.karma, formatted.networkExp, formatted.userLanguage, formatted.mostRecentGame,/* update */ date, true, formatted.uuid, formatted.name, formatted.rank, firstLoginDate, lastLoginDate, formatted.karma, formatted.networkExp, formatted.userLanguage, formatted.mostRecentGame],
                    function (err, results) {
                        if (err) {
                            console.log(err);
                        }
                    }
                );

                res.json({
                    success: true,
                    msg: "",
                    player: formatted
                })
            });
        }

        function markUserAsNonExisting() {
            let isUuid = user.length > 16;
            pool.query(
                "INSERT INTO players (lastUpdate,isValid,??) VALUES(?,?,?) ON DUPLICATE KEY UPDATE lastUpdate=?, isValid=?, ??=?",
                [date, false, (isUuid ? "uuid" : "name"), user, date, false, (isUuid ? "uuid" : "name"), user], function (err, results) {
                    if (err) {
                        console.warn(err);
                    }
                });
        }

        function sqlCallback(err, results) {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "SQL error"
                });
                return;
            }

            if (results.length <= 0) {// Nothing found, try to query the live data from Hypixel API
                queryUserFromHypixel();
            } else {// Cached version found
                let existingUser = results[0];
                if (time - existingUser.lastUpdate.getTime() < 1.8e+6/* 30mins */) {
                    if (!existingUser.isValid) {
                        res.json({
                            success: false,
                            msg: "Player not found",
                            player: {
                                isValid: false
                            }
                        });
                        return;
                    }

                    res.json({
                        success: true,
                        msg: "",
                        player: {
                            isValid: true,
                            uuid: existingUser.uuid,
                            name: existingUser.name,
                            rank: existingUser.rank,
                            firstLogin: existingUser.firstLogin.getTime(),
                            lastLogin: existingUser.lastLogin.getTime(),
                            karma: existingUser.karma,
                            networkExp: existingUser.networkExp,
                            userLanguage: existingUser.userLanguage,
                            mostRecentGame: existingUser.mostRecentGame,
                            lastUpdate: existingUser.lastUpdate.getTime(),
                            cached: true
                        }
                    });
                } else {
                    queryUserFromHypixel(existingUser);
                }
            }
        }

        if (user.length > 16) {// uuid
            user = user.replace(/-/g, '');
            pool.query("SELECT * FROM players WHERE uuid=?", [user], sqlCallback);
        } else {// name
            pool.query("SELECT * FROM players WHERE name=?", [user], sqlCallback);
        }

        // pool.query("SELECT COUNT(id) AS total FROM skyblock_magma_timer_pings WHERE active_time > NOW() - INTERVAL 2 MINUTE", function (err, results) {
        //     if (err) {
        //         console.warn(err);
        //         res.json({
        //             success: false,
        //             msg: "sql error"
        //         });
        //         return;
        //     }
        //
        //     res.set("Cache-Control","public, max-age=60");
        //     res.json({
        //         success: true,
        //         msg: "",
        //         activeUsers: results[0].total
        //     })
        // })
    }
};