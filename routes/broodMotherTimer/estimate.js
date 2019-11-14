const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");

module.exports = function (vars, pool) {

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = oneHourInMillis;

    let cachedQuery = new CachedDatabaseQuery(pool, CachedDatabaseQuery.FIVE_MINUTES, function (cb) {
        pool.query(
            "SELECT time FROM skyblock_broodmother_events ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    cb({
                        msg: "sql error"
                    }, null);
                    return;
                }

                if (!results || results.length <= 0) {
                    cb({
                        success: false,
                        msg: "There is no data available!"
                    }, null);
                    return;
                }

                let now = Date.now();

                let lastEvent = results[0];
                let lastEventTime = lastEvent.time.getTime();

                let estimate = now;
                if (lastEventTime > 0) {
                    let eventsSinceLast = Math.floor((now - lastEventTime) / eventInterval);
                    eventsSinceLast++;

                    estimate = lastEventTime + (eventsSinceLast * eventInterval);
                }


                let estimateString = moment(estimate).fromNow();

                let theData = {
                    success: true,
                    msg: "",
                    queryTime: now,
                    latest: lastEventTime,
                    estimate: estimate,
                    estimateRelative: estimateString
                };
                cb(null, theData);

            })
    });


    return function (req, res) {
        cachedQuery.respondWithCachedOrQuery(req, res);
    }
};
