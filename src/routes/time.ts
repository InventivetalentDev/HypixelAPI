import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../vars";

export default function(_: Vars, pool: Pool) {
    return function (_: Request, res: Response) {
        let date = new Date();

        res.set("Cache-Control", "public, max-age=30");
        res.json({
            timestamp: date.getTime(),
            utc: date.toUTCString()
        })
    };
};
