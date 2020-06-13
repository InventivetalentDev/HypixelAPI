const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");
const SimpleIntervalTimer = require("../../classes/SimpleIntervalTimer");

module.exports = function (vars, pool) {

    const OneSignalClient = new OneSignal.Client({
        userAuthKey: vars.oneSignal.userKey,
        app: {
            appAuthKey: vars.oneSignal.restKey,
            appId: vars.oneSignal.appId
        }
    });

    const webhookRunner = require("../../webhookRunner")(pool);
    let webhookSent = false;


    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;

    // Current interval seems to be about 5 days and 4 hours and about 2hrs-20min before newyear's
    const eventInterval = fiveDaysInMillis+fourHoursInMillis;
    const eventDuration = oneHourInMillis;

    let timer = new SimpleIntervalTimer("winterEvent", eventInterval, eventDuration, pool, "skyblock_winter_events", 1000 * 60 * 10);
    timer.run();

    return function (req, res) {
        res.json(timer.data);
    }
};
