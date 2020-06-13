const moment = require("moment/moment");

class SimpleIntervalTimer {

    constructor(name, interval, duration, pool, dbName, calcInterval) {
        this.name = name;
        this.interval = interval;
        this.duration = duration;
        this.pool = pool;
        this.dbName = dbName;
        this.calcInterval = calcInterval;
        this.webhookSent = false;
        this.webhookRunner = require("../webhookRunner")(pool);
    }

    run() {
        this.queryDb();
        setInterval(this.calculateData, this.calcInterval);
    }

    queryDb() {
        console.log("[" + this.name + "] Querying DB data...");
        let self = this;
        this.pool.query(
            "SELECT time FROM " + this.dbName + " ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    return;
                }

                if (!results || results.length <= 0) {
                    console.warn("[" + this.name + "] No Data!");
                    return;
                }

                self.dbData = results[0];
                if (!self.data || !self.data.type) {
                    self.calculateData();
                }
            })
    }

    calculateData() {
        console.log("[" + this.name + "] Calculating latest data...");

        let now = Date.now();

        let lastEvent = this.dbData;
        let lastEventTime = lastEvent.time.getTime();

        let lastEstimate = now;
        let estimate = now;
        if (lastEventTime > 0) {
            let eventsSinceLast = Math.floor((now - lastEventTime) / this.interval);
            lastEstimate = lastEventTime + (eventsSinceLast * this.interval);

            eventsSinceLast++;

            estimate = lastEventTime + (eventsSinceLast * this.interval);
        }

        let endEstimate = lastEstimate + this.duration;

        let lastEstimateString = moment(lastEstimate).fromNow();
        let estimateString = moment(estimate).fromNow();
        let endEstimateString = moment(endEstimate).fromNow();

        let isActive = (now - lastEstimate) < this.duration;

        this.data = {
            success: true,
            msg: "",
            type: this.name,
            queryTime: now,
            calcTime: now,
            latest: lastEventTime,
            lastEstimate: lastEstimate,
            lastEstimateRelative: lastEstimateString,
            estimate: estimate,
            estimateRelative: estimateString,
            endEstimate: endEstimate,
            endEstimateRelative: endEstimateString,
            active: isActive,
            usingPreload: true
        };


        let minutesUntilNextEvent = moment.duration(estimate - now).asMinutes();
        console.log("[" + this.name + "] Minutes until event: " + minutesUntilNextEvent);
        if (!this.webhookSent) {
            if (minutesUntilNextEvent <= 10 && minutesUntilNextEvent >= 6) {
                this.webhookSent = true;


                console.log("[" + this.name + "] Posting webhooks...");
                this.webhookRunner.queryWebhooksAndRun(this.name, this.data);
            }
        } else {
            if (minutesUntilNextEvent <= 5 || minutesUntilNextEvent >= 20) {
                this.webhookSent = false;
            }
        }
    }


}


module.exports = SimpleIntervalTimer;
