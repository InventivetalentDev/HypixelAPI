import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {
    return function (req: Request, res: Response) {
        pool.getConnection(function(err,connection){
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "Failed to get connection from pool"
                });
                return;
            }

            connection.query("SELECT COUNT(id) AS total FROM skyblock_magma_timer_pings WHERE time > NOW() - INTERVAL 2 MINUTE", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.json({
                        success: false,
                        msg: "sql error"
                    });
                    connection.release();
                    return;
                }
                connection.query("SELECT COUNT(id) AS total FROM `skyblock_magma_timer_ips` WHERE time > NOW() - INTERVAL 2 HOUR", function (err, results1) {
                    if (err) {
                        console.warn(err);
                        res.json({
                            success: false,
                            msg: "sql error"
                        });
                        connection.release();
                        return;
                    }

                    res.set("Cache-Control","public, max-age=120");
                    res.json({
                        success: true,
                        msg: "",
                        activeUsers: results[0].total,
                        usersLastTwoHrs: results1[0].total
                    })
                    connection.release();
                })
            })
        });


    }
};