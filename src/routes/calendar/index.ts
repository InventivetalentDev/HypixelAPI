import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

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

const MONTHS: any = {
    "1": "early_spring",
    "2": "spring",
    "3": "late_spring",
    "4": "early_summer",
    "5": "summer",
    "6": "late_summer",
    "7": "early_autumn",
    "8": "autumn",
    "9": "late_autumn",
    "10": "early_winter",
    "11": "winter",
    "12": "late_winter"
}

const EVENTS = {
    yearly: [
        {
            key: "spookyFestival",
            name: "Spooky Festival",
            url: "spooky-festival",
            when: [
                {
                    start: {
                        month: "autumn",
                        day: 29
                    },
                    end: {
                        month: "autumn",
                        day: 31
                    }
                }
            ]
        },
        {
            key: "zoo",
            name: "Travelling Zoo",
            url: "zoo",
            when: [
                {
                    start: {
                        month: "early_summer",
                        day: 1
                    },
                    end: {
                        month: "early_summer",
                        day: 3
                    }
                },
                {
                    start: {
                        month: "early_winter",
                        day: 2
                    },
                    end: {
                        month: "early_winter",
                        day: 3
                    }
                }
            ]
        },
        {
            key: "jerryWorkshop",
            name: "Jerry's Workshop",
            url: "jerry-workshop",
            when: [
                {
                    start: {
                        month: "late_winter",
                        day: 1
                    },
                    end: {
                        month: "early_spring",// TODO: make sure this is correct
                        day: 1
                    }
                }
            ]
        },
        {
            key: "winter",
            name: "Season of Jerry",
            url: "winter",
            when: [
                {
                    start: {
                        month: "late_winter",
                        day: 24
                    },
                    end: {
                        month: "late_winter",
                        day: 26
                    }
                }
            ]
        },
        {
            key: "newYear",
            name: "New Year Celebration",
            url: "newyear",
            when: [
                {
                    start: {
                        month: "late_winter",
                        day: 29
                    },
                    end: {
                        month: "late_winter",
                        day: 31
                    }
                }
            ]
        }
    ],
    monthly: [
        {
            key: "interest",
            name: "Bank Interest",
            url: "bank-interest",
            when: [
                {
                    day: 1
                }
            ]
        }
    ]
}



export default function(_: Vars, pool: Pool) {

    let data: any = {
        success: false,
        msg:"not loaded yet"
    };
    function makeData() {
        pool.getConnection(function (err, connection) {
            if (err) {
                console.warn(err);
                return;
            }
            connection.query(
                "SELECT time,year,month,day,hour,minute FROM skyblock_calendar ORDER BY time DESC LIMIT 1", function (err, results) {
                    connection.release();
                    if (err) {
                        console.warn(err);
                        return;
                    }

                    if (!results || results.length <= 0) {
                        console.warn("[Calendar] No Data!");
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

                    let reverseMonths: any = {};
                    for (let monthNum in MONTHS) {
                        reverseMonths[MONTHS[monthNum]] = monthNum;
                    }

                    data = {
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
                        months: MONTHS,
                        reverseMonths: reverseMonths,
                        events: EVENTS
                    };
                })
        })
    }

    setTimeout(() => makeData(), Math.random() * 10000);

    return function (req: Request, res: Response) {
        res.json(data);
    }
};
