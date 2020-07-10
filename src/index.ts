import express, { urlencoded, json, Request } from "express";
import cors from "cors";
import swaggerStats from "swagger-stats";
import tunnel from "tunnel-ssh";
import { Server } from "net";
import { createPool } from "mysql";
import rateLimit from "express-rate-limit";

const app = express();
app.use(urlencoded({extended: true}));
app.use(json());

app.use(cors({
    origin: "*"
}));

app.use(swaggerStats.getMiddleware(vars.swagger));

let tunnelRef: Server;


const server = tunnel(vars.tunnel, function (err, tnl) {
    if (err) {
        throw err;
    }
    console.log("SSH Tunnel Opened");
    tunnelRef = tnl;

    const pool = createPool(vars.mysql);
    // pool.ping((err, duration) => {
    //     console.log("SQL ping success: " + duration);


    // connection.connect(function (err) {
    //     if (err) throw err;
    //
    //     console.log("MySQL connected");
    // });


    const port = 3040;

    // TODO: Need to review how are we retriving the IP because it can be spoofied
    const limiterKey = function (req: Request): string {
        let result: string | undefined = req.headers['cf-connecting-ip'] as string;

        if (result === undefined)
            result = req.headers['x-forwarded-for'] as string;

        return result || req.ip;
    }

    const generalLimiter = rateLimit({
        windowMs: 2 * 60 * 1000, // 2 minutes
        max: 30,
        message:JSON.stringify({error:"Too many requests"}),
        keyGenerator: limiterKey
    });

    const magmaLimiter = rateLimit({
        windowMs: 2 * 60 * 1000, // 2 minutes
        max: 80,
        message:JSON.stringify({error:"Too many requests"}),
        keyGenerator: limiterKey
    });

    const magmaPostLimiter = rateLimit({
        windowMs: 2 * 60 * 1000, // 2 minutes
        max: 8,
        message:JSON.stringify({error:"Too many requests"}),
        keyGenerator: limiterKey
    });

    app.get("/api", (req, res) => {
        res.json({
            success: true,
            msg: "Hello World!"
        });
    });

    app.get("/api/time", require("./routes/time")(vars, pool));

/// User Proxy
    app.get("/api/player", require("./routes/user/userProxy")(vars, pool));
    app.get("/api/profile", require("./routes/profile/profileProxy")(vars, pool));
    app.get("/api/talismanList", require("./routes/profile/talismanList")(vars, pool));

/// Webhooks
    app.put("/api/webhook/add", require("./routes/webhooks/addWebhook")(vars, pool));
    app.delete("/api/webhook/delete", require("./routes/webhooks/deleteWebhook")(vars, pool));


/// Magma Boss Stuff
    app.get("/api/skyblock/bosstimer/magma/activeUsers", magmaLimiter, require("./routes/magmaBossTimer/activeUsers")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/eventStats", magmaLimiter,require("./routes/magmaBossTimer/eventStats")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/mostActiveUsers",magmaLimiter, require("./routes/magmaBossTimer/mostActiveUsers")(vars, pool));

    app.get("/api/skyblock/bosstimer/magma/estimatedSpawn",magmaLimiter, require("./routes/magmaBossTimer/estimatedSpawn")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/userCheck", magmaLimiter,require("./routes/magmaBossTimer/userCheck")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/historyChart",magmaLimiter, require("./routes/magmaBossTimer/historyChart")(vars, pool));
    app.post("/api/skyblock/bosstimer/magma/addEvent", magmaPostLimiter, require("./routes/magmaBossTimer/addEvent")(vars, pool));
    app.post("/api/skyblock/bosstimer/magma/ping", magmaPostLimiter, require("./routes/magmaBossTimer/ping")(vars, pool));


// NewYear timer
    app.get("/api/skyblock/newyear/estimate", generalLimiter, require("./routes/newYearTimer/estimate")(vars, pool));


// Zoo timer
    app.get("/api/skyblock/zoo/estimate", generalLimiter, require("./routes/zooTimer/estimate")(vars, pool));

    // WinterEvent timer
    app.get("/api/skyblock/winter/estimate", generalLimiter, require("./routes/winterEventTimer/estimate")(vars, pool));

    // JerryWorkshop timer
    app.get("/api/skyblock/jerryWorkshop/estimate", generalLimiter, require("./routes/jerryWorkshopTimer/estimate")(vars, pool));

// SpookyFestival timer
    app.get("/api/skyblock/spookyFestival/estimate", generalLimiter, require("./routes/spookyEventTimer/estimate")(vars, pool));


// DarkAuction timer
    app.get("/api/skyblock/darkauction/estimate", generalLimiter, require("./routes/darkAuctionTimer/estimate")(vars, pool));

// DarkAuction timer
    app.get("/api/skyblock/broodmother/estimate", generalLimiter, require("./routes/broodMotherTimer/estimate")(vars, pool));

// Interest timer
    app.get("/api/skyblock/bank/interest/estimate", generalLimiter, require("./routes/bankInterestTimer/estimate")(vars, pool));

    // PartyTime timer
    app.get("/api/skyblock/partyTime/estimate", generalLimiter, require("./routes/partyTimeTimer/estimate")(vars, pool));

    // Auction House Tracker
    // app.post("/api/skyblock/auction/logItem", require("./routes/auctionHouseTracker/logItem")(vars, pool));
    // app.get("/api/skyblock/auction/items", require("./routes/auctionHouseTracker/itemList")(vars, pool));
    // app.get("/api/skyblock/auction/priceTimeline/:item", require("./routes/auctionHouseTracker/priceTimeline")(vars, pool));

    app.get("/api/skyblock/calendar", generalLimiter, require("./routes/calendar/index")(vars, pool));

    let poolStart =Date.now();
    pool.getConnection(function (err,conn) {
        if(err)throw err;
        console.log("Got SQL pool connection after " + ((Date.now() - poolStart) / 1000) + "s");
        conn.release();
        setTimeout(function () {
            app.listen(port, () => console.log(`BossTimer app listening on port ${ port }!`));

            try{
                util.postDiscordMessage("Hello World!");
            }catch (e) {
                console.warn(e);
            }
        }, 2000);
    });

    setInterval(function () {
        console.log("Open SQL Pool connections: " + (pool as any)._allConnections.length);
    }, 30000);

});

function closeTunnel() {
    try {
        console.log("Attempting to close SSH tunnel");
        tunnelRef.close();
    } catch (e) {
        console.warn(e);
    }
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ');
    console.log(err);

    closeTunnel();

    throw err;
});

process.on('exit', () => {
    closeTunnel();
});
