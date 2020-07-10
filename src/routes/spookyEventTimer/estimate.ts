import { SimpleIntervalTimer } from "../../classes/SimpleIntervalTimer";
import { Pool } from "mysql";
import { Vars } from "../../vars";
import { Request, Response } from "express";

// TODO: Split the event into a standalone file
export default function(vars: Vars, pool: Pool) {


    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;
    const oneHourInMillis = 3.6e+6;

    // Current interval seems to be about 5 days and 4 hours
    const eventInterval = fiveDaysInMillis+fourHoursInMillis;
    const eventDuration = oneHourInMillis;

    // const webhookRunner = require("../../webhookRunner")(pool);
    let webhookSent = false;

    let timer = new SimpleIntervalTimer("spookyFestival", eventInterval, eventDuration, pool, "skyblock_spooky_events", 1000 * 60 * 10);
    setTimeout(()=>timer.run(), 4000);


    return function (_: Request, res: Response) {
        res.json(timer.data);
    }
};
