import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml"};
const port=Number(process.env.PORT||5173);
createServer((req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(pathname==="/")pathname="/index.html";
    const path=resolve(root,"."+pathname);
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    const s=statSync(path);
    if(!s.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream","Cache-Control":"no-store"});
    createReadStream(path).pipe(res);
  }catch{res.writeHead(404).end("Not found");}
}).listen(port,"127.0.0.1",()=>console.log("Katsumeshi prototype: http://127.0.0.1:"+port));
