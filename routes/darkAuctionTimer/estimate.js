const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");
const SimpleIntervalTimer = require("../../classes/SimpleIntervalTimer");

module.exports = function (vars, pool) {

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = oneHourInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;


    let timer = new SimpleIntervalTimer("darkAuction", eventInterval, 1000 * 60, pool, "skyblock_dark_auction_events", 1000 * 60 * 5);
    timer.run();

    return function (req, res) {
        res.json(timer.data);
    }
};
