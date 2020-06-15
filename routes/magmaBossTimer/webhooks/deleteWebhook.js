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
        if (!req.body.captcha) {
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

                let urlHash = util.createUrlHash(parsedUrl);
                console.log("deleting webhook for " + parsedUrl.href);

                pool.query(
                    "DELETE FROM skyblock_magma_timer_webhooks WHERE url_hash=? AND url=?",
                    [urlHash, parsedUrl.href], function (err, results) {
                        if (err) {
                            console.warn(err);
                            res.status(500).json({
                                success: false,
                                msg: "SQL error"
                            });
                            return;
                        }

                        console.log("Webhook Deleted");
                        res.json({
                            success: true,
                            msg: "Webhook deleted"
                        });
                    });
            } else {
                console.log("recaptcha bad :(");
                res.status(403).json({
                    success: false,
                    msg: "Failed to verify captcha"
                })
            }
        });

    };
};