import { createUrlHash } from "../../util";
import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";
import { parse } from "url";

const Recaptcha = require('recaptcha-verify');;


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
        if (!req.body.captcha) {
            res.status(403).json({
                success: false,
                msg: ""
            });
            return;
        }

        let parsedUrl = parse(req.body.url);
        if (!parsedUrl || !parsedUrl.hostname || !parsedUrl.protocol) {
            res.status(400).json({
                success: false,
                msg: "invalid url"
            });
            return;
        }

        let context = "magmaBoss";
        if (req.body.context) {
            context = req.body.context;
        }

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

                let urlHash = createUrlHash(parsedUrl);
                console.log("deleting webhook for " + parsedUrl.href);

                pool.query(
                    "DELETE FROM skyblock_webhooks WHERE url_hash=? AND url=? AND context=?",
                    [urlHash, parsedUrl.href, context], function (err, _) {
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
