const http=require('node:http');
const net=require('net');
const {WebSocketServer,createWebSocketStream}=require('ws');
const { TextDecoder } = require('util');
const logcb= (...args)=>console.log.bind(this,...args);
const errcb= (...args)=>console.error.bind(this,...args);

const uuid= (process.env.UUID||'8c94dfd8-52dd-451c-8c85-26770cd41768').replace(/-/g, "");
const port= process.env.SERVER_PORT||8080;


const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', ws=>{
    console.log("on connection")
    ws.once('message', msg=>{
        const [VERSION]=msg;
        const id=msg.slice(1, 17);
        if(!id.every((v,i)=>v==parseInt(uuid.substr(i*2,2),16))) return;
        let i = msg.slice(17, 18).readUInt8()+19;
        const port = msg.slice(i, i+=2).readUInt16BE(0);
        const ATYP = msg.slice(i, i+=1).readUInt8();
        const host= ATYP==1? msg.slice(i,i+=4).join('.')://IPV4
            (ATYP==2? new TextDecoder().decode(msg.slice(i+1, i+=1+msg.slice(i,i+1).readUInt8()))://domain
                (ATYP==3? msg.slice(i,i+=16).reduce((s,b,i,a)=>(i%2?s.concat(a.slice(i-1,i+1)):s), []).map(b=>b.readUInt16BE(0).toString(16)).join(':'):''));//ipv6

        logcb('conn:', host,port);
        ws.send(new Uint8Array([VERSION, 0]));
        const duplex=createWebSocketStream(ws);
        net.connect({host,port}, function(){
            this.write(msg.slice(i));
            duplex.on('error',errcb('E1:')).pipe(this).on('error',errcb('E2:')).pipe(duplex);
        }).on('error',errcb('Conn-Err:',{host,port}));
    }).on('error',errcb('EE:'));
});

server.on('request', (req, res) => {
    console.log('I am hotpyptom and waiting for you on back4app.');
    console.log(req.url);
    
    if (req.url === "/") {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.write("<h1>Hello World</h1>");
        res.end();        
    };
});

server.listen(port, logcb('listen:', port));
