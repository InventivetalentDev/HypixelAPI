const Recaptcha = require('recaptcha-verify');
const crypto = require("crypto");
const util = require("../../util");

const confirmationCheckFactor = 120 * 1000;

module.exports = function (vars, pool) {
    const recaptcha = new Recaptcha({
        secret: vars.captcha.key,
        verbose: true
    });

    return function (req, res) {
        /// 1
        console.log("addEvent");
        console.log(req.body);

        if (!req.body.type) {
            res.status(400).json({
                success: false,
                msg: "Missing type"
            });
            return;
        }

        let type = req.body.type;
        if (type !== "blaze" && type !== "magma" && type !== "music" && type !== "spawn" && type !== "death" && type !== "restart") {
            res.status(400).json({
                success: false,
                msg: "unknown event"
            });
            return;
        }

        let username = req.body.username || "";
        let server = req.body.serverId || "";

        // console.log(JSON.stringify(req.headers));

        let cfIp = req.header("Cf-Connecting-Ip");
        if (!cfIp) {
            res.status(403).json({
                success: false,
                msg: "Missing ip header"
            });
            return;
        }
        console.log(cfIp);
        let userAgent = req.header("User-Agent");
        console.log(userAgent);


        let ipv4 = req.body.ipv4;
        let ipv6 = req.body.ipv6;

        if (ipv4 === ipv6) {
            console.warn("ipv4===ipv6: " + ipv4);
        }

        if (ipv4 && ipv4.length > 16) {
            console.warn("ipv4 is too long");
            ipv4 = null;
        }
        if (ipv6 && ipv6.length < 20) {
            console.warn("ipv6 is too short");
            ipv6 = null;
        }

        if (cfIp.length <= 16) {
            if (!ipv4) {
                ipv4 = cfIp;
            } else if (ipv4 !== cfIp) {
                console.warn("ipv4 mismatch");
                res.status(403).json({
                    success: false,
                    msg: "IP mismatch"
                });
                return;
            }
        } else if (cfIp.length > 20) {
            if (!ipv6) {
                ipv6 = cfIp;
            } else if (ipv6 !== cfIp) {
                console.warn("ipv6 mismatch");
                res.status(403).json({
                    success: false,
                    msg: "IP mismatch"
                });
                return;
            }
        }

        let isMod = (typeof req.body.minecraftUser !== "undefined") && (userAgent.startsWith("BossTimerMod/")||userAgent.startsWith("SkyblockAddons/")) && req.body.isModRequest === "true";
        console.log("isMod: " + isMod);

        let modName = isMod ? userAgent : "";

        function continueRequest(captchaRes) {
            console.log(captchaRes);
            /// 2
            let captchaScore = (captchaRes ? captchaRes.score : 0) || 0;// NOTE: v2 doesn't have this, only v3

            let date = new Date();
            let time = date.getTime();


            pool.getConnection(function (err, connection) {
                if (err) {
                    console.warn(err);
                    res.status(500).json({
                        success: false,
                        msg: "Failed to get connection from pool"
                    });
                    return;
                }

                function ipSqlCallback(err, results) {
                    /// 3
                    if (err) {
                        console.warn(err);
                        res.status(500).json({
                            success: false,
                            msg: "SQL error"
                        });
                        return;
                    }

                    console.log(results);


                    if (results.length > 0) {
                        let lastType = results[0].type;
                        let lastTime = results[0].time.getTime();

                        console.info("Type: " + type + "  LastType: " + lastType);

                        if (type === lastType && time - lastTime < 3.6e+6/* 1hr */) {
                            res.status(429).json({
                                success: false,
                                msg: "Nope. Too soon."
                            });
                            console.warn("Too Soon A");
                            connection.release();
                            return;
                        }

                        let throttle = type === "death" && lastType === "spawn" ? 10000/*10sec*/ : type === "spawn" && lastType === "music" ? 40000/*40sec*/ : type === "death" && lastType === "music" ? 50000/*50sec*/ : 120000/*2min*/;
                        if (time - lastTime < throttle) {
                            res.status(429).json({
                                success: false,
                                msg: "Nope. Too soon."
                            });
                            console.warn("Too Soon B");
                            connection.release();
                            return;
                        }
                    }

                    let confirmationIncrease = 1;

                    function nameCallback() {
                        /// 4


                        connection.query(
                            "INSERT INTO skyblock_magma_timer_ips (time,type,ipv4,ipv6,minecraftName,server,isMod,modName,captcha_score) VALUES(?,?,?,?,?,?,?,?,?)",
                            [date, type, ipv4, ipv6, username, server, isMod, modName, captchaScore], function (err, results) {
                                if (err) {
                                    console.warn(err);
                                    res.status(500).json({
                                        success: false,
                                        msg: "SQL error"
                                    });
                                    return;
                                }

                                let roundedTime = Math.round(Math.round(time / confirmationCheckFactor) * confirmationCheckFactor);
                                let roundedDate = new Date(roundedTime);

                                if (isMod) {
                                    confirmationIncrease += 2;
                                }

                                if (ipv6) {
                                    confirmationIncrease++;
                                } else {
                                    confirmationIncrease--;
                                }

                                console.log("confirmationIncrease: " + confirmationIncrease);

                                if (confirmationIncrease <= 0) {
                                    res.status(403).json({
                                        success: false,
                                        msg: ""
                                    });
                                    connection.release();
                                    return;
                                }

                                let hash = crypto.createHash("md5").update(type + roundedDate.toUTCString()).digest("hex");

                                connection.query(
                                    "INSERT INTO skyblock_magma_timer_events (hash,type,time_rounded,time_average,confirmations,time_latest) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE confirmations=confirmations+?, time_latest=?",
                                    [hash, type, roundedDate, date, confirmationIncrease, date, confirmationIncrease, date], function (err, results) {
                                        if (err) {
                                            console.warn(err);
                                            res.status(500).json({
                                                success: false,
                                                msg: "SQL error"
                                            });
                                            return;
                                        }

                                        console.log("Added");
                                        res.json({
                                            success: true,
                                            msg: "Added!"
                                        });
                                        console.log(" ");

                                        connection.release();
                                    });

                            })

                    }

                    if (username.length > 0) {
                        util.verifyMinecraftUsername(username, function (err, nameRes) {
                            if (nameRes) {
                                confirmationIncrease += 2;
                                nameCallback();
                            } else {
                                console.warn("Invalid username provided");
                                res.status(400).json({
                                    success: false,
                                    msg: "LOL. Nope."
                                })
                            }
                        })
                    } else {
                        nameCallback();
                    }


                }

                if (!ipv6) {
                    connection.query("SELECT time,type FROM skyblock_magma_timer_ips WHERE  ipv4=? ORDER BY time DESC LIMIT 1", ipv4, ipSqlCallback);
                } else if (!ipv4) {
                    connection.query("SELECT time,type FROM skyblock_magma_timer_ips WHERE  ipv6=? ORDER BY time DESC LIMIT 1", ipv6, ipSqlCallback);
                } else {
                    connection.query("SELECT time,type FROM skyblock_magma_timer_ips WHERE ipv4=? OR ipv6=? ORDER BY time DESC LIMIT 1", [ipv4, ipv6], ipSqlCallback);
                }


            })
        }

        if (req.body.captcha && !req.body.isModRequest) {
            recaptcha.checkResponse(req.body.captcha, function (err, captchaRes) {
                if (err) {
                    console.warn(err);
                    res.status(403).json({
                        success: false,
                        msg: "Captcha error"
                    });
                    return;
                }
                if (captchaRes.success) {
                    console.log("recaptcha good!");
                    continueRequest(captchaRes);
                } else {
                    console.log("recaptcha bad :(");
                    res.status(403).json({
                        success: false,
                        msg: "Failed to verify captcha"
                    })
                }
            });
        } else if (isMod) {
            username = req.body.minecraftUser;
            continueRequest();
        } else {
            res.status(400).json({
                success: false,
                msg: "Invalid request"
            });
            return;
        }
    };
};