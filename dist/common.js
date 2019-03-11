"use strict";
exports.__esModule = true;
var WayCmd = (function () {
    function WayCmd(cmd, data) {
        this.cmd = cmd;
        this.data = data;
    }
    WayCmd.prototype.getDataByKey = function (key) {
        return this.data[key];
    };
    WayCmd.prototype.getId = function () {
        return this.data.id;
    };
    WayCmd.prototype.getHeaders = function () {
        return this.data.headers;
    };
    WayCmd.prototype.getBody = function () {
        return this.data.body;
    };
    WayCmd.prototype.toString = function () {
        return JSON.stringify(this);
    };
    return WayCmd;
}());
exports.WayCmd = WayCmd;
var WayCmdDecoder = (function () {
    function WayCmdDecoder() {
    }
    WayCmdDecoder.decoder = function (chunk) {
        try {
            var cmdObject = JSON.parse(chunk.toString("utf-8"));
            var cmd = cmdObject.cmd;
            var data = cmdObject.data;
            if (cmd === "http") {
                data.body = Buffer.from(data.body, "base64");
            }
            return new WayCmd(cmd, data);
        }
        catch (e) {
            return new WayCmd("error", { body: '解析错误', headers: {} });
        }
    };
    return WayCmdDecoder;
}());
exports.WayCmdDecoder = WayCmdDecoder;
