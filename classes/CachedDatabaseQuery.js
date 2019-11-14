const crypto = require("crypto");


class CachedDatabaseQuery {

    constructor(pool, cacheTime, queryHandler) {
        this.pool = pool;
        this.cacheTime = cacheTime;
        this.queryHandler = queryHandler;

        this.lastQueryTime = 0;
        this.lastQueryResult = {};
        this.lastQueryHash = "";
    }

    queryDatabase(cb) {
        this.queryHandler(cb);
    }

    getCached() {
        let data = this.lastQueryResult;
        data.cached = true;
        data.time = Date.now();
        data._usingNewCache=true;

        return data;
    }

    getCachedOrQuery(cb) {
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
                    this.lastQueryHash = crypto.createHash("md5").update("IAmSomeRandomData" + JSON.stringify(this.lastQueryResult)).digest("hex");

                    data.cached = false;
                    data.time = now;
                    data._usingNewCache=true;
                } else {
                    cb(null, this.getCached());// Return cached
                }
            })
        } else {
            cb(null, this.getCached());// Return cached
        }
    }

    respondWithCachedOrQuery(req, res) {
        this.getCachedOrQuery((err, data) => {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: err.msg || "Unknown database error"
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

CachedDatabaseQuery.THIRTY_SECONDS = 1000 * 30;
CachedDatabaseQuery.ONE_MINUTE = 1000 * 60;
CachedDatabaseQuery.FIVE_MINUTES = 1000 * 60 * 5;
CachedDatabaseQuery.TEN_MINUTES = 1000 * 60 * 10;

module.exports = CachedDatabaseQuery;
