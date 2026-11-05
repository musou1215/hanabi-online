import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Server} from 'socket.io';
import {newGame,perform,publicGame} from './game.js';
const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 if(req.url?.startsWith('/socket.io/'))return;
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(dist,'.'+pathname);
  if(target!==dist&&!target.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
  let file=target;
  try{if(!(await stat(file)).isFile())file=path.join(dist,'index.html')}catch{file=path.join(dist,'index.html')}
  const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404);res.end('Not found')}
});
const io=new Server(server,{cors:{origin:true,methods:['GET','POST']}});
const rooms=new Map();
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function state(room){for(const p of room.players){const socket=io.sockets.sockets.get(p.socketId);if(socket)socket.emit('state',{room:room.code,players:room.players.map(x=>({name:x.name,connected:!!io.sockets.sockets.get(x.socketId)})),started:!!room.game,game:room.game?publicGame(room.game,p.index):null,you:p.index})}}
const fail=(ack,message)=>ack?.({ok:false,error:message});
io.on('connection',socket=>{
 socket.on('create',({name},ack)=>{let c;do{c=code()}while(rooms.has(c));const room={code:c,players:[],game:null};rooms.set(c,room);join(room,name,ack)});
 function join(room,name,ack){if(!room||room.game)return fail(ack,'ルームがないか、すでに開始しています');if(room.players.length>=5)return fail(ack,'満員です');const n=String(name||'プレイヤー').trim().slice(0,20)||'プレイヤー';const p={name:n,index:room.players.length,socketId:socket.id,token:crypto.randomUUID()};room.players.push(p);socket.data.room=room.code;socket.data.token=p.token;socket.join(room.code);ack?.({ok:true,room:room.code,token:p.token});state(room)}
 socket.on('join',({room,name},ack)=>join(rooms.get(String(room||'').toUpperCase()),name,ack));
 socket.on('resume',({room,token},ack)=>{const r=rooms.get(String(room||'').toUpperCase()),p=r?.players.find(p=>p.token===token);if(!p)return fail(ack,'再接続できません');p.socketId=socket.id;socket.data.room=r.code;socket.data.token=p.token;socket.join(r.code);ack?.({ok:true});state(r)});
 socket.on('start',(_,ack)=>{const r=rooms.get(socket.data.room);if(!r||r.players[0]?.token!==socket.data.token)return fail(ack,'ホストのみ開始できます');if(r.players.length<2)return fail(ack,'2人以上必要です');if(r.game)return fail(ack,'開始済みです');r.game=newGame(r.players.map(p=>p.name));ack?.({ok:true});state(r)});
 socket.on('reorder',(payload,ack)=>{const r=rooms.get(socket.data.room),p=r?.players.find(x=>x.token===socket.data.token);if(!r?.game||!p)return fail(ack,'ゲームがありません');if(r.game.status!=='playing')return fail(ack,'ゲームは終了しています');const hand=r.game.hands[p.index],ids=payload?.ids;if(!Array.isArray(ids)||ids.length!==hand.length||new Set(ids).size!==hand.length||!ids.every(id=>hand.some(c=>c.id===id)))return fail(ack,'カードの並べ替えが不正です');const byId=new Map(hand.map(c=>[c.id,c]));r.game.hands[p.index]=ids.map(id=>byId.get(id));ack?.({ok:true});state(r)});
 socket.on('action',(a,ack)=>{const r=rooms.get(socket.data.room),p=r?.players.find(x=>x.token===socket.data.token);if(!r?.game||!p)return fail(ack,'ゲームがありません');if(r.game.turn!==p.index)return fail(ack,'あなたの手番ではありません');try{r.game=perform(r.game,a);ack?.({ok:true});state(r)}catch(e){fail(ack,e.message)}});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.room);if(r)state(r)});
});
const port=Number(process.env.PORT)||3001;
server.listen(port,'0.0.0.0',()=>console.log(`HANABI server listening on ${port}`));
