export const COLORS=['赤','青','緑','黄','白'];
export const SYMBOLS=['🔴','🔵','🟢','🟡','⚪'];
const counts={1:3,2:2,3:2,4:2,5:1};
export const score=g=>g.stacks.reduce((a,b)=>a+b,0);
const freshKnowledge=()=>({colors:[0,1,2,3,4],numbers:[1,2,3,4,5]});
export function newGame(names){
 if(names.length<2||names.length>5)throw Error('2〜5人で遊んでください');
 let id=0,deck=[];for(let c=0;c<5;c++)for(let n=1;n<=5;n++)for(let i=0;i<counts[n];i++)deck.push({id:String(++id),c,n});
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 const hands=names.map(()=>[]),knowledge={};const size=names.length<=3?5:4;
 for(let i=0;i<size;i++)for(const hand of hands){const card=deck.pop();hand.push(card);knowledge[card.id]=freshKnowledge()}
 return {names,hands,deck,knowledge,stacks:[0,0,0,0,0],tokens:8,lives:3,turn:0,status:'playing',reason:'',events:[],discard:[],finalTurns:null,lastHints:{}};
}
export function perform(g,a){
 if(g.status!=='playing')throw Error('ゲームは終了しています');
 const next=structuredClone(g),actor=next.turn;let description='';
 if(a.kind==='hint'){
  if(next.tokens<=0)throw Error('ヒントがありません');
  if(!Number.isInteger(a.target)||a.target<0||a.target>=next.names.length||a.target===actor)throw Error('ヒントの相手が不正です');
  if(a.type!=='color'&&a.type!=='number')throw Error('ヒントの種類が不正です');
  if(!Number.isInteger(a.value)||a.value<(a.type==='color'?0:1)||a.value>(a.type==='color'?4:5))throw Error('ヒントの値が不正です');
  const matches=next.hands[a.target].map(card=>a.type==='color'?card.c===a.value:card.n===a.value);
  if(!matches.some(Boolean))throw Error('該当するカードがありません');
  next.hands[a.target].forEach((card,i)=>{const k=next.knowledge[card.id];const key=a.type==='color'?'colors':'numbers';k[key]=k[key].filter(v=>matches[i]?v===a.value:v!==a.value)});
  next.lastHints[a.target]={from:actor,type:a.type,value:a.value,matchedIds:next.hands[a.target].filter((_,i)=>matches[i]).map(card=>card.id),at:Date.now()};
  next.tokens--;description=`${next.names[actor]} → ${next.names[a.target]}：${a.type==='color'?COLORS[a.value]:a.value}のヒント`;
 }else if(a.kind==='play'||a.kind==='discard'){
  const hand=next.hands[actor];if(!Number.isInteger(a.index)||a.index<0||a.index>=hand.length)throw Error('カードを選択してください');
  if(a.kind==='discard'&&next.tokens===8)throw Error('ヒントが最大なので捨てられません');
  const [card]=hand.splice(a.index,1);delete next.knowledge[card.id];
  if(a.kind==='play'){
   if(next.stacks[card.c]===card.n-1){next.stacks[card.c]++;if(card.n===5)next.tokens=Math.min(8,next.tokens+1);description=`${next.names[actor]}：${COLORS[card.c]}${card.n}を打ち上げ成功`}
   else{next.lives--;next.discard.push(card);description=`${next.names[actor]}：${COLORS[card.c]}${card.n}の打ち上げ失敗`}
  }else{next.discard.push(card);next.tokens=Math.min(8,next.tokens+1);description=`${next.names[actor]}：${COLORS[card.c]}${card.n}を捨てた`}
  if(next.deck.length){const drawn=next.deck.pop();hand.splice(a.index,0,drawn);next.knowledge[drawn.id]=freshKnowledge();if(next.deck.length===0&&next.finalTurns===null)next.finalTurns=next.names.length+1}
 }else throw Error('不明な行動です');
 next.events.push({at:Date.now(),actor,description,score:score(next),kind:a.kind});
 if(next.finalTurns!==null)next.finalTurns--;
 if(next.lives<=0){next.status='finished';next.reason='ミスが3回になりました'}
 else if(score(next)===25){next.status='finished';next.reason='25点達成！'}
 else if(next.finalTurns===0){next.status='finished';next.reason='山札終了後の最終ラウンドが終了しました'}
 next.turn=(actor+1)%next.names.length;
 return next;
}
export function publicGame(g,viewer,showAll=false){
 const out=structuredClone(g);out.hands=out.hands.map((hand,p)=>hand.map(card=>p===viewer&&!showAll?{id:card.id}:card));delete out.deck;out.deckCount=g.deck.length;
 // During play, the private deck and full hidden cards never leave the server.
 return out;
}
