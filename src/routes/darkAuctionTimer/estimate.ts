import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";
import { SimpleIntervalTimer } from "../../classes/SimpleIntervalTimer";

export default function(_: Vars, pool: Pool) {

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = oneHourInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;


    let timer = new SimpleIntervalTimer("darkAuction", eventInterval, 1000 * 60, pool, "skyblock_dark_auction_events", 1000 * 60 * 5);
    setTimeout(()=>timer.run(), 2000);

    return function (req: Request, res: Response) {
        res.json(timer.data);
    }
};
