const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");

const DAYS_IN_MONTH = 31;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_YEAR = DAYS_IN_MONTH * MONTHS_IN_YEAR;

const MINUTES_PER_DAY = 20;
const SECONDS_PER_HOUR = 50;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_MINUTE = SECONDS_PER_HOUR / 60;
const SECONDS_PER_TEN_MINUTES = SECONDS_PER_MINUTE * 10;
const MINUTES_PER_MONTH = DAYS_IN_MONTH * MINUTES_PER_DAY;
const SECONDS_PER_MONTH = DAYS_IN_MONTH * SECONDS_PER_DAY;

const MONTHS = {
    "1": "late_winter",
    "2": "early_spring",
    "3": "spring",
    "4": "late_spring",
    "5": "early_summer",
    "6": "summer",
    "7": "late_summer",
    "8": "early_autumn",
    "9": "autumn",
    "10": "late_autumn",
    "11": "early_winter",
    "12": "winter"
}

module.exports = function (vars, pool) {

    let cachedQuery = new CachedDatabaseQuery(pool, CachedDatabaseQuery.TEN_MINUTES, function (cb) {
        pool.query(
            "SELECT time,year,month,day,hour,minute FROM skyblock_calendar ORDER BY time DESC LIMIT 4", function (err, results) {
                if (err) {
                    console.warn(err);
                    cb({
                        success: false,
                        msg: "sql error"
                    }, null);
                    return;
                }

                if (!results || results.length <= 0) {
                    console.warn("[Calendar] No Data!");
                    cb({
                        success: false,
                        msg: "There is no data available!"
                    }, null);
                    return;
                }

                let now = Date.now();

                let lastLog = results[0];
                let lastLogTime = lastLog.time.getTime();
                let lastYear = lastLog.year;
                let lastMonth = lastLog.month;
                let lastDay = lastLog.day;
                let lastHour = lastLog.hour;
                let lastMinute = lastLog.minute;


                let theData = {
                    success: true,
                    msg: "",
                    type: "calendar",
                    now: now,
                    lastLog: {
                        time: Math.floor(lastLogTime / 1000),
                        year: lastYear,
                        month: lastMonth,
                        month_name: MONTHS["" + lastMonth],
                        day: lastDay,
                        hour: lastHour,
                        minute: lastMinute
                    },
                    ingame: {
                        DAYS_IN_MONTH,
                        MONTHS_IN_YEAR,
                        DAYS_IN_YEAR,
                    },
                    real: {
                        MINUTES_PER_DAY,
                        SECONDS_PER_DAY,
                        SECONDS_PER_MINUTE,
                        SECONDS_PER_TEN_MINUTES,
                        SECONDS_PER_HOUR,
                        MINUTES_PER_MONTH,
                        SECONDS_PER_MONTH
                    },
                    months: MONTHS
                };
                cb(null, theData);
            })
    })

    return function (req, res) {
        cachedQuery.respondWithCachedOrQuery(req, res);
    }
};
