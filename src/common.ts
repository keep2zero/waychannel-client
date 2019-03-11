
export class WayCmd {
  cmd: string;
  data: any | { headers: any, body: Buffer, id: string }
  constructor(cmd: string, data: any | { headers: any, body: Buffer }) {
    this.cmd = cmd;
    this.data = data;
  }
  getDataByKey(key: string): any {
    return this.data[key];
  }

  getId(): string {
    return this.data.id;
  }
  getHeaders(): any {
    return this.data.headers;
  }

  getBody() {
    return this.data.body;
  }

  toString() {
    return JSON.stringify(this);
  }
}


export class WayCmdDecoder {

  static decoder(chunk: Buffer) {
    
    try {


      const cmdObject: { cmd: string, data: any } = JSON.parse(chunk.toString("utf-8"));
      const cmd = cmdObject.cmd;
      const data = cmdObject.data;
      if (cmd === "http") {
        data.body = Buffer.from(data.body, "base64");
      }
      return new WayCmd(cmd, data);
    } catch (e) {
      return new WayCmd("error", { body: '解析错误', headers: {}})
    }

  }

}
