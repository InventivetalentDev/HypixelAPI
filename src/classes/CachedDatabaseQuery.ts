import { createHash } from "crypto";
import { Pool } from "mysql";
import { Callback } from "../util";
import { Request, Response } from "express";

export const THIRTY_SECONDS = 1000 * 30;
export const ONE_MINUTE = 1000 * 60;
export const FIVE_MINUTES = 1000 * 60 * 5;
export const TEN_MINUTES = 1000 * 60 * 10;
export const ONE_MONTH = 2.628e+9;

export class CachedDatabaseQuery {
    private lastQueryTime = 0;
    private lastQueryResult: any = {};
    private lastQueryHash = "";

    constructor(
        private pool: Pool,
        private cacheTime: number,
        private queryHandler: (cb: Callback) => void
    ) {}

    queryDatabase(cb: Callback) {
        this.queryHandler(cb);
    }

    getCached() {
        let data = this.lastQueryResult;
        data.cached = true;
        data.time = Date.now();
        data._usingNewCache=true;

        return data;
    }

    getCachedOrQuery(cb: Callback) {
        let now = Date.now();

        if (now - this.lastQueryTime > this.cacheTime || !this.lastQueryResult) {// Query new
            this.queryDatabase((err, data) => {
                if (err) {
                    cb(err, null);
                    return;
                }
                if (data) {
                    this.lastQueryResult = data;
                    this.lastQueryTime = now;
                    this.lastQueryHash = createHash("md5").update("IAmSomeRandomData" + JSON.stringify(this.lastQueryResult)).digest("hex");

                    data.cached = false;
                    data.time = now;
                    data._usingNewCache=true;
                } else {
                    cb(undefined, this.getCached());// Return cached
                }
            })
        } else {
            cb(undefined, this.getCached());// Return cached
        }
    }

    respondWithCachedOrQuery(_: Request, res: Response) {
        this.getCachedOrQuery((err, data) => {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: err.message || "Unknown database error"
                });
                return;
            }

            res.set("X-Cached", "" + data.cached);
            res.set("Cache-Control", "public, max-age=" + (this.cacheTime / 1000));
            res.set("Last-Modified", (new Date(data.latest).toUTCString()));
            res.set("ETag", "\"" + this.lastQueryHash + "\"");
            res.json(data);
        })
    }

}
