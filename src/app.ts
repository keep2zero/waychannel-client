import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { WayCmd, WayCmdDecoder } from './common';


var argv = require('minimist')(process.argv.slice(2));
const shost = argv.shost;
const sport = argv.sport;
const port = argv.port;
const user = argv.user;
const pass = argv.pass;

console.log(argv)
const split = require('split');
class WayClientChannel {
  static channel: net.Socket;
  static timeoutIndex: any = -1;
  static start() {
     
    this.channel = net.createConnection({
      host: shost, 
      port: sport
    })
    const stream = this.channel.pipe(split());
    const local = {
      proto: 'http',
      host: 'localhost',
      port: port
    }

    let logined = false;
    let token = '';

    this.channel.setTimeout(1000 * 60 * 60);
    this.channel.setKeepAlive(true);

    this.channel.on('connect', () => {
      clearInterval(this.timeoutIndex);
      //发送登录请求 
      const request: WayCmd = new WayCmd('login', { uname: user, upass: pass });
      const string = request.toString();
      this.channel.write(string + "\r\n");
    })

    this.channel.on('end', () => {
      console.log("server break the client!")
      this.start();
    })

    this.channel.on('error', (error)=>{
      console.log("error", error.message)
      this.channel.end();
      clearInterval(this.timeoutIndex);
      this.timeoutIndex = setInterval(()=>{
        this.start();
      }, 500) 
    })


    stream.on('data', (chunk: Buffer) => {
     
      const result: WayCmd = WayCmdDecoder.decoder(chunk);
      

      if (result.cmd === 'login') {
        if (result.getDataByKey("token")) {
          logined = true;
          token = result.getDataByKey("token");
        }
      }


      if (result.cmd === 'error') {
        console.log(result.data.message);
      }



      //需要登录的操作

      if (logined) {

        if (result.cmd === 'http') {


          const headers = result.getHeaders();
          const origin = headers.host;
          const url = result.data.url;
          let host = local.proto + "://" + local.host;
          if (local.port !== 80) {
            host += ":" + local.port;
          }
          headers.host = local.host;
          headers.origin = origin;

          //避免数据缓存
          delete headers["if-none-match"];
          delete headers["if-modified-since"];


          if (headers.referer) {
            const ref = require('url').parse(headers.referer);
            headers.referer = host + ref.pathname || "" + ref.search || "" + ref.hash || "";

          }



          const options = {
            headers: { ...headers },
            host: local.host,
            port: local.port,
            method: result.data.method,
            path: url
          }
         
          const request = http.request(options, (res) => {
         
            let body = Buffer.allocUnsafe(0);
            res.on("data", chunk => {
              body = Buffer.concat([body, chunk], body.length + chunk.length); 
            })



            res.on('end', () => {
               
              const pass = new WayCmd('http', { token: token, headers: { ...res.headers, Expires: "0", 'Cache-Control': 'mno-store', Pragma: "no-cache" }, body: body.toString("base64"), id: result.getId() }).toString();

              this.channel.write(pass + "\r\n")

              

            })
          })

          request.on('error', (err: Error) => { 
            this.channel.write(new WayCmd('http', { token: token, headers: {}, body: Buffer.from(err.message).toString('base64'), id: result.getId() }) + "\r\n")
          })

          
          const postBody = result.getBody();
          const sp = Buffer.from('\r\n');
          request.write(Buffer.concat([postBody, sp], postBody.length + sp.length));
          request.end()
        }

         

      }

    })

  }
}




WayClientChannel.start();


