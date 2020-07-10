import { Pool } from "mysql";
import { SimpleIntervalTimer } from "../../classes/SimpleIntervalTimer";
import { Request, Response } from "express";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {

    const fiveDaysInMillis = 4.32e+8;
    const thirtyOneHoursInMillis = 1.116e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = thirtyOneHoursInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;

    let timer = new SimpleIntervalTimer("bankInterest", eventInterval, 1000, pool, "skyblock_bank_interest_events", 1000 * 60 * 10);
    setTimeout(()=>timer.run(), 1000);

    return function (req: Request, res: Response) {
        res.json(timer.data);
    }
};
