const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadEnv(file) {
  const env = { ...process.env };
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in env)) env[key] = value;
  }
  return env;
}

const ENV = loadEnv(path.join(__dirname, '.env'));
const APP_NAME = ENV.APP_NAME || 'Lazzat';
const BOT_TOKEN = ENV.BOT_TOKEN || ENV.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_PORT = Number(ENV.PORT || 5050);
const WEBAPP_URL = ENV.WEBAPP_URL || '';
const ADMIN_CHAT_ID = String(ENV.ADMIN_CHAT_ID || '');
const ADMIN_KEY = ENV.ADMIN_KEY || '';
const SESSION_SECRET = ENV.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const products = [
  { id:'lazzat-burger', name:'Lazzat Burger', category:'Burger', price:39000, desc:'Mol go‘shti, cheddar, yangi sabzavot va maxsus sous.', image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:true },
  { id:'chicken-burger', name:'Tovuq Burger', category:'Burger', price:37000, desc:'Qarsildoq tovuq, salat, bodring va creamy sous.', image:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:true },
  { id:'double-burger', name:'Ikki qavat Burger', category:'Burger', price:52000, desc:'Ikki dona shirali kotlet, ikki xil pishloq va sous.', image:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&fm=jpg&q=86&w=1200&crop=faces,center', popular:true },
  { id:'mix-lavash', name:'Aralash Lavash', category:'Lavash', price:42000, desc:'Mol go‘shti va tovuq, yangi sabzavotlar va maxsus sous.', image:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:true },
  { id:'beef-lavash', name:'Go‘shtli Lavash', category:'Lavash', price:44000, desc:'Yumshoq lavash, ziravorli mol go‘shti va sabzavot.', image:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:false },
  { id:'cheese-pizza', name:'Pishloqli Pizza', category:'Pizza', price:69000, desc:'Mozzarella, pomidor sousi va xushbo‘y oregano.', image:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:true },
  { id:'crispy-wings', name:'Qarsildoq Wings', category:'Gazak', price:42000, desc:'Qarsildoq tovuq qanotlari va ikki xil dip.', image:'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:true },
  { id:'nuggets', name:'Tovuq Nuggetlari', category:'Gazak', price:32000, desc:'Yumshoq tovuq bo‘laklari, qarsildoq qobiq bilan.', image:'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&fm=jpg&q=86&w=1000', popular:false },
  { id:'golden-fries', name:'Oltin Fri', category:'Gazak', price:22000, desc:'Issiq, qarsildoq va yengil tuzlangan fri.', image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&fm=jpg&q=86&w=1000', popular:false },
  { id:'hotdog', name:'Sosiskali Hot-Dog', category:'Hot-Dog', price:30000, desc:'Sosiskali hot-dog, karam, piyoz va maxsus sous.', image:'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&fm=jpg&q=86&w=1200', popular:false },
  { id:'cola', name:'Muzdek Cola', category:'Ichimlik', price:12000, desc:'Muzdek gazli ichimlik, 0.5 l.', image:'https://images.unsplash.com/photo-1753727470819-68332ed29d89?auto=format&fit=crop&fm=jpg&q=85&w=1200', popular:false },
  { id:'lemonade', name:'Uy Limonadi', category:'Ichimlik', price:16000, desc:'Yangi limon va yalpiz bilan tayyorlangan sovuq ichimlik.', image:'https://images.unsplash.com/photo-1753727470819-68332ed29d89?auto=format&fit=crop&fm=jpg&q=85&w=1200', popular:false },
  { id:'family-combo', name:'Oilaviy Combo', category:'Combo', price:129000, desc:'2 burger, katta fri, 2 ichimlik va 6 dona nuggets.', image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&fm=jpg&q=88&w=1300', popular:true },
  { id:'mega-combo', name:'Katta Combo', category:'Combo', price:169000, desc:'3 burger, katta fri, 3 ichimlik va wings.', image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&fm=jpg&q=88&w=1300', popular:true }
];

function ensureDb(){
  fs.mkdirSync(path.dirname(DB_PATH), { recursive:true });
  if(!fs.existsSync(DB_PATH)) writeDb({users:[],orders:[]});
}
function readDb(){
  ensureDb();
  try { return JSON.parse(fs.readFileSync(DB_PATH,'utf8')); }
  catch { return {users:[],orders:[]}; }
}
function writeDb(data){
  const tmp=DB_PATH+'.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data,null,2), 'utf8');
  fs.renameSync(tmp,DB_PATH);
}
function json(res,status,data){
  const body=JSON.stringify(data);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(body);
}
function notFound(res){ json(res,404,{ok:false,message:'Sahifa yoki API topilmadi.'}); }
function clean(value,max=160){ return String(value ?? '').trim().replace(/[<>]/g,'').slice(0,max); }
function phone(value){ return String(value ?? '').trim().replace(/[^0-9+() -]/g,'').slice(0,30); }
function money(value){ return `${Number(value||0).toLocaleString('uz-UZ')} so‘m`; }
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
  return `${salt}:${crypto.scryptSync(String(password),salt,64).toString('hex')}`;
}
function verifyPassword(password,stored){
  try{
    const [salt,hash]=String(stored).split(':');
    const next=crypto.scryptSync(String(password),salt,64).toString('hex');
    return hash && crypto.timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(next,'hex'));
  }catch{return false;}
}
function sign(payload){ return crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('hex'); }
function createSession(userId){
  const payload=`${userId}.${Date.now()}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}
function sessionUserId(token){
  try{
    const [raw,sig]=String(token||'').split('.'); if(!raw||!sig)return null;
    const payload=Buffer.from(raw,'base64url').toString('utf8'); const expected=sign(payload);
    if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
    const [id,created]=payload.split('.');
    if(!id || !created || Date.now()-Number(created)>30*24*60*60*1000)return null;
    return id;
  }catch{return null;}
}
function bearer(req){ const v=req.headers.authorization||''; return v.startsWith('Bearer ')?v.slice(7):''; }
function authUser(req){ const id=sessionUserId(bearer(req)); return id ? readDb().users.find(u=>u.id===id)||null : null; }
function publicUser(user){
  return user?{id:user.id,name:user.name,phone:user.phone||'',email:user.email||'',telegramId:user.telegramId||null,username:user.username||'',createdAt:user.createdAt}:null;
}
function parseJson(req){
  return new Promise((resolve,reject)=>{
    let raw='';
    req.on('data',chunk=>{
      raw+=chunk;
      if(raw.length>1_000_000){ reject(new Error('BODY_TOO_LARGE')); req.destroy(); }
    });
    req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('INVALID_JSON'))}});
    req.on('error',reject);
  });
}
function validateTelegramInitData(initData){
  if(!initData || !BOT_TOKEN)return {ok:false};
  const params=new URLSearchParams(initData); const hash=params.get('hash'); if(!hash)return {ok:false}; params.delete('hash');
  const check=[...params.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(BOT_TOKEN).digest();
  const computed=crypto.createHmac('sha256',secret).update(check).digest('hex');
  if(hash.length!==computed.length || !crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(computed)))return {ok:false};
  const authDate=Number(params.get('auth_date')||0);
  if(!authDate || Math.abs(Date.now()/1000-authDate)>86400)return {ok:false};
  try{
    const user=JSON.parse(params.get('user')||'null');
    return user?.id?{ok:true,user}:{ok:false};
  }catch{return {ok:false};}
}
function telegramRequest(method,payload={}){
  return new Promise((resolve,reject)=>{
    if(!BOT_TOKEN)return resolve({ok:false,description:'Bot token sozlanmagan'});
    const body=Buffer.from(JSON.stringify(payload));
    const req=https.request(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`,{
      method:'POST',headers:{'content-type':'application/json','content-length':body.length}
    },res=>{
      let raw='';
      res.on('data',c=>raw+=c);
      res.on('end',()=>{try{resolve(JSON.parse(raw))}catch{reject(new Error('Telegram javobi noto‘g‘ri'))}});
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
function botMarkup(){
  if(!/^https:\/\//i.test(WEBAPP_URL))return undefined;
  return {inline_keyboard:[[{text:'🍔 Lazzat ilovasini ochish',web_app:{url:WEBAPP_URL}}]]};
}
function botKeyboard(){
  return {keyboard:[[{text:'🍔 Menyu'},{text:'🛒 Buyurtma'}],[{text:'👤 Akkaunt'},{text:'📦 Buyurtmalarim'}],[{text:'📍 Manzil'},{text:'☎️ Aloqa'}]],resize_keyboard:true,is_persistent:true};
}
async function sendBot(chatId,text,extra={}){ return telegramRequest('sendMessage',{chat_id:chatId,text,parse_mode:'HTML',...extra}); }
function ensureTelegramUser(tgUser){
  const db=readDb();
  let user=db.users.find(u=>String(u.telegramId||'')===String(tgUser.id));
  const name=clean([tgUser.first_name,tgUser.last_name].filter(Boolean).join(' ')||'Telegram foydalanuvchi',80);
  if(!user){
    user={id:crypto.randomUUID(),name,phone:'',email:'',passwordHash:'',telegramId:String(tgUser.id),username:clean(tgUser.username||'',60),createdAt:new Date().toISOString()};
    db.users.push(user); writeDb(db);
  }else{
    user.name=name; user.username=clean(tgUser.username||user.username||'',60); writeDb(db);
  }
  return user;
}
async function notifyOrder(order){
  const db=readDb();
  if(ADMIN_CHAT_ID && BOT_TOKEN){
    const lines=order.items.map(x=>`• ${clean(x.name)} × ${x.qty} — ${money(x.lineTotal)}`).join('\n');
    await sendBot(ADMIN_CHAT_ID,`🧾 <b>Yangi buyurtma #${order.id}</b>\n\n👤 ${clean(order.customer.name)}\n📞 ${clean(order.customer.phone)}\n📍 ${clean(order.customer.address)}\n💳 ${clean(order.paymentLabel)}\n\n${lines}\n\n💰 <b>${money(order.total)}</b>`).catch(()=>{});
  }
  const user=db.users.find(u=>u.id===order.userId);
  if(user?.telegramId && BOT_TOKEN){
    await sendBot(user.telegramId,`✅ <b>Buyurtmangiz qabul qilindi!</b>\n\nBuyurtma: <b>#${order.id}</b>\nJami: <b>${money(order.total)}</b>\nHolat: <b>${order.status}</b>\n\nTayyor bo‘lgach botdan yangilik yuboramiz.`,{}).catch(()=>{});
  }
}
let botOffset=0;
async function handleTelegramMessage(message){
  const chatId=message?.chat?.id; if(!chatId)return;
  const raw=String(message.text||'').trim(); const text=raw.toLowerCase();
  if(message.from?.id) ensureTelegramUser(message.from);
  if(text.startsWith('/start')){
    const app=botMarkup();
    await sendBot(chatId,`Assalomu alaykum, <b>${clean(message.from?.first_name||'mehmon')}</b>! 👋\n\n<b>LAZZAT</b> — issiq burger, lavash, pizza va combo’lar.\n\nMenyudan tanlang, buyurtma bering va holatini botdan kuzating.`,{reply_markup:botKeyboard()});
    if(app) await sendBot(chatId,'📲 <b>Lazzat Mini App</b>\nBuyurtma berish uchun ilovani oching.',{reply_markup:app});
    return;
  }
  if(text==='/menu'||text==='🍔 menyu'){
    const lines=products.slice(0,10).map(p=>`${p.popular?'⭐ ':''}<b>${clean(p.name)}</b> — ${money(p.price)}`).join('\n');
    await sendBot(chatId,`🍔 <b>LAZZAT MENYU</b>\n\n${lines}\n\nTo‘liq menyu uchun ilovani oching.`,{reply_markup:botKeyboard()});
    const app=botMarkup(); if(app) await sendBot(chatId,'👇 To‘liq menyu va savatcha:',{reply_markup:app});
    return;
  }
  if(text==='/order'||text==='🛒 buyurtma'){
    const app=botMarkup();
    if(app) return sendBot(chatId,'🛒 <b>Buyurtma</b>\n\nTaomni tanlang, savatchaga qo‘shing va manzilni kiriting.',{reply_markup:app});
    return sendBot(chatId,`🛒 <b>Buyurtma</b>\n\nMini App uchun HTTPS manzil hali sozlanmagan.\n\nSayt lokalda http://localhost:${currentPort}/order.html orqali ishlaydi.\nTelegram ichidan ochish uchun tunnel yaratib, WEBAPP_URL ni .env ga qo‘yish kerak.`,{reply_markup:botKeyboard()});
  }
  if(text==='/status'||text==='📦 buyurtmalarim'){
    const db=readDb(); const uid=String(message.from?.id||'');
    const orders=db.orders.filter(o=>String(db.users.find(u=>u.id===o.userId)?.telegramId||'')===uid).slice(0,5);
    if(!orders.length)return sendBot(chatId,'📦 Sizda hali buyurtma yo‘q.');
    return sendBot(chatId,'📦 <b>Buyurtmalarim</b>\n\n'+orders.map(o=>`#${o.id} · <b>${clean(o.status)}</b> · ${money(o.total)}`).join('\n'));
  }
  if(text==='👤 akkaunt'||text==='/account'){
    const db=readDb(); const u=db.users.find(x=>String(x.telegramId||'')===String(message.from?.id));
    return sendBot(chatId,`👤 <b>Akkaunt</b>\n\nIsm: <b>${clean(u?.name||'')}</b>\nTelegram: @${clean(u?.username||'username')}\nTelefon: ${clean(u?.phone||'Kiritilmagan')}`);
  }
  if(text==='/id')return sendBot(chatId,`🆔 Telegram ID: <code>${chatId}</code>\n\nBuni ADMIN_CHAT_ID sifatida .env fayliga yozish mumkin.`);
  if(text==='/address'||text==='📍 manzil')return sendBot(chatId,'📍 <b>Yetkazib berish</b>\n\nQarshi shahri va yaqin hududlar. Buyurtmada aniq ko‘cha, uy va mo‘ljalni yozing.');
  if(text==='/contact'||text==='☎️ aloqa')return sendBot(chatId,'☎️ <b>Aloqa</b>\n\nTelegram bot: @UzbekFoodNewBot\nIsh vaqti: 10:00–23:30');
  if(text==='/help')return sendBot(chatId,'❓ <b>Yordam</b>\n\n/start — boshlash\n/menu — menyu\n/order — buyurtma\n/status — buyurtmalar\n/account — akkaunt\n/id — Telegram ID\n/help — yordam',{reply_markup:botKeyboard()});
  return sendBot(chatId,'Tushunmadim 🙂 Pastdagi tugmalardan foydalaning yoki /help yuboring.',{reply_markup:botKeyboard()});
}
async function startBot(){
  if(!BOT_TOKEN){ console.log('Telegram bot: BOT_TOKEN yo‘q, sayt rejimi.'); return; }
  try{
    const me=await telegramRequest('getMe');
    if(!me.ok){console.log('Telegram bot ulanmagan:',me.description||'token xatosi');return;}
    console.log(`Telegram bot ulandi: @${me.result.username}`);
    await telegramRequest('deleteWebhook',{drop_pending_updates:false});
    await telegramRequest('setMyCommands',{commands:[
      {command:'start',description:'Lazzat botini boshlash'},
      {command:'menu',description:'Menyuni ko‘rish'},
      {command:'order',description:'Buyurtma berish'},
      {command:'status',description:'Buyurtmalarim'},
      {command:'account',description:'Akkauntim'},
      {command:'help',description:'Yordam'}
    ]});
    await telegramRequest('setMyDescription',{description:'Lazzat — burger, lavash, pizza, fri va combo. Mini App orqali buyurtma bering.'});
    await telegramRequest('setMyShortDescription',{short_description:'Lazzat FastFood — mazali buyurtmalar'});
    if(botMarkup()) await telegramRequest('setChatMenuButton',{menu_button:{type:'web_app',text:'🍔 Buyurtma',web_app:{url:WEBAPP_URL}}});
  }catch(err){console.log('Telegram sozlamasi:',err.message);return;}
  while(true){
    try{
      const result=await telegramRequest('getUpdates',{offset:botOffset,timeout:25,allowed_updates:['message']});
      if(result.ok){ for(const upd of result.result||[]){ botOffset=upd.update_id+1; await handleTelegramMessage(upd.message); } }
      else await new Promise(r=>setTimeout(r,3000));
    }catch(err){ console.log('Telegram polling:',err.message); await new Promise(r=>setTimeout(r,3000)); }
  }
}

async function api(req,res,url){
  const method=req.method; const p=url.pathname;
  if(method==='GET'&&p==='/api/health')return json(res,200,{ok:true,app:APP_NAME,port:currentPort,time:new Date().toISOString()});
  if(method==='GET'&&p==='/api/products')return json(res,200,{ok:true,products});
  if(method==='GET'&&p==='/api/me'){
    const user=authUser(req); return user?json(res,200,{ok:true,user:publicUser(user)}):json(res,401,{ok:false,message:'Avval akkauntga kiring.'});
  }
  if(method==='POST'&&p==='/api/register'){
    let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const name=clean(body.name,80), ph=phone(body.phone), email=clean(body.email,120).toLowerCase(), pass=String(body.password||'');
    if(name.length<2)return json(res,400,{ok:false,message:'Ismni to‘liq kiriting.'});
    if(ph.length<7)return json(res,400,{ok:false,message:'Telefon raqamini kiriting.'});
    if(!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{ok:false,message:'Email manzilini to‘g‘ri kiriting.'});
    if(pass.length<6)return json(res,400,{ok:false,message:'Parol kamida 6 belgidan iborat bo‘lsin.'});
    const db=readDb();
    if(db.users.some(u=>u.email && u.email===email))return json(res,409,{ok:false,message:'Bu email allaqachon ro‘yxatdan o‘tgan.'});
    const user={id:crypto.randomUUID(),name,phone:ph,email,passwordHash:hashPassword(pass),telegramId:null,username:'',createdAt:new Date().toISOString()};
    db.users.push(user); writeDb(db);
    return json(res,201,{ok:true,token:createSession(user.id),user:publicUser(user)});
  }
  if(method==='POST'&&p==='/api/login'){
    let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const email=clean(body.email,120).toLowerCase(), pass=String(body.password||'');
    const user=readDb().users.find(u=>u.email===email);
    if(!user||!user.passwordHash||!verifyPassword(pass,user.passwordHash))return json(res,401,{ok:false,message:'Email yoki parol noto‘g‘ri.'});
    return json(res,200,{ok:true,token:createSession(user.id),user:publicUser(user)});
  }
  if(method==='POST'&&p==='/api/profile'){
    const user=authUser(req); if(!user)return json(res,401,{ok:false,message:'Avval akkauntga kiring.'});
    let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const name=clean(body.name,80),ph=phone(body.phone),email=clean(body.email,120).toLowerCase();
    if(name.length<2||ph.length<7||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{ok:false,message:'Ism, telefon va emailni to‘g‘ri kiriting.'});
    const db=readDb();
    if(db.users.some(u=>u.email===email&&u.id!==user.id))return json(res,409,{ok:false,message:'Bu email boshqa akkauntda ishlatilgan.'});
    user.name=name;user.phone=ph;user.email=email;writeDb(db);
    return json(res,200,{ok:true,user:publicUser(user)});
  }
  if(method==='POST'&&p==='/api/telegram/session'){
    let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const checked=validateTelegramInitData(body.initData); if(!checked.ok)return json(res,401,{ok:false,message:'Telegram sessiyasi tasdiqlanmadi.'});
    const user=ensureTelegramUser(checked.user);
    return json(res,200,{ok:true,token:createSession(user.id),user:publicUser(user)});
  }
  if(method==='POST'&&p==='/api/orders'){
    const user=authUser(req); if(!user)return json(res,401,{ok:false,message:'Buyurtma berish uchun akkauntga kiring.'});
    let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const incoming=Array.isArray(body.items)?body.items:[]; const items=[]; let total=0;
    for(const row of incoming){
      const product=products.find(x=>x.id===row.id); const qty=Math.max(0,Math.min(20,Math.floor(Number(row.qty)||0)));
      if(!product||qty<1)continue;
      const lineTotal=product.price*qty; items.push({id:product.id,name:product.name,price:product.price,qty,lineTotal}); total+=lineTotal;
    }
    if(!items.length)return json(res,400,{ok:false,message:'Savatcha bo‘sh.'});
    const customer={name:clean(body.customer?.name||user.name,80),phone:phone(body.customer?.phone||user.phone),address:clean(body.customer?.address,220)};
    if(customer.name.length<2)return json(res,400,{ok:false,message:'Ismni kiriting.'});
    if(customer.phone.length<7)return json(res,400,{ok:false,message:'Telefon raqamini kiriting.'});
    if(customer.address.length<5)return json(res,400,{ok:false,message:'Yetkazib berish manzilini kiriting.'});
    const payment={cash:'Naqd',card:'Karta'}.hasOwnProperty(body.payment)?body.payment:'cash';
    const paymentLabel=payment==='card'?'Karta':'Naqd';
    const db=readDb(); const order={id:String(Date.now()).slice(-8),userId:user.id,items,total,customer,payment,paymentLabel,status:'Qabul qilindi',createdAt:new Date().toISOString()};
    db.orders.unshift(order); writeDb(db); notifyOrder(order).catch(()=>{});
    return json(res,201,{ok:true,order});
  }
  if(method==='GET'&&p==='/api/orders'){
    const user=authUser(req);if(!user)return json(res,401,{ok:false,message:'Avval akkauntga kiring.'});
    return json(res,200,{ok:true,orders:readDb().orders.filter(o=>o.userId===user.id).slice(0,30)});
  }
  if(method==='GET'&&p==='/api/admin/orders'){
    if(!ADMIN_KEY)return json(res,503,{ok:false,message:'ADMIN_KEY sozlanmagan.'});
    if(String(req.headers['x-admin-key']||'')!==ADMIN_KEY)return json(res,403,{ok:false,message:'Admin kaliti noto‘g‘ri.'});
    const db=readDb(); return json(res,200,{ok:true,orders:db.orders.slice(0,100),users:db.users.length,products:products.length});
  }
  if(method==='PATCH'&&/^\/api\/admin\/orders\/[^/]+$/.test(p)){
    if(!ADMIN_KEY)return json(res,503,{ok:false,message:'ADMIN_KEY sozlanmagan.'});
    if(String(req.headers['x-admin-key']||'')!==ADMIN_KEY)return json(res,403,{ok:false,message:'Admin kaliti noto‘g‘ri.'});
    const id=p.split('/').pop(); let body;try{body=await parseJson(req)}catch{return json(res,400,{ok:false,message:'Ma’lumot formati noto‘g‘ri.'});}
    const allowed=['Qabul qilindi','Tayyorlanmoqda','Yo‘lda','Yetkazildi','Bekor qilindi'];
    if(!allowed.includes(body.status))return json(res,400,{ok:false,message:'Holat noto‘g‘ri.'});
    const db=readDb(); const order=db.orders.find(o=>o.id===id); if(!order)return json(res,404,{ok:false,message:'Buyurtma topilmadi.'});
    order.status=body.status; order.updatedAt=new Date().toISOString(); writeDb(db);
    const user=db.users.find(u=>u.id===order.userId);
    if(user?.telegramId)sendBot(user.telegramId,`📦 <b>Buyurtma #${order.id}</b> holati yangilandi:\n\n<b>${order.status}</b>`).catch(()=>{});
    return json(res,200,{ok:true,order});
  }
  return notFound(res);
}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json; charset=utf-8'};
function serveStatic(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/')pathname='/index.html';
  if(pathname==='/order')pathname='/order.html';
  if(pathname==='/account')pathname='/account.html';
  if(pathname==='/admin')pathname='/admin.html';
  const target=path.resolve(PUBLIC_DIR,'.'+pathname);
  if(!target.startsWith(PUBLIC_DIR+path.sep))return notFound(res);
  fs.stat(target,(err,st)=>{
    if(err||!st.isFile())return notFound(res);
    const ext=path.extname(target).toLowerCase();
    res.writeHead(200,{'content-type':MIME[ext]||'application/octet-stream','cache-control':(['.html','.js','.webmanifest'].includes(ext)||pathname==='/sw.js')?'no-cache':'public, max-age=3600'});
    fs.createReadStream(target).pipe(res);
  });
}

ensureDb();
let currentPort=DEFAULT_PORT;
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/'))await api(req,res,url); else serveStatic(req,res,url);
  }catch(err){console.error(err);if(!res.headersSent)json(res,500,{ok:false,message:'Serverda kutilmagan xato.'});else res.end();}
});
function listenWithFallback(port){
  const onError=err=>{
    if(err.code==='EADDRINUSE'){console.log(`Port ${port} band. ${port+1} sinab ko‘rilmoqda...`);server.close(()=>listenWithFallback(port+1));}
    else{console.error('Server ishga tushmadi:',err.message);process.exitCode=1;}
  };
  server.once('error',onError);
  server.listen(port,()=>{currentPort=port;fs.writeFileSync(path.join(__dirname,'.lazzat-port'),String(currentPort));console.log(`✅ ${APP_NAME}: http://localhost:${currentPort}`);startBot();});
}
listenWithFallback(DEFAULT_PORT);
