// Loopback-only development adapter. No mock identity code is bundled in production.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createDB}=require('./usage-db.cjs');
const root=path.resolve(__dirname,'../dist'),port=Number(process.env.PORT||52190);
const allowed=new Set(['index.html','style.css','theme.css','penalty.css','words.js','shootout.js','penalty.js','app.js','about.js','usage.js','admin.html','admin.css','admin.js','images/vocabulary-atlas.png']);
const env={DB:createDB(),ADMIN_EMAIL:'local-owner@example.test',LEARNER_LINK_KEY:crypto.randomBytes(32).toString('hex')};
const adminSession=crypto.randomBytes(32).toString('hex');
async function main(){
  const {handle}=await import('../worker/index.mjs');
  const server=http.createServer(async(req,res)=>{
    if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end();}
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/signin-with-chatgpt'){
      res.writeHead(302,{'Location':'/admin','Set-Cookie':`local_admin=${adminSession}; Path=/; HttpOnly; SameSite=Strict`});return res.end();
    }
    if(url.pathname==='/signout-with-chatgpt'){
      res.writeHead(302,{'Location':'/','Set-Cookie':'local_admin=; Path=/; HttpOnly; Max-Age=0'});return res.end();
    }
    const headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(!name.startsWith('oai-authenticated-user-')&&typeof value==='string')headers.set(name,value);
    if((req.headers.cookie||'').split(';').some(c=>c.trim()===`local_admin=${adminSession}`)){
      headers.set('oai-authenticated-user-id','local-owner');headers.set('oai-authenticated-user-email',env.ADMIN_EMAIL);
    }
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413);return res.end();}chunks.push(chunk);}
    const request=new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    const result=await handle(request,env,async(route,request,security)=>{
      const name=route.slice(1);if(!allowed.has(name))return new Response('Not found',{status:404});
      const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png'};
      return new Response(request.method==='HEAD'?null:fs.readFileSync(path.join(root,name)),{headers:{...security,'Content-Type':types[name.split('.').pop()]}});
    });
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  });
  server.listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/admin · isolated test database, no production data`));
  process.on('SIGINT',()=>server.close(()=>{env.DB.close();process.exit();}));
}
main().catch(()=>{console.error('Preview failed');process.exitCode=1;});
