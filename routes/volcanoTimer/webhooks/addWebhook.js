const Recaptcha = require('recaptcha-verify');
const url = require("url");
const crypto = require("crypto");
const util = require("../../../util");


module.exports = function (vars, pool) {
    const recaptcha = new Recaptcha({
        secret: vars.captcha.key,
        verbose: true
    });

    return function (req, res) {
        if (!req.body.url) {
            res.status(400).json({
                success: false,
                msg: "missing url"
            });
            return;
        }
        if (!req.body.captcha/*&&!req.body.isFromDiscordBot*/) {
            res.status(403).json({
                success: false,
                msg: ""
            });
            return;
        }

        let parsedUrl = url.parse(req.body.url);
        if (!parsedUrl || !parsedUrl.hostname || !parsedUrl.protocol) {
            res.status(400).json({
                success: false,
                msg: "invalid url"
            });
            return;
        }

        let format = "custom";
        if (parsedUrl.protocol.startsWith("https")) {
            if (parsedUrl.hostname === "discordapp.com" && parsedUrl.pathname.startsWith("/api/webhooks")) {
                format = "discord";
            }
        }

        function continueSetup() {
            let urlHash = util.createUrlHash(parsedUrl);

            console.log(parsedUrl.protocol);
            console.log(parsedUrl.hostname);
            console.log(parsedUrl.pathname);

            console.log("adding webhook for " + parsedUrl.href);

            pool.query(
                "INSERT INTO skyblock_volcano_timer_webhooks (url_hash,url,format) VALUES(?,?,?)",
                [urlHash, parsedUrl.href, format], function (err, results) {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            res.status(400).json({
                                success:false,
                                msg:"Duplicate webhook"
                            })
                            return;
                        }

                        console.warn(err);
                        res.status(500).json({
                            success: false,
                            msg: "SQL error"
                        });
                        return;
                    }

                    console.log("Webhook Added");
                    res.json({
                        success: true,
                        msg: "Webhook created",
                        format: format
                    });
                });
        }

        // if (req.body.isFromDiscordBot&&format==="discord") {
        //     continueSetup();
        // }else{
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

                    continueSetup();
                } else {
                    console.log("recaptcha bad :(");
                    res.status(403).json({
                        success: false,
                        msg: "Failed to verify captcha"
                    })
                }
            });
        // }

    };
};
