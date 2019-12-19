const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");

module.exports = function (vars, pool) {


    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;

    // Current interval seems to be about 5 days and 4 hours
    const eventInterval = fiveDaysInMillis+fourHoursInMillis;
    const eventDuration = oneHourInMillis;

    const webhookRunner = require("../../webhookRunner")(pool);
    let webhookSent = false;

    let cachedQuery = new CachedDatabaseQuery(pool, CachedDatabaseQuery.FIVE_MINUTES,function (cb) {
        pool.query(
            "SELECT type,time FROM skyblock_spooky_events ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    cb({
                        success: false,
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
                let lastEventType = lastEvent.type;

                let lastEstimate = now;
                let estimate = now;
                if (lastEventTime > 0) {
                    let eventsSinceLast = Math.floor((now - lastEventTime) / eventInterval);
                    lastEstimate = lastEventTime + (eventsSinceLast * eventInterval);

                    eventsSinceLast++;

                    estimate = lastEventTime + (eventsSinceLast * eventInterval);
                }

                let endEstimate = lastEstimate+eventDuration;

                let lastEstimateString = moment(lastEstimate).fromNow();
                let estimateString = moment(estimate).fromNow();
                let endEstimateString = moment(endEstimate).fromNow();

                let isActive = (now-lastEstimate)<eventDuration;

                let theData = {
                    success: true,
                    msg: "",
                    type: "spookyFestival",
                    queryTime: now,
                    latest: lastEventTime,
                    lastEstimate: lastEstimate,
                    lastEstimateRelative: lastEstimateString,
                    estimate: estimate,
                    estimateRelative: estimateString,
                    endEstimate: endEstimate,
                    endEstimateRelative:endEstimateString,
                    active: isActive
                };
                cb(null, theData);


                let minutesUntilNextEvent = moment.duration(estimate - now).asMinutes();
                console.log("[SpookyFestival] Minutes until event: " + minutesUntilNextEvent);
                if (!webhookSent) {
                    if (minutesUntilNextEvent <= 10 && minutesUntilNextEvent >= 6) {
                        // console.log("[NewYear] Sending OneSignal push notification...");
                        //
                        // latestOneSignalNotification = new OneSignal.Notification({
                        //     template_id: "30e3e55e-a97b-4d0a-a6a6-aab55c93fe27"
                        // });
                        // latestOneSignalNotification.postBody["included_segments"] = ["Active Users"];
                        // latestOneSignalNotification.postBody["excluded_segments"] = ["Banned Users"];
                        //
                        // OneSignalClient.sendNotification(latestOneSignalNotification, function (err, response, data) {
                        //     if (err) {
                        //         console.warn("[NewYear] Failed to send OneSignal notification", err);
                        //     } else {
                        //         console.log("[NewYear] OneSignal notification sent!");
                        //         console.log(data);
                        //     }
                        // })

                        webhookSent = true;

                        console.log("[NewYear] Posting webhooks...");
                        webhookRunner.queryWebhooksAndRun("spookyFestival", theData);
                    }
                } else {
                    if (minutesUntilNextEvent <= 5 || minutesUntilNextEvent >= 20) {
                        webhookSent = null;
                    }
                }
            })
    })


    return function (req, res) {
        cachedQuery.respondWithCachedOrQuery(req, res);
    }
};
