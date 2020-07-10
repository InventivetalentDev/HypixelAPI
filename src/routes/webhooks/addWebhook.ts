import { Request, Response } from "express";
import { parse } from "url";
import { Pool } from "mysql";
import { createUrlHash } from "../../util";
import { Vars } from "../../vars";

const Recaptcha = require('recaptcha-verify');

export default function(vars: Vars, pool: Pool) {
    const recaptcha = new Recaptcha({
        secret: vars.captcha.key,
        verbose: true
    });

    return function (req: Request, res: Response) {
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

        const parsedUrl = parse(req.body.url);

        if (!parsedUrl || !parsedUrl.hostname || !parsedUrl.protocol) {
            res.status(400).json({
                success: false,
                msg: "invalid url"
            });
            return;
        }

        let format = "custom";
        if (parsedUrl.protocol.startsWith("https")) {
            if (parsedUrl.pathname != null && parsedUrl.hostname === "discordapp.com" && parsedUrl.pathname.startsWith("/api/webhooks")) {
                format = "discord";
            }
        }

        let context = "magmaBoss";
        if (req.body.context) {
            context = req.body.context;
        }

        let extraOptions = {};
        if (req.body.extraOptions && typeof req.body.extraOptions === "object") {
            extraOptions = JSON.parse(JSON.stringify(req.body.extraOptions));
        }

        function continueSetup() {
            let urlHash = createUrlHash(parsedUrl);

            console.log("adding webhook for " + parsedUrl.href);

            let extraOptionsString = JSON.stringify(extraOptions);

            pool.query(
                "INSERT INTO skyblock_webhooks (url_hash,url,format,context,extraOptions) VALUES(?,?,?,?,?)",
                [urlHash, parsedUrl.href, format, context,extraOptionsString], function (err, results) {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            res.status(400).json({
                                success:false,
                                msg: "Duplicate webhook"
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
                        format: format,
                        context: context,
                        extraOptions: extraOptions
                    });
                });
        }

        // if (req.body.isFromDiscordBot&&format==="discord") {
        //     continueSetup();
        // }else{
            recaptcha.checkResponse(req.body.captcha, function (err: Error, captchaRes: any) {
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
