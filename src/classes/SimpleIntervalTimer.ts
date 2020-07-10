import moment from "moment";
import { Pool } from "mysql";
import webhookRunner from "../webhookRunner";
import { WebhookResult } from "../util";

export class SimpleIntervalTimer {
    public data: any;

    private dbData: any;
    private webhookSent: boolean;
    private webhookRunner: WebhookResult;

    constructor(
        private name: string,
        private interval: number,
        private duration: number,
        private pool: Pool,
        private dbName: string,
        private calcInterval: number
    ) {
        this.name = name;
        this.interval = interval;
        this.duration = duration;
        this.pool = pool;
        this.dbName = dbName;
        this.calcInterval = calcInterval;
        this.webhookSent = false;
        this.webhookRunner = webhookRunner(this.pool);

        this.data = {
            success: false,
            msg: "calculating data",
            type: this.name,
            usingPreload: true
        }
    }

    run() {
        setTimeout(() => this.queryDb(), Math.floor(Math.random() * 5000));
        setInterval(()=>this.calculateData(), this.calcInterval);
    }

    queryDb(tryN = 0) {
        console.log("[" + this.name + "] Querying DB data...");
        let self = this;
        this.pool.getConnection(function (err, connection) {
            if (err) {
                console.warn(err);
                if (tryN < 5) {
                    setTimeout(() => self.queryDb(tryN + 1), 10000);
                }
                return;
            }
            connection.query(
                "SELECT time FROM " + self.dbName + " ORDER BY time DESC LIMIT 1", function (err, results) {
                    connection.release();
                    if (err) {
                        console.warn(err);
                        return;
                    }

                    if (!results || results.length <= 0) {
                        console.warn("[" + self.name + "] No Data!");
                        return;
                    }

                    self.dbData = results[0];
                    if (!self.data || !self.data.type || !self.data.success) {
                        self.calculateData();
                    }
                });
        });
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
