const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

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

    // Current interval seems to be about 5 days and 4 hours
    const eventInterval = fiveDaysInMillis+fourHoursInMillis;
    const eventDuration = oneHourInMillis*10;

    let dbData = {};
    function queryDb() {
        console.log("[Jerry Workshop Event] Querying DB data...");
        pool.query(
            "SELECT type,time FROM skyblock_jerry_events ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    return;
                }

                if (!results || results.length <= 0) {
                    console.warn("[Jerry Workshop Event] No Data!");
                    return;
                }

                dbData = results[0];
                if(!data.type){
                    calculateData();
                }
            })
    }
    queryDb();

    let data = {};
    function calculateData() {
        console.log("[Jerry Workshop Event] Calculating latest data...");

        let now = Date.now();

        let lastEvent = dbData;
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

        data = {
            success: true,
            msg: "",
            type: "jerryWorkshopEvent",
            queryTime: now,
            latest: lastEventTime,
            lastEstimate: lastEstimate,
            lastEstimateRelative: lastEstimateString,
            estimate: estimate,
            estimateRelative: estimateString,
            endEstimate: endEstimate,
            endEstimateRelative:endEstimateString,
            active: isActive,
            usingPreload: true
        };


        let minutesUntilNextEvent = moment.duration(estimate - now).asMinutes();
        console.log("[Jerry Workshop Event] Minutes until event: " + minutesUntilNextEvent);
        if (!webhookSent) {
            if (minutesUntilNextEvent <= 10 && minutesUntilNextEvent >= 6) {
                webhookSent = true;


                console.log("[Jerry Workshop Event] Posting webhooks...");
                webhookRunner.queryWebhooksAndRun("jerryWorkshopEvent", data);
            }
        } else {
            if (minutesUntilNextEvent <= 5 || minutesUntilNextEvent >= 20) {
                webhookSent = false;
            }
        }
    }

    setInterval(calculateData, 1000 * 60 * 10);

    return function (req, res) {
        res.json(data);
    }
};
