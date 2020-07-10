import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {
    return function (req: Request, res: Response) {
        if (!req.query.names) {
            res.json({
                success: true,
                status: []
            });
            return;
        }
        let names = (req.query.names as string).split(",");
        if (names.length <= 0) {
            res.json({
                success: true,
                status: []
            });
            return;
        }

        let questionmarks = [];
        let status: any = [];
        for (let i = 0; i < names.length; i++) {
            status[i] = false;
            questionmarks.push('?');
        }


        let joined = questionmarks.join(",");
        pool.query("SELECT minecraftName,isMod FROM skyblock_magma_timer_pings WHERE isMod=1 AND minecraftName IN (" + joined + ") LIMIT 32", names, function (err, results) {
            if (err) {
                console.warn(err);
                res.json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }


            for (let i = 0; i < results.length; i++) {
                let result = results[i];
                status[names.indexOf(result.minecraftName)] = result.isMod === 1;
            }

            res.set("Cache-Control","public, max-age=30000");
            res.json({
                success: true,
                status: status
            });
        });
    };
};
