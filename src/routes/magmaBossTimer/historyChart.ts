import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {

    const colorMap: {[key: string]: string} = {
        blaze: "yellow",
        magma: "orange",
        music: "magenta",
        spawn: "red",
        death: "green"
    };

    return function (req: Request, res: Response) {

        let sinceHours = parseInt((req.query.hours as string) || "4") || 4;
        sinceHours = Math.max(4, Math.min(24, sinceHours));

        pool.query(
            "SELECT type,time_rounded,confirmations,time_average,time_latest FROM skyblock_magma_timer_events WHERE confirmations >= 25 AND time_rounded > NOW() - INTERVAL ? HOUR ORDER BY time_rounded ASC, confirmations DESC",
            sinceHours,
            function (err, results) {
                if (err) {
                    console.warn(err);
                    res.status(400).json({
                        success: false,
                        msg: "SQL error"
                    })
                    return;
                }

                let chartData = [];
                for (let i = 0; i < results.length; i++) {
                    let result = results[i];
                    let averageTime = (result.time_average.getTime() + result.time_latest.getTime()) / 2;

                    chartData.push({
                        x: averageTime,
                        name: result.type,
                        confirmations: result.confirmations,
                        color: colorMap[result.type]
                    });
                }

                res.set("Cache-Control","public, max-age=900");
                res.json({
                    success: true,
                    msg: "",
                    chart: chartData
                });
            })

    };
};
