import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {
    return function (req: Request, res: Response) {
        pool.query("SELECT type,time_rounded,time_average,time_latest,confirmations FROM skyblock_magma_timer_events WHERE confirmations > 10 AND time_rounded > NOW() - INTERVAL 4 HOUR ORDER BY time_rounded ASC", function (err, results) {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }

            let events: {[key: string]: any} = {
                blaze: [],
                magma: [],
                music: [],
                spawn: [],
                death: []
            };

            for (let i = 0; i < results.length; i++) {
                let result = results[i];

                let t = result.time_rounded.getTime();

                // if (result.type === "blaze" && result.confirmations>100) {
                //     events[result.type].push([t - 1.8e+6, 0]);
                // }

                events[result.type].push([result.time_average.getTime()-10, 0]);

                events[result.type].push([result.time_average.getTime(), result.confirmations]);
                events[result.type].push([t, result.confirmations]);
                events[result.type].push([result.time_latest.getTime(), result.confirmations]);

                events[result.type].push([result.time_latest.getTime()+10, 0]);
                //
                // for (let k in events) {
                //     if (k !== result.type) {
                //         events[k].push([t, 0]);
                //     }
                // }

                // if (result.type === "death" && result.confirmations>100) {
                //     events[result.type].push([t + 1.8e+6, 0]);
                // }
            }

            let mapped = [];
            for (let k in events) {
                let arr = events[k];
                arr.sort(function (a: number[],b: number[]) {
                    return a[0]-b[0];
                });
                mapped.push({
                    name: k,
                    data: arr,
                    step: true
                })
            }

            res.set("Cache-Control","public, max-age=900");
            res.json({
                success: true,
                msg: "",
                series: mapped
            })
        })
    }
};
