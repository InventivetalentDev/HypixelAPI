const vars = require("./vars");

const fs = require('fs');
const request = require("request");
// require('request-debug')(request);
const qs = require('querystring');
const tunnel = require("tunnel-ssh");

const express = require('express');
const rateLimit = require("express-rate-limit");
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
app.use(bodyParser.urlencoded({extended: true}));

app.use(cors({
    origin: "https://hypixel.inventivetalent.org"
}));

let swStats = require('swagger-stats');
app.use(swStats.getMiddleware(vars.swagger));

const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 100 // limit each IP to 10 requests per windowMs
});
//  apply to all requests
// app.use(limiter);

// app.use(express.static('public'));

const mysql = require("mysql");

let tunnelRef;


const server = tunnel(vars.tunnel, function (err, tnl) {
    if (err) {
        throw err;
    }
    console.log("SSH Tunnel Opened");
    tunnelRef = tnl;

    const pool = mysql.createPool(vars.mysql);
    // pool.ping((err, duration) => {
    //     console.log("SQL ping success: " + duration);


    // connection.connect(function (err) {
    //     if (err) throw err;
    //
    //     console.log("MySQL connected");
    // });


    const port = 3040;


    app.get("/api", (req, res) => {
        res.json({
            success: true,
            msg: "Hello World!"
        });
    });

    app.get("/api/time", require("./routes/time")(vars, pool));

/// User Proxy
    app.get("/api/player", require("./routes/user/userProxy")(vars, pool));

/// Webhooks
    app.put("/api/webhook/add", require("./routes/webhooks/addWebhook")(vars, pool));
    app.delete("/api/webhook/delete", require("./routes/webhooks/deleteWebhook")(vars, pool));

    // deprecated
    app.put("/api/webhook/skyblock/bosstimer/add", require("./routes/webhooks/addWebhook")(vars, pool));
    app.delete("/api/webhook/skyblock/bosstimer/delete", require("./routes/webhooks/deleteWebhook")(vars, pool));

/// Magma Boss Stuff
    app.get("/api/skyblock/bosstimer/magma/activeUsers", require("./routes/magmaBossTimer/activeUsers")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/eventStats", require("./routes/magmaBossTimer/eventStats")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/mostActiveUsers", require("./routes/magmaBossTimer/mostActiveUsers")(vars, pool));

    app.get("/api/skyblock/bosstimer/magma/estimatedSpawn", require("./routes/magmaBossTimer/estimatedSpawn")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/userCheck", require("./routes/magmaBossTimer/userCheck")(vars, pool));
    app.get("/api/skyblock/bosstimer/magma/historyChart", require("./routes/magmaBossTimer/historyChart")(vars, pool));
    app.post("/api/skyblock/bosstimer/magma/addEvent", require("./routes/magmaBossTimer/addEvent")(vars, pool));
    app.post("/api/skyblock/bosstimer/magma/ping", require("./routes/magmaBossTimer/ping")(vars, pool));


// NewYear timer
    app.get("/api/skyblock/newyear/estimate", require("./routes/newYearTimer/estimate")(vars, pool));


// DarkAuction timer
    app.get("/api/skyblock/darkauction/estimate", require("./routes/darkAuctionTimer/estimate")(vars, pool));

// DarkAuction timer
    app.get("/api/skyblock/broodmother/estimate", require("./routes/broodMotherTimer/estimate")(vars, pool));

// Interest timer
    app.get("/api/skyblock/bank/interest/estimate", require("./routes/bankInterestTimer/estimate")(vars, pool));

    app.listen(port, () => console.log(`BossTimer app listening on port ${ port }!`));

    // });
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
