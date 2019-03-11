"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var net = require("net");
var http = require("http");
var common_1 = require("./common");
var argv = require('minimist')(process.argv.slice(2));
var shost = argv.shost;
var sport = argv.sport;
var port = argv.port;
var user = argv.user;
var pass = argv.pass;
console.log(argv);
var split = require('split');
var WayClientChannel = (function () {
    function WayClientChannel() {
    }
    WayClientChannel.start = function () {
        var _this = this;
        this.channel = net.createConnection({
            host: shost,
            port: sport
        });
        var stream = this.channel.pipe(split());
        var local = {
            proto: 'http',
            host: 'localhost',
            port: port
        };
        var logined = false;
        var token = '';
        this.channel.setTimeout(1000 * 60 * 60);
        this.channel.setKeepAlive(true);
        this.channel.on('connect', function () {
            clearInterval(_this.timeoutIndex);
            var request = new common_1.WayCmd('login', { uname: user, upass: pass });
            var string = request.toString();
            _this.channel.write(string + "\r\n");
        });
        this.channel.on('end', function () {
            console.log("server break the client!");
            _this.start();
        });
        this.channel.on('error', function (error) {
            console.log("error", error.message);
            _this.channel.end();
            clearInterval(_this.timeoutIndex);
            _this.timeoutIndex = setInterval(function () {
                _this.start();
            }, 500);
        });
        stream.on('data', function (chunk) {
            var result = common_1.WayCmdDecoder.decoder(chunk);
            if (result.cmd === 'login') {
                if (result.getDataByKey("token")) {
                    logined = true;
                    token = result.getDataByKey("token");
                }
            }
            if (result.cmd === 'error') {
                console.log(result.data.message);
            }
            if (logined) {
                if (result.cmd === 'http') {
                    var headers = result.getHeaders();
                    var origin_1 = headers.host;
                    var url = result.data.url;
                    var host = local.proto + "://" + local.host;
                    if (local.port !== 80) {
                        host += ":" + local.port;
                    }
                    headers.host = local.host;
                    headers.origin = origin_1;
                    delete headers["if-none-match"];
                    delete headers["if-modified-since"];
                    if (headers.referer) {
                        var ref = require('url').parse(headers.referer);
                        headers.referer = host + ref.pathname || "" + ref.search || "" + ref.hash || "";
                    }
                    var options = {
                        headers: __assign({}, headers),
                        host: local.host,
                        port: local.port,
                        method: result.data.method,
                        path: url
                    };
                    var request = http.request(options, function (res) {
                        var body = Buffer.allocUnsafe(0);
                        res.on("data", function (chunk) {
                            body = Buffer.concat([body, chunk], body.length + chunk.length);
                        });
                        res.on('end', function () {
                            var pass = new common_1.WayCmd('http', { token: token, headers: __assign({}, res.headers, { Expires: "0", 'Cache-Control': 'mno-store', Pragma: "no-cache" }), body: body.toString("base64"), id: result.getId() }).toString();
                            _this.channel.write(pass + "\r\n");
                        });
                    });
                    request.on('error', function (err) {
                        _this.channel.write(new common_1.WayCmd('http', { token: token, headers: {}, body: Buffer.from(err.message).toString('base64'), id: result.getId() }) + "\r\n");
                    });
                    var postBody = result.getBody();
                    var sp = Buffer.from('\r\n');
                    request.write(Buffer.concat([postBody, sp], postBody.length + sp.length));
                    request.end();
                }
            }
        });
    };
    WayClientChannel.timeoutIndex = -1;
    return WayClientChannel;
}());
WayClientChannel.start();
