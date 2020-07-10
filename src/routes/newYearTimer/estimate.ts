import { SimpleIntervalTimer } from "../../classes/SimpleIntervalTimer";
import { Request, Response } from "express";
import { Pool } from "mysql";
import { Vars } from "../../vars";

const OneSignal = require("onesignal-node");

export default function(vars: Vars, pool: Pool) {

    const OneSignalClient = new OneSignal.Client({
        userAuthKey: vars.oneSignal.userAuthKey,
        app: {
            appId: vars.oneSignal.app.id,
            appAuthKey: vars.oneSignal.app.authKey
        }
    });

    // const webhookRunner = require("../../webhookRunner")(pool);

    let latestOneSignalNotification;

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;

    // Current interval seems to be about 5 days and 4 hours
    const eventInterval = fiveDaysInMillis+fourHoursInMillis;
    const eventDuration = oneHourInMillis;

    let timer = new SimpleIntervalTimer("newYear", eventInterval, eventDuration, pool, "skyblock_newyear_events", 1000 * 60 * 10);
    setTimeout(()=>timer.run(), 3000);

    return function (req: Request, res: Response) {
        res.json(timer.data);
    }
};
