const moment = require("moment/moment");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");

module.exports = function (vars, pool) {

    const webhookRunner = require("../../webhookRunner")(pool);

    let webhookSent = false;

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;
    const oneYearInMillis = 3.154e+10;
    const oneDayInMillis = 8.64e+7; // 24h

    const eventInterval = oneYearInMillis;
    const eventDuration = oneDayInMillis;

    let cachedQuery = new CachedDatabaseQuery(pool, CachedDatabaseQuery.FIVE_MINUTES,function (cb) {
        pool.query(
            "SELECT type,time,num FROM skyblock_anniversary_events ORDER BY time DESC LIMIT 2", function (err, results) {
                if (err) {
                    console.warn(err);
                    cb({
                        success: false,
                        msg: "sql error"
                    }, null);
                    return;
                }

                if (!results || results.length <= 0) {
                    console.warn("[Anniversary] No Data!");
                    cb({
                        success: false,
                        msg: "There is no data available!"
                    }, null);
                    return;
                }

                let now = Date.now();

                let lastEvent = results[0];
                let lastEventTime = lastEvent.time.getTime();
                let lastEventType = lastEvent.type;
                let lastEventNum = lastEvent.num;

                let lastEstimate = now;
                let estimate = now;
                let eventsSinceLast =0;
                if (lastEventTime > 0) {
                    eventsSinceLast= Math.floor((now - lastEventTime) / eventInterval);
                    // lastEstimate = lastEventTime + (eventsSinceLast * eventInterval);

                    // eventsSinceLast++;

                    estimate = lastEventTime + (eventsSinceLast * eventInterval);
                }

                let endEstimate = lastEstimate+eventDuration;

                // let lastEstimateString = moment(lastEstimate).fromNow();
                let estimateString = moment(estimate).fromNow();
                let endEstimateString = moment(endEstimate).fromNow();

                let eventNum = lastEventNum+eventsSinceLast;

                let isActive = (now-lastEstimate)<eventDuration;

                let theData = {
                    success: true,
                    msg: "",
                    type: "anniversary",
                    queryTime: now,
                    latest: lastEventTime,
                    // lastEstimate: lastEstimate,
                    // lastEstimateRelative: lastEstimateString,
                    estimate: estimate,
                    estimateRelative: estimateString,
                    endEstimate: endEstimate,
                    endEstimateRelative:endEstimateString,
                    eventsSinceLast: eventsSinceLast,
                    active: isActive,
                    num: eventNum
                };
                cb(null, theData);


                let minutesUntilNextEvent = moment.duration(estimate - now).asMinutes();
                console.log("[Anniversary] Minutes until event: " + minutesUntilNextEvent);
                if (!webhookSent) {
                    if (minutesUntilNextEvent <= 10 && minutesUntilNextEvent >= 6) {
                        console.log("[Anniversary] Sending OneSignal push notification...");


                        console.log("[Anniversary] Posting webhooks...");
                        webhookRunner.queryWebhooksAndRun("anniversary", theData);

                        webhookSent = true;
                    }
                } else {
                    if (minutesUntilNextEvent <= 5 || minutesUntilNextEvent >= 20) {
                        webhookSent = false;
                    }
                }
            })
    })

    return function (req, res) {
        cachedQuery.respondWithCachedOrQuery(req, res);
    }
};
