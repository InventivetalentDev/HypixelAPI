import { Pool } from "mysql";
import webhookRunner from "../../webhookRunner";
import { Request, Response } from "express";
import { SimpleIntervalTimer } from "../../classes/SimpleIntervalTimer";
import { Vars } from "../../vars";

// TODO: Split the event into a standalone file
export default function(_: Vars, pool: Pool) {

    webhookRunner(pool);
    let webhookSent = false;


    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;

    // Current interval seems to be about 5 days and 4 hours and about 2hrs-20min before newyear's
    const eventInterval = (fiveDaysInMillis+fourHoursInMillis)/2;
    const eventDuration = oneHourInMillis;

    let timer = new SimpleIntervalTimer("zoo", eventInterval, eventDuration, pool, "skyblock_pet_events", 1000 * 60 * 10);
    setTimeout(()=>timer.run(), 6000);

    return function (req: Request, res: Response) {
        res.json(timer.data);
    }
};
