const tg = window.Telegram?.WebApp || null;
const state = {
  products: [],
  category: 'Hammasi',
  search: '',
  cart: JSON.parse(localStorage.getItem('lazzat_cart') || '{}'),
  token: localStorage.getItem('lazzat_token') || '',
  user: null,
  authMode: 'login'
};
const $ = s => document.querySelector(s);
const money = n => `${Number(n || 0).toLocaleString('uz-UZ')} so‘m`;
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pathname = location.pathname;

function toast(message, kind='') {
  const el = $('#toast'); if (!el) return;
  el.textContent = message; el.className = `toast show ${kind}`;
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.className = 'toast', 2600);
}
function notice(id, message, kind='error') {
  const el = $(id); if (!el) return;
  el.textContent = message; el.className = `notice show ${kind}`;
}
function saveCart() { localStorage.setItem('lazzat_cart', JSON.stringify(state.cart)); }
function cartItems() { return Object.entries(state.cart).map(([id,qty]) => { const p=state.products.find(x=>x.id===id); return p ? {...p,qty:Number(qty)} : null; }).filter(Boolean); }
function cartCount(){return cartItems().reduce((s,p)=>s+p.qty,0)}
function cartTotal(){return cartItems().reduce((s,p)=>s+p.price*p.qty,0)}

async function apiJson(url, options={}) {
  let r;
  try { r = await fetch(url, options); } catch { return {ok:false,message:'Server bilan bog‘lanib bo‘lmadi. Internet yoki npm start holatini tekshiring.'}; }
  let d = {};
  try { d = await r.json(); } catch { d = {ok:false,message:'Server javobi noto‘g‘ri.'}; }
  if (!r.ok && !d.message) d.message = `Server xatosi (${r.status}).`;
  return d;
}

async function telegramInit() {
  if (!tg) return;
  try { tg.ready(); tg.expand(); } catch {}
  document.querySelectorAll('.tg-badge').forEach(x => x.style.display='inline-flex');
  if (!tg.initData) return;
  try {
    const d = await apiJson('/api/telegram/session', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData})});
    if (d.ok) { state.token=d.token; state.user=d.user; localStorage.setItem('lazzat_token',d.token); renderRelevant(); }
  } catch {}
}
async function loadUser() {
  if (!state.token) { renderRelevant(); return; }
  const d = await apiJson('/api/me',{headers:{authorization:`Bearer ${state.token}`}});
  if (d.ok) { state.user=d.user; renderRelevant(); } else logout(false);
}
function logout(show=true){state.token='';state.user=null;localStorage.removeItem('lazzat_token');renderRelevant();if(show)toast('Akkauntdan chiqdingiz.');}
function fillCustomer(){
  if(!state.user)return;
  if($('#customerName'))$('#customerName').value ||= state.user.name||'';
  if($('#customerPhone'))$('#customerPhone').value ||= state.user.phone||'';
}

function authHtml(){
  if(state.user){
    const initial=esc((state.user.name||'L').slice(0,1).toUpperCase());
    return `<div class="account-signed"><div class="avatar large">${initial}</div><div class="account-signed-main"><span class="section-kicker">AKKAUNT</span><h3>${esc(state.user.name)}</h3><p>${esc(state.user.email || 'Telegram akkaunti bilan ulangan')}</p><div class="signed-meta"><span><i class="fa-solid fa-phone"></i> ${esc(state.user.phone || 'Telefon kiritilmagan')}</span>${state.user.telegramId?'<span><i class="fa-brands fa-telegram"></i> Telegram ulangan</span>':''}</div></div><button class="pill danger-pill" id="logoutBtn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Chiqish</button></div>`;
  }
  return `<div class="auth-box"><div class="auth-copy"><span class="section-kicker">AKKAUNT</span><h2>${state.authMode==='login'?'Xush kelibsiz!':'Yangi akkaunt yarating'}</h2><p>${state.authMode==='login'?'Buyurtmalarni saqlash va tarixni ko‘rish uchun kiring.':'Bir marta ro‘yxatdan o‘ting — keyingi buyurtmalar tezroq bo‘ladi.'}</p></div><div class="auth-switch"><button class="${state.authMode==='login'?'active':''}" data-auth="login">Kirish</button><button class="${state.authMode==='register'?'active':''}" data-auth="register">Ro‘yxatdan o‘tish</button></div><form id="authForm"><div class="form-row">${state.authMode==='register'?`<div class="field"><label>Ism</label><div class="input-icon"><i class="fa-solid fa-user"></i><input name="name" autocomplete="name" placeholder="Ismingiz" required></div></div><div class="field"><label>Telefon</label><div class="input-icon"><i class="fa-solid fa-phone"></i><input name="phone" autocomplete="tel" placeholder="+998 90 123 45 67" required></div></div>`:''}</div><div class="form-row"><div class="field"><label>Email</label><div class="input-icon"><i class="fa-solid fa-envelope"></i><input name="email" type="email" autocomplete="email" placeholder="siz@email.com" required></div></div><div class="field"><label>Parol</label><div class="input-icon"><i class="fa-solid fa-lock"></i><input name="password" type="password" autocomplete="current-password" placeholder="Kamida 6 belgi" minlength="6" required></div></div></div><div class="notice" id="authNotice"></div><button class="btn btn-primary full" type="submit"><i class="fa-solid ${state.authMode==='login'?'fa-right-to-bracket':'fa-user-plus'}"></i> ${state.authMode==='login'?'Akkauntga kirish':'Akkaunt yaratish'}</button></form></div>`;
}
function mountAuth(){
  const root=$('#authPanel'); if(!root)return;
  root.innerHTML=authHtml();
  $('#logoutBtn')?.addEventListener('click',()=>logout());
  root.querySelectorAll('[data-auth]').forEach(btn=>btn.addEventListener('click',()=>{state.authMode=btn.dataset.auth;mountAuth();}));
  $('#authForm')?.addEventListener('submit',submitAuth);
}
async function submitAuth(e){
  e.preventDefault(); const button=e.target.querySelector('button[type="submit"]'); button.disabled=true;
  const data=Object.fromEntries(new FormData(e.target)); const endpoint=state.authMode==='login'?'/api/login':'/api/register';
  const d=await apiJson(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  button.disabled=false;
  if(!d.ok){notice('#authNotice',d.message);return;}
  state.token=d.token;state.user=d.user;localStorage.setItem('lazzat_token',d.token);mountAuth();fillCustomer();toast(state.authMode==='login'?'Xush kelibsiz!':'Akkauntingiz yaratildi!','success');
  if(pathname.includes('account'))renderAccount();
}

function renderCategories(){
  const root=$('#categories');if(!root)return;
  const cats=['Hammasi',...new Set(state.products.map(p=>p.category))];
  root.innerHTML=cats.map(c=>`<button class="cat-btn ${c===state.category?'active':''}" data-cat="${esc(c)}"><i class="fa-solid ${iconForCategory(c)}"></i>${esc(c)}</button>`).join('');
  root.querySelectorAll('[data-cat]').forEach(btn=>btn.addEventListener('click',()=>{state.category=btn.dataset.cat;renderCategories();renderProducts();}));
}

function imgTag(src,alt,extra=''){const safe=esc(src);const name=String(alt||'').toLowerCase();const fallback=name.includes('fri')?'/assets/fries.svg':name.includes('pizza')?'/assets/pizza.svg':name.includes('lavash')?'/assets/lavash.svg':name.includes('hot')?'/assets/hotdog.svg':name.includes('qanot')||name.includes('wings')?'/assets/wings.svg':name.includes('nugget')?'/assets/nuggets.svg':name.includes('ichim')||name.includes('cola')||name.includes('limon')?'/assets/cola.svg':name.includes('combo')?'/assets/combo.svg':'/assets/burger.svg';return `<img loading="lazy" decoding="async" src="${safe}" alt="${esc(alt)}" ${extra} onerror="this.onerror=null;this.src='${fallback}'">`;}
function iconForCategory(c){return ({'Hammasi':'fa-grip','Burger':'fa-burger','Lavash':'fa-scroll','Pizza':'fa-pizza-slice','Gazak':'fa-drumstick-bite','Ichimlik':'fa-bottle-water','Combo':'fa-box-open','Hot-Dog':'fa-hotdog'})[c]||'fa-utensils';}
function renderProducts(){
  const root=$('#products');if(!root)return;
  const term=state.search.trim().toLowerCase();
  const list=state.products.filter(p=>(state.category==='Hammasi'||p.category===state.category)&&(`${p.name} ${p.desc} ${p.category}`.toLowerCase().includes(term)));
  const count=$('#resultCount');if(count)count.textContent=`${list.length} ta mahsulot`;
  root.innerHTML=list.length?list.map(p=>`<article class="product"><div class="product-media">${p.popular?'<span class="tag"><i class="fa-solid fa-star"></i> Mashhur</span>':''}${imgTag(p.image,p.name)}</div><div class="product-info"><div class="product-category">${esc(p.category)}</div><h3>${esc(p.name)}</h3><p class="desc">${esc(p.desc)}</p><div class="product-bottom"><strong class="price">${money(p.price)}</strong><button class="add" data-add="${esc(p.id)}"><i class="fa-solid fa-plus"></i></button></div></div></article>`).join(''):'<div class="empty wide"><div class="empty-icon"><i class="fa-solid fa-face-frown"></i></div><h3>Hech narsa topilmadi</h3><p>Qidiruvni o‘zgartirib ko‘ring.</p></div>';
  root.querySelectorAll('[data-add]').forEach(btn=>btn.addEventListener('click',()=>addToCart(btn.dataset.add)));
}
function addToCart(id){state.cart[id]=(state.cart[id]||0)+1;saveCart();renderCart();toast('Savatchaga qo‘shildi','success');try{tg?.HapticFeedback?.impactOccurred('light')}catch{}}
function changeQty(id,delta){state.cart[id]=Math.max(0,(state.cart[id]||0)+delta);if(!state.cart[id])delete state.cart[id];saveCart();renderCart();}
function renderCart(){
  const items=cartItems(); const total=cartTotal();const count=cartCount();
  const root=$('#cart'); if(root)root.innerHTML=items.map(p=>`<div class="cart-row">${imgTag(p.image,p.name)}<div class="cart-main"><strong>${esc(p.name)}</strong><span>${money(p.price)}</span><div class="qty"><button data-qty="${p.id}" data-delta="-1"><i class="fa-solid fa-minus"></i></button><b>${p.qty}</b><button data-qty="${p.id}" data-delta="1"><i class="fa-solid fa-plus"></i></button></div></div><strong class="cart-line">${money(p.price*p.qty)}</strong></div>`).join('');
  if(root)root.querySelectorAll('[data-qty]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.qty,Number(b.dataset.delta))));
  if($('#emptyCart'))$('#emptyCart').style.display=items.length?'none':'block'; if($('#checkout'))$('#checkout').style.display=items.length?'block':'none'; if($('#cartCountLabel'))$('#cartCountLabel').textContent=`${count} ta`;if($('#subTotal'))$('#subTotal').textContent=money(total);if($('#cartTotal'))$('#cartTotal').textContent=money(total);if($('#miniCount'))$('#miniCount').textContent=count;if($('#miniTotal'))$('#miniTotal').textContent=money(total);if($('#miniCart'))$('#miniCart').style.display=items.length?'flex':'none';
}
async function placeOrder(){
  if(!state.user){notice('#orderNotice','Buyurtma berish uchun avval akkauntga kiring.');$('#authPanel')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
  const items=cartItems(); if(!items.length){notice('#orderNotice','Savatcha bo‘sh.');return;}
  const name=$('#customerName')?.value.trim()||'';const ph=$('#customerPhone')?.value.trim()||'';const address=$('#address')?.value.trim()||'';const payment=$('#payment')?.value||'cash';
  if(name.length<2||ph.length<7||address.length<5){notice('#orderNotice','Ism, telefon va manzilni to‘liq kiriting.');return;}
  const btn=$('#placeOrder');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';
  const d=await apiJson('/api/orders',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${state.token}`},body:JSON.stringify({items:items.map(p=>({id:p.id,qty:p.qty})),payment,customer:{name,phone:ph,address}})});
  if(!d.ok){notice('#orderNotice',d.message);btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane"></i> Buyurtmani yuborish';return;}
  state.cart={};saveCart();renderCart();$('#successBox')?.classList.add('show');$('#checkout').style.display='none';$('#successText').textContent=`#${d.order.id} raqamli buyurtmangiz qabul qilindi. Jami: ${money(d.order.total)}.`;btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane"></i> Buyurtmani yuborish';toast('Buyurtma yuborildi!','success');try{tg?.HapticFeedback?.notificationOccurred('success')}catch{}
}
async function loadProducts(){const d=await apiJson('/api/products');if(!d.ok){$('#products').innerHTML='<div class="empty wide"><h3>Menyu yuklanmadi</h3><p>Server ishlamayapti. Terminalda <b>npm start</b> ni tekshiring.</p></div>';return;}state.products=d.products||[];}

async function renderAccount(){
  const root=$('#accountRoot');if(!root)return;
  if(!state.user){root.innerHTML=`<div class="panel account-auth-card"><div id="accountAuth"></div></div>`;mountAccountAuth();return;}
  const d=await apiJson('/api/orders',{headers:{authorization:`Bearer ${state.token}`}});
  const orders=d.ok?d.orders:[];
  root.innerHTML=`<div class="account-grid"><section class="panel profile-card"><div class="profile-cover"><div class="avatar giant">${esc((state.user.name||'L').slice(0,1).toUpperCase())}</div><div><span class="section-kicker">PROFIL</span><h2>${esc(state.user.name)}</h2><p>${esc(state.user.email||'Telegram foydalanuvchisi')}</p></div></div><form id="profileForm"><div class="form-row"><div class="field"><label>Ism</label><input name="name" value="${esc(state.user.name)}" required></div><div class="field"><label>Telefon</label><input name="phone" value="${esc(state.user.phone)}" required></div></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(state.user.email)}" required></div><div class="notice" id="profileNotice"></div><div class="profile-actions"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Saqlash</button><button class="btn btn-secondary" type="button" id="accountLogout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Chiqish</button></div></form></section><section class="panel history-card"><div class="history-head"><div><span class="section-kicker">TARIX</span><h2>Buyurtmalarim</h2></div><a class="btn btn-primary btn-small" href="/order.html"><i class="fa-solid fa-plus"></i> Yangi buyurtma</a></div>${orders.length?`<div class="history-list">${orders.map(orderHtml).join('')}</div>`:`<div class="empty"><div class="empty-icon"><i class="fa-solid fa-receipt"></i></div><h3>Hali buyurtma yo‘q</h3><p>Menyu ochib birinchi buyurtmangizni bering.</p><a class="btn btn-primary" href="/order.html"><i class="fa-solid fa-burger"></i> Menyuni ochish</a></div>`}</section></div>`;
  $('#profileForm').addEventListener('submit',saveProfile);$('#accountLogout').addEventListener('click',()=>logout());
}
function mountAccountAuth(){
  const root=$('#accountAuth'); if(!root)return; root.innerHTML=authHtml();
  root.querySelectorAll('[data-auth]').forEach(b=>b.addEventListener('click',()=>{state.authMode=b.dataset.auth;mountAccountAuth();}));
  $('#authForm')?.addEventListener('submit', async e=>{await submitAuth(e);renderAccount();});
  $('#logoutBtn')?.addEventListener('click',()=>logout());
}
function orderHtml(o){
  const badgeClass=o.status.includes('Bekor')?'cancel':o.status==='Yetkazildi'?'done':'active';
  return `<article class="history-order"><div class="history-main"><div class="history-icon"><i class="fa-solid fa-receipt"></i></div><div><strong>#${esc(o.id)}</strong><span>${new Date(o.createdAt).toLocaleString('uz-UZ')}</span><small>${o.items.map(i=>`${esc(i.name)} × ${i.qty}`).join(' · ')}</small></div></div><div class="history-side"><span class="status ${badgeClass}">${esc(o.status)}</span><b>${money(o.total)}</b></div></article>`;
}
async function saveProfile(e){
  e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;const body=Object.fromEntries(new FormData(e.target));const d=await apiJson('/api/profile',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${state.token}`},body:JSON.stringify(body)});btn.disabled=false;if(!d.ok){notice('#profileNotice',d.message);return;}state.user=d.user;notice('#profileNotice','Profil saqlandi.','success');mountAuth();toast('Profil yangilandi!','success');}
function renderRelevant(){
  if($('#authPanel')){mountAuth();fillCustomer();}
  if($('#accountRoot'))renderAccount();
}

async function bootOrder(){
  await telegramInit(); await loadProducts();
  const category=new URLSearchParams(location.search).get('category');if(category && state.products.some(p=>p.category===category))state.category=category;
  const product=new URLSearchParams(location.search).get('product');if(product&&state.products.some(p=>p.id===product))addToCart(product);
  renderCategories();renderProducts();renderCart();await loadUser();fillCustomer();
  $('#search')?.addEventListener('input',e=>{state.search=e.target.value;renderProducts();});$('#clearSearch')?.addEventListener('click',()=>{$('#search').value='';state.search='';renderProducts();});$('#placeOrder')?.addEventListener('click',placeOrder);$('#continueShopping')?.addEventListener('click',()=>{$('#successBox')?.classList.remove('show');$('#products')?.scrollIntoView({behavior:'smooth',block:'start'});});$('#openCart')?.addEventListener('click',()=>$('.cart-panel')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
async function bootAccount(){await telegramInit();await loadUser();await renderAccount();}


// PWA install — one clear action, never show native prompt + help modal together
let deferredInstallPrompt = null;
let installFlowBusy = false;
let installDismissed = sessionStorage.getItem('lazzat_install_dismissed') === '1';

function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
function isAndroid(){ return /android/i.test(navigator.userAgent); }
function supportsInstallBanner(){
  return isIOS() || isAndroid() || /chrome|edg/i.test(navigator.userAgent);
}

function setInstallUi({native=false, showFallback=false}={}){
  const nativeEls=['#installApp','#installAppNav'];
  nativeEls.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
    el.hidden=!native || isStandalone();
  }));
  const hint=document.querySelector('#installHint');
  if(hint){
    hint.hidden=!(showFallback && !native && !installDismissed && !isStandalone());
  }
  const help=document.querySelector('#installHelp');
  if(help && (native || isStandalone())) help.hidden=true;
}

function showInstallHelp(){
  const modal=document.querySelector('#installHelp');
  const text=document.querySelector('#installHelpText');
  if(!modal || !text) return toast('Brauzer menyusidan “Ilovani o‘rnatish”ni tanlang.');
  text.innerHTML = isIOS()
    ? '<b>iPhone/iPad:</b> “Ulashish” → <b>Bosh ekranga qo‘shish</b>. '
    : isAndroid()
      ? '<b>Android:</b> Chrome (⋮) → <b>Ilovani o‘rnatish</b> yoki <b>Bosh ekranga qo‘shish</b>.'
      : '<b>Kompyuter:</b> manzil satridagi o‘rnatish belgisini bosing yoki Chrome (⋮) → <b>Ilovani o‘rnatish</b>.';
  modal.hidden=false;
}

async function triggerInstall(){
  if(installFlowBusy) return;
  if(isStandalone()){
    toast('Lazzat allaqachon ilova sifatida o‘rnatilgan.','success');
    return;
  }
  installFlowBusy=true;
  try{
    if(deferredInstallPrompt){
      // Hide the custom fallback before opening Chrome's native install prompt.
      setInstallUi({native:true, showFallback:false});
      const prompt=deferredInstallPrompt;
      deferredInstallPrompt=null;
      prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==='accepted') toast('Lazzat ilovasi o‘rnatilmoqda.','success');
      else setInstallUi({native:false, showFallback:false});
    } else {
      // No native prompt available: show instructions only, not another install dialog.
      setInstallUi({native:false, showFallback:false});
      showInstallHelp();
    }
  } catch(e) {
    deferredInstallPrompt=null;
    setInstallUi({native:false, showFallback:false});
    showInstallHelp();
  } finally {
    installFlowBusy=false;
  }
}

window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  installDismissed=false;
  // Native button only. Do not show the bottom fallback at the same time.
  setInstallUi({native:true, showFallback:false});
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  setInstallUi({native:false, showFallback:false});
  document.querySelector('#installHelp')?.setAttribute('hidden','');
  document.querySelector('#installHint')?.setAttribute('hidden','');
  toast('🎉 Lazzat ilovasi o‘rnatildi!','success');
});

document.addEventListener('click',e=>{
  const install=e.target.closest('#installApp, #installAppNav, #installHintBtn');
  if(install){ e.preventDefault(); triggerInstall(); return; }
  if(e.target.closest('#installHintClose')){
    const h=document.querySelector('#installHint'); if(h) h.hidden=true;
    installDismissed=true;
    sessionStorage.setItem('lazzat_install_dismissed','1');
  }
  if(e.target.closest('#installHelpClose')){
    const h=document.querySelector('#installHelp'); if(h) h.hidden=true;
  }
});

function initPWA(){
  if(isStandalone()) return;
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(reg=>reg.update()).catch(()=>{});
  }
  // Do not display two install UIs. The app button appears only when Chrome gives us a native prompt.
  setInstallUi({native:Boolean(deferredInstallPrompt), showFallback:false});
}
window.addEventListener('load',initPWA);

// Gentle 3D pointer interaction for desktop users
(function init3D(){
  const scene=document.querySelector('.hero-3d-scene');
  const card=document.querySelector('.food-3d-card');
  if(!scene || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf=0;
  scene.addEventListener('pointermove',e=>{
    const r=scene.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      card.style.setProperty('--tilt-y',`${x*10}deg`);
      card.style.setProperty('--tilt-x',`${-y*8}deg`);
    });
  });
  scene.addEventListener('pointerleave',()=>{
    card.style.setProperty('--tilt-y','0deg');
    card.style.setProperty('--tilt-x','0deg');
  });
})();

// Reveal cards as they enter the viewport
(function initReveal(){
  const targets=document.querySelectorAll('.category-card,.product,.photo-card,.benefit,.step,.review,.final-cta-inner,.location-card');
  if(!targets.length || !('IntersectionObserver' in window)) return;
  targets.forEach(el=>el.classList.add('reveal-ready'));
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('revealed');io.unobserve(entry.target)}
  }),{threshold:.12});
  targets.forEach(el=>io.observe(el));
})();


if(pathname.endsWith('/order.html') || pathname==='/order') bootOrder();
else if(pathname.endsWith('/account.html') || pathname==='/account') bootAccount();
