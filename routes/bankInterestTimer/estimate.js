const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");
const SimpleIntervalTimer = require("../../classes/SimpleIntervalTimer");

module.exports = function (vars, pool) {

    const fiveDaysInMillis = 4.32e+8;
    const thirtyOneHoursInMillis = 1.116e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = thirtyOneHoursInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;

    const webhookRunner = require("../../webhookRunner")(pool);
    let webhookSent = false;

    let timer = new SimpleIntervalTimer("bankInterest", eventInterval, 1000, pool, "skyblock_bank_interest_events", 1000 * 60 * 10);
    timer.run();

    return function (req, res) {
        res.json(timer.data);
    }
};
