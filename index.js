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

const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 10 // limit each IP to 10 requests per windowMs
});
//  apply to all requests
app.use(limiter);

// app.use(express.static('public'));

const mysql = require("mysql");
const pool = mysql.createPool(vars.mysql);

const server = tunnel(vars.tunnel, function (err, server) {
    if (err) {
        throw err;
    }
    console.log("SSH Tunnel Opened");

    // connection.connect(function (err) {
    //     if (err) throw err;
    //
    //     console.log("MySQL connected");
    // });
});

const port = 3040;


app.get("/api", (req, res) => {
    res.json({
        success: true,
        msg: "Hello World!"
    });
});

app.get("/api/skyblock/bosstimer/magma/activeUsers", require("./routes/activeUsers")(vars, pool));
app.get("/api/skyblock/bosstimer/magma/estimatedSpawn", require("./routes/estimatedSpawn")(vars, pool));
app.get("/api/skyblock/bosstimer/magma/historyChart", require("./routes/historyChart")(vars, pool));
app.post("/api/skyblock/bosstimer/magma/addEvent", require("./routes/addEvent")(vars, pool));
app.post("/api/skyblock/bosstimer/magma/ping", require("./routes/ping")(vars, pool));


app.listen(port, () => console.log(`Example app listening on port ${ port }!`))

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ');
    console.log(err);
    throw err;
});