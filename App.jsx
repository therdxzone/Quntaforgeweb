import {useState,useEffect,useRef,createContext,useContext} from 'react';
import {BrowserRouter,Routes,Route,Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {QRCodeSVG} from 'qrcode.react';

const api=async(p,o={})=>{
  const h={...(o.headers||{})};let body=o.body;
  if(localStorage.t)h.Authorization='Bearer '+localStorage.t;
  if(body&&!(body instanceof FormData)){h['Content-Type']='application/json';body=JSON.stringify(body)}
  const r=await fetch('/api'+p,{...o,headers:h,body});
  if(o.blob)return r.blob();
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Something went wrong');
  return j;
};
const G='bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl';
const GH=G+' hover:border-[#00A3FF]/70 hover:shadow-[0_0_28px_#00A3FF44] transition';
const Btn='px-5 py-2.5 rounded-xl bg-[#00A3FF] text-black font-semibold hover:shadow-[0_0_20px_#00A3FF] transition disabled:opacity-50 inline-block text-center';
const In='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-slate-200 outline-none focus:border-[#00A3FF]';
const gb=m=>m>=1024?(m/1024)+' GB':m+' MB';
const Ctx=createContext();
const useU=()=>useContext(Ctx);
const fileUrl=(f,w,type,qual)=>new Promise(res=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,w/i.width),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL(type,qual))};i.src=r.result};r.readAsDataURL(f)});
const Cube=({s=34})=><svg width={s} height={s} viewBox="0 0 40 40"><path d="M20 3l15 8.5L20 20 5 11.5z" fill="#E2E8F0"/><path d="M5 11.5L20 20v17L5 28.5z" fill="#00A3FF"/><path d="M35 11.5L20 20v17l15-8.5z" fill="#0369A1"/></svg>;
const Logo=({s=34})=>{const {S}=useU();return S.logo?<img src={S.logo} alt="logo" style={{height:s}} className="rounded-md object-contain"/>:<Cube s={s}/>};

export default function App(){
  const [user,setUser]=useState(null),[ready,setReady]=useState(false),[S,setS]=useState({});
  useEffect(()=>{
    api('/settings').then(setS).catch(()=>{});
    localStorage.t?api('/me').then(setUser).catch(()=>localStorage.removeItem('t')).finally(()=>setReady(true)):setReady(true);
  },[]);
  if(!ready)return null;
  return <Ctx.Provider value={{user,setUser,S}}><BrowserRouter>
    <Nav/>
    <main className="min-h-[70vh]"><Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/login" element={<Auth/>}/>
      <Route path="/order/:planId" element={<Start/>}/>
      <Route path="/pay/:id" element={<Pay/>}/>
      <Route path="/orders" element={<Orders/>}/>
      <Route path="/admin" element={<Admin/>}/>
      <Route path="*" element={<Home/>}/>
    </Routes></main>
    <Footer/>
  </BrowserRouter></Ctx.Provider>;
}

function Nav(){
  const {user,setUser,S}=useU(),nav=useNavigate(),[open,setOpen]=useState(false),[bar,setBar]=useState(true);
  const out=()=>{localStorage.removeItem('t');setUser(null);setOpen(false);nav('/')};
  const L=[['Home','/'],['Plans','/#pricing'],['Support',S.support_url||'#']];
  return <>
    {S.announce&&bar&&<div className="relative bg-gradient-to-r from-[#00A3FF]/25 via-[#00A3FF]/10 to-[#00A3FF]/25 border-b border-[#00A3FF]/30 text-center text-xs sm:text-sm py-2 px-8">{S.announce}<button onClick={()=>setBar(false)} className="absolute right-3 top-1.5">✕</button></div>}
    <header className="sticky top-0 z-30 bg-[#0B0F19]/85 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2"><Logo/><span className="hd text-xl font-bold text-white">Quanta<span className="text-[#00A3FF]">Forge</span></span></Link>
        <nav className="hidden md:flex gap-7 text-sm">{L.map(([x,h])=><a key={x} href={h} className="hover:text-white">{x}</a>)}</nav>
        <div className="flex items-center gap-3 text-sm">
          {user?.is_admin&&<Link to="/admin" className="hidden md:block text-[#00A3FF]">Admin</Link>}
          <Link to={user?'/orders':'/login'} className={Btn+' !py-1.5 !px-4'}>{user?'Client Area':'Login'}</Link>
          {user&&<button onClick={out} className="hidden md:block text-slate-400">Logout</button>}
          <button className="md:hidden text-2xl" onClick={()=>setOpen(!open)}>☰</button>
        </div>
      </div>
      {open&&<div onClick={()=>setOpen(false)} className="md:hidden px-4 pb-4 pt-3 space-y-3 text-sm border-t border-white/10">
        {L.map(([x,h])=><a key={x} href={h} className="block">{x}</a>)}
        {user?.is_admin&&<Link to="/admin" className="block text-[#00A3FF]">Admin Panel</Link>}
        {user&&<button onClick={out} className="block text-slate-400">Logout</button>}</div>}
    </header></>;
}

function Footer(){
  const {S}=useU();
  const soc=[['Discord',S.discord],['YouTube',S.youtube],['Instagram',S.instagram]].filter(x=>x[1]);
  return <footer className="mt-20 border-t border-white/10 bg-black/20">
    <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8 text-sm">
      <div><div className="flex items-center gap-2"><Logo/><b className="hd text-white text-lg">QuantaForge</b></div><p className="mt-3 text-slate-400 max-w-xs">Premium Minecraft hosting on AMD EPYC &amp; Ryzen. Built for smooth, lag-free worlds.</p></div>
      <div className="space-y-2"><b className="text-white">Legal</b><a href="#" className="block">Terms of Service</a><a href="#" className="block">Privacy Policy</a><a href="#" className="block">Refund Policy</a></div>
      <div className="space-y-3"><b className="text-white">Connect</b>
        <div className="flex gap-2 flex-wrap">{soc.map(([n,u])=><a key={n} href={u} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#00A3FF]">{n}</a>)}{!soc.length&&<span className="text-slate-500">Add links in Admin → Settings</span>}</div>
        <div className="flex gap-2 text-xs">{['UPI','GPay','PhonePe'].map(x=><span key={x} className="px-3 py-1 rounded-md bg-white/5 border border-white/10">{x}</span>)}</div></div>
    </div>
    <p className="text-center text-xs text-slate-500 pb-6">© {new Date().getFullYear()} QuantaForge. All rights reserved.</p></footer>;
}

function Home(){
  const {user,S}=useU(),[d,setD]=useState(null),[cat,setCat]=useState(),[loc,setLoc]=useState(),nav=useNavigate();
  useEffect(()=>{api('/catalog').then(x=>{setD(x);setCat(x.categories[0]?.id);setLoc(x.locations[0]?.id)})},[]);
  const order=id=>user?nav('/order/'+id):nav('/login?next='+encodeURIComponent('/order/'+id));
  const pill=a=>`px-4 py-2 rounded-full text-sm font-semibold transition ${a?'bg-[#00A3FF] text-black shadow-[0_0_18px_#00A3FF88]':'bg-white/5 border border-white/10 hover:border-[#00A3FF]/60'}`;
  const plans=d?d.plans.filter(p=>p.category_id==cat&&p.location_id==loc):[];
  const low=d&&d.plans.length?Math.min(...d.plans.map(p=>p.price)):20;
  return <>
    <section className="relative overflow-hidden" style={S.hero_img?{backgroundImage:`linear-gradient(#0B0F19dd,#0B0F19),url(${S.hero_img})`,backgroundSize:'cover',backgroundPosition:'center'}:{}}>
      <div className="gridbg absolute inset-0"/>
      <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-10 md:pt-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block text-xs px-3 py-1 rounded-full border border-[#00A3FF]/40 text-[#7DD3FC] bg-[#00A3FF]/10">⚡ Server goes live right after payment approval</span>
          <h1 className="hd text-4xl sm:text-6xl font-bold text-white mt-5 leading-[1.05]">Forge your<br/><span className="bg-gradient-to-r from-[#7DD3FC] to-[#00A3FF] bg-clip-text text-transparent">Minecraft world</span></h1>
          <p className="mt-5 text-slate-400 max-w-md">Smooth, lag-free gameplay on AMD EPYC &amp; Ryzen hardware with DDoS protection. Pay with UPI and play in minutes.</p>
          <div className="flex flex-wrap gap-3 mt-8"><a href="#pricing" className={Btn}>Explore Plans →</a>
            {S.discord&&<a href={S.discord} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl border border-white/20 hover:border-[#00A3FF]">Join Discord</a>}</div>
        </div>
        <div className="flex justify-center"><div className="fl relative"><div className="absolute inset-0 blur-3xl bg-[#00A3FF]/40 rounded-full"/><div className="relative"><Logo s={170}/></div></div></div>
      </div>
      <div className="relative max-w-6xl mx-auto px-4 pb-10"><div className={G+' grid grid-cols-2 md:grid-cols-4 text-center'}>
        {[['99.9%','Uptime'],['AMD','EPYC & Ryzen'],['24/7','Support'],['₹'+low,'Starting price']].map(([a,b],i)=>
          <div key={b} className={'py-5 '+(i%2?'border-l border-white/10 ':'')+(i>1?'border-t md:border-t-0 border-white/10 ':'')+(i==2?'md:border-l':'')}><p className="hd text-2xl font-bold text-white">{a}</p><p className="text-xs text-slate-400">{b}</p></div>)}</div></div>
    </section>

    <section className="max-w-6xl mx-auto px-4 mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[['🛡️','DDoS Protected','Attack filtering on every plan'],['⚡','Instant Setup','Auto-created after approval'],['🌏','3 Locations','India, Singapore, Dubai'],['💳','Easy UPI Pay','Scan, pay, upload proof']].map(([i,t,x])=>
        <div key={t} className={GH+' p-5 flex gap-4 items-center'}><div className="text-3xl">{i}</div><div><b className="text-white">{t}</b><p className="text-sm text-slate-400">{x}</p></div></div>)}
    </section>

    <section id="pricing" className="max-w-6xl mx-auto px-4 pt-20">
      <h2 className="hd text-3xl sm:text-4xl font-bold text-white text-center">Pick your <span className="text-[#00A3FF]">forge</span></h2>
      <p className="text-center text-slate-400 mt-2">Choose a tier and a location. Upgrade anytime.</p>
      {d&&<>
        <div className="flex flex-wrap justify-center gap-2 mt-7">{d.categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} className={pill(c.id==cat)}>{c.name}</button>)}</div>
        <div className="flex flex-wrap justify-center gap-2 mt-3">{d.locations.map(l=><button key={l.id} onClick={()=>setLoc(l.id)} className={pill(l.id==loc)}>📍 {l.name} <span className="opacity-70 text-xs">· {l.hardware}</span></button>)}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {plans.map((p,i)=><div key={p.id} className={GH+' relative overflow-hidden p-6 flex flex-col'}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00A3FF] to-[#7DD3FC]"/>
            {i===1&&<span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-[#00A3FF] text-black font-bold">POPULAR</span>}
            <div className="flex items-center gap-2"><Cube s={28}/><h3 className="text-lg font-bold text-white">{p.name}</h3></div>
            <p className="hd text-4xl font-bold text-white mt-4">{gb(p.ram_mb)}<span className="text-sm text-slate-400 font-normal"> RAM</span></p>
            <ul className="mt-4 space-y-2 text-sm flex-1">{[`${p.cpu_pct}% CPU`,`${gb(p.disk_mb)} NVMe SSD`,p.ddos?'DDoS Protection':'—','Instant setup'].map(x=><li key={x}><span className="text-[#00A3FF] mr-2">✓</span>{x}</li>)}</ul>
            <p className="mt-5 text-3xl font-bold text-[#00A3FF]">₹{p.price}<span className="text-xs text-slate-400 font-normal"> /month</span></p>
            <button onClick={()=>order(p.id)} className={Btn+' mt-4'}>Order Now →</button></div>)}
          {!plans.length&&<p className="col-span-full text-center text-slate-500">No plans in this combo yet.</p>}
        </div></>}
    </section>

    <section className="max-w-6xl mx-auto px-4 pt-20">
      <h2 className="hd text-3xl font-bold text-white text-center">How it works</h2>
      <div className="grid md:grid-cols-3 gap-4 mt-8">{[['1','Choose a plan','Pick your tier and location, then tell us your panel Gmail.'],['2','Pay via UPI','Scan the QR with any UPI app and upload the screenshot.'],['3','Server goes live','We verify, your server is created and the details reach your inbox.']].map(([n,t,x])=>
        <div key={n} className={G+' p-6'}><div className="hd w-10 h-10 rounded-xl bg-[#00A3FF]/15 border border-[#00A3FF]/40 text-[#00A3FF] font-bold flex items-center justify-center">{n}</div><b className="text-white block mt-4">{t}</b><p className="text-sm text-slate-400 mt-1">{x}</p></div>)}</div>
    </section></>;
}

function Auth(){
  const [sp]=useSearchParams(),nav=useNavigate(),{setUser}=useU();
  const [signup,setSignup]=useState(false),[f,setF]=useState({email:'',password:''}),[msg,setMsg]=useState(sp.get('verified')?'Email verified! Please log in.':''),[err,setErr]=useState('');
  const go=async e=>{
    e.preventDefault();setErr('');
    try{
      if(signup){const r=await api('/auth/signup',{method:'POST',body:f});setMsg(r.verified?'Account created! You can log in now.':'Verification link sent to your Gmail. Click it, then log in.');setSignup(false);return}
      const r=await api('/auth/login',{method:'POST',body:f});
      localStorage.t=r.token;setUser(r.user);nav(sp.get('next')||(r.user.is_admin?'/admin':'/orders'));
    }catch(e){setErr(e.message)}
  };
  return <form onSubmit={go} className={G+' max-w-sm mx-auto mt-16 p-6 space-y-4'}>
    <h2 className="text-2xl font-bold text-white">{signup?'Create account':'Login'}</h2>
    <p className="text-sm text-slate-400">{signup?'No panel account yet? Sign up with your Gmail.':'Already have a panel account? Log in.'}</p>
    {msg&&<p className="text-green-400 text-sm">{msg}</p>}{err&&<p className="text-red-400 text-sm">{err}</p>}
    <input className={In} type="email" placeholder="you@gmail.com" required value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
    <input className={In} type="password" placeholder="Password (6+ chars)" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
    <button className={Btn+' w-full'}>{signup?'Sign up':'Login'}</button>
    <button type="button" onClick={()=>{setSignup(!signup);setErr('')}} className="text-sm text-[#00A3FF] w-full">{signup?'Have an account? Login':'New here? Create account'}</button>
  </form>;
}

function Start(){
  const {planId}=useParams(),nav=useNavigate(),{user}=useU();
  const [plan,setPlan]=useState(),[has,setHas]=useState(null),[em,setEm]=useState(user?.email||''),[pw,setPw]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!user){nav('/login?next='+encodeURIComponent('/order/'+planId),{replace:true});return}
    api('/catalog').then(c=>setPlan(c.plans.find(p=>p.id==planId)));
  },[]);
  const go=async e=>{
    e.preventDefault();setBusy(true);setErr('');
    try{const o=await api('/orders',{method:'POST',body:{plan_id:+planId,has_panel:has,panel_email:em,panel_pass:pw}});nav('/pay/'+o.id,{replace:true})}
    catch(x){setErr(x.message);setBusy(false)}
  };
  return <div className={G+' max-w-md mx-auto mt-10 p-6 space-y-5'}>
    {plan&&<div className="flex justify-between text-sm bg-black/30 rounded-xl p-3"><b className="text-white">{plan.name} · {gb(plan.ram_mb)} RAM</b><span className="text-[#00A3FF] font-bold">₹{plan.price}</span></div>}
    <h2 className="hd text-xl font-bold text-white">Do you already have a Minecraft panel account?</h2>
    <div className="grid grid-cols-2 gap-3">{[[true,'Yes, I have'],[false,'No, create one']].map(([v,l])=>
      <button type="button" key={l} onClick={()=>setHas(v)} className={`py-3 rounded-xl border font-semibold ${has===v?'bg-[#00A3FF] text-black border-[#00A3FF]':'border-white/15'}`}>{l}</button>)}</div>
    {has!==null&&<form onSubmit={go} className="space-y-3">
      <p className="text-sm text-slate-400">{has?'Enter the Gmail of your panel account. Your new server will be added to it.':'Enter your Gmail and choose a password. We will create your panel account with these.'}</p>
      <input className={In} type="email" required placeholder="Panel Gmail" value={em} onChange={e=>setEm(e.target.value)}/>
      {!has&&<input className={In} type="password" required minLength={6} placeholder="Choose a panel password (6+)" value={pw} onChange={e=>setPw(e.target.value)}/>}
      {err&&<p className="text-red-400 text-sm">{err}</p>}
      <button disabled={busy} className={Btn+' w-full'}>{busy?'Please wait…':'Continue to payment →'}</button></form>}
  </div>;
}

function Pay(){
  const {id}=useParams(),{S}=useU(),[o,setO]=useState(null),[utr,setUtr]=useState(''),[file,setFile]=useState(),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const load=()=>api('/orders/'+id).then(setO).catch(e=>setErr(e.message));
  useEffect(()=>{load()},[]);
  if(!o)return <p className="text-center mt-20">{err||'Loading…'}</p>;
  const link=`upi://pay?pa=${encodeURIComponent(S.upi_id||'')}&pn=QuantaForge&am=${o.amount}&cu=INR&tn=${o.ref}`;
  const submit=async e=>{
    e.preventDefault();setBusy(true);setErr('');
    const fd=new FormData();fd.append('proof',file);fd.append('utr',utr);
    try{await api(`/orders/${id}/proof`,{method:'POST',body:fd});load()}catch(e){setErr(e.message)}setBusy(false);
  };
  const box=G+' max-w-md mx-auto mt-12 p-6 text-center space-y-4';
  if(o.status==='pending_review'||o.status==='provisioning')return <div className={box}><div className="text-5xl">⏳</div><h2 className="text-2xl font-bold text-white">Pending Admin Approval</h2><p className="text-sm">Order {o.ref} · {o.plan_name} · ₹{o.amount}. Your server will be created right after we verify your payment, and you'll get an email.</p><Link to="/orders" className={Btn}>My Orders</Link></div>;
  if(o.status==='active')return <div className={box}><div className="text-5xl">✅</div><h2 className="text-2xl font-bold text-white">Server Ready!</h2><Link to="/orders" className={Btn}>View Details</Link></div>;
  return <div className={box}>
    <h2 className="text-2xl font-bold text-white">Pay ₹{o.amount}</h2>
    <p className="text-sm text-slate-400">{o.plan_name} · {o.location_name} · Ref <b>{o.ref}</b></p>
    {o.status==='rejected'&&<p className="text-red-400 text-sm">Previous payment was rejected. Please re-upload a clear proof.</p>}
    {S.upi_id?<div className="inline-block bg-white p-3 rounded-xl"><QRCodeSVG value={link} size={200}/></div>
      :S.fallback_qr?<img src={S.fallback_qr} alt="UPI QR" className="mx-auto w-52 rounded-xl bg-white p-2"/>:<p className="text-red-400">UPI not configured yet.</p>}
    <p className="text-lg font-semibold text-[#00A3FF]">Scan &amp; Pay ₹{o.amount}</p>
    {S.upi_id&&<a href={link} className="sm:hidden text-sm underline text-[#00A3FF] block">Open in UPI app</a>}
    <form onSubmit={submit} className="space-y-3 text-left">
      <input className={In} placeholder="UTR / Transaction ID (optional)" value={utr} onChange={e=>setUtr(e.target.value)}/>
      <input className={In} type="file" accept="image/*" required onChange={e=>setFile(e.target.files[0])}/>
      {err&&<p className="text-red-400 text-sm">{err}</p>}
      <button disabled={busy} className={Btn+' w-full'}>{busy?'Uploading…':'Submit Payment Proof'}</button>
    </form></div>;
}

function Orders(){
  const {user}=useU(),nav=useNavigate(),[rows,setRows]=useState([]);
  useEffect(()=>{user?api('/orders/mine').then(setRows):nav('/login?next=/orders')},[]);
  const badge={awaiting_payment:'text-yellow-400',pending_review:'text-blue-400',active:'text-green-400',rejected:'text-red-400',provisioning:'text-blue-400'};
  return <div className="max-w-3xl mx-auto px-4 mt-10 space-y-4">
    <h2 className="text-2xl font-bold text-white">My Orders</h2>
    {rows.map(o=><div key={o.id} className={G+' p-4 space-y-1'}>
      <div className="flex justify-between"><b className="text-white">{o.plan_name} · ₹{o.amount}</b><span className={badge[o.status]}>{o.status.replace('_',' ')}</span></div>
      <p className="text-xs text-slate-400">{o.ref} · {o.location_name}</p>
      {(o.status==='awaiting_payment'||o.status==='rejected')&&<Link className="text-[#00A3FF] text-sm" to={'/pay/'+o.id}>Complete payment →</Link>}
      {o.server_info&&<div className="text-sm pt-2">
        <a className="text-[#00A3FF] underline" href={o.server_info.panel_url} target="_blank" rel="noreferrer">Open Game Panel</a><br/>
        Email: {o.server_info.email}<br/>Password: {o.server_info.password||'your existing panel password'}</div>}
    </div>)}
    {!rows.length&&<p className="text-slate-500">No orders yet.</p>}
  </div>;
}

/* ---------------- ADMIN ---------------- */
function Admin(){
  const {user}=useU(),[tab,setTab]=useState('Dashboard');
  const [st,setSt]=useState({}),[orders,setOrders]=useState([]),[cat,setCat]=useState({categories:[],locations:[],plans:[]});
  const reload=()=>{api('/admin/stats').then(setSt);api('/admin/orders').then(setOrders);
    Promise.all([api('/catalog'),api('/admin/plans')]).then(([c,p])=>setCat({...c,plans:p}))};
  useEffect(()=>{if(user?.is_admin)reload()},[]);
  if(!user?.is_admin)return <p className="text-center mt-20">Admins only. <Link className="text-[#00A3FF]" to="/login?next=/admin">Login</Link></p>;
  return <div className="max-w-5xl mx-auto px-4 mt-8">
    <div className="flex gap-2 overflow-x-auto pb-2">{['Dashboard','Payments','Plans','Settings'].map(t=>
      <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap border ${t===tab?'bg-[#00A3FF] text-black border-[#00A3FF]':'border-white/10'}`}>{t}{t==='Payments'&&st.pending>0?` (${st.pending})`:''}</button>)}</div>
    <div className="mt-6">
      {tab==='Dashboard'&&<div className="grid sm:grid-cols-3 gap-4">
        {[['Total Sales','₹'+(st.sales||0)],['Active Servers',st.active||0],['Pending Payments',st.pending||0]].map(([a,b])=>
          <div key={a} className={GH+' p-6'}><p className="text-sm text-slate-400">{a}</p><p className="text-3xl font-extrabold text-white mt-1">{b}</p></div>)}</div>}
      {tab==='Payments'&&<Payments orders={orders} reload={reload}/>}
      {tab==='Plans'&&<Plans cat={cat} reload={reload}/>}
      {tab==='Settings'&&<SettingsTab/>}
    </div></div>;
}

function Payments({orders,reload}){
  const [img,setImg]=useState(null),[busy,setBusy]=useState(0);
  const view=async o=>{const b=await api(`/admin/orders/${o.id}/proof`,{blob:true});setImg(URL.createObjectURL(b))};
  const act=async(o,a,q='')=>{
    if(a==='approve'&&!confirm(q?`Mark ${o.ref} active WITHOUT creating a server?`:`Approve ${o.ref} and create server?`))return;
    setBusy(o.id);
    try{await api(`/admin/orders/${o.id}/${a}${q}`,{method:'POST'})}catch(e){alert(e.message)}
    setBusy(0);reload();
  };
  return <div className="space-y-3">
    {orders.map(o=><div key={o.id} className={G+' p-4 space-y-3'}>
      <div className="text-sm"><b className="text-white">{o.plan_name} · ₹{o.amount}</b> <span className="text-slate-400">({o.location_name})</span><br/>
        Login: {o.email} · {o.ref}{o.utr&&` · UTR ${o.utr}`}<br/><span className="text-[#00A3FF]">{o.status.replace('_',' ')}</span></div>
      <div className="text-sm rounded-lg bg-black/30 p-3 select-all">
        <b className="text-white">Panel account:</b> {o.has_panel?'Already has one ✅':'Needs new account 🆕'}<br/>
        Gmail: {o.panel_email||'—'}{!o.has_panel&&<><br/>Password: {o.panel_pass||'—'}</>}</div>
      <div className="flex flex-wrap gap-2">
        {o.has_proof&&<button onClick={()=>view(o)} className="px-3 py-1.5 rounded-lg border border-white/20 text-sm">View Proof</button>}
        {o.status==='pending_review'&&<>
          <button disabled={busy===o.id} onClick={()=>act(o,'approve')} className={Btn+' !py-1.5 !bg-green-500'}>{busy===o.id?'Working…':'Approve + Auto create'}</button>
          <button disabled={busy===o.id} onClick={()=>act(o,'approve','?manual=1')} className="px-3 py-1.5 rounded-lg border border-green-500 text-green-400 text-sm">Approve (I'll create manually)</button>
          <button disabled={busy===o.id} onClick={()=>act(o,'reject')} className={Btn+' !py-1.5 !bg-red-500'}>Reject</button></>}
      </div></div>)}
    {!orders.length&&<p className="text-slate-500">No orders yet.</p>}
    {img&&<div onClick={()=>setImg(null)} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><img src={img} className="max-h-full max-w-full rounded-lg"/></div>}
  </div>;
}

function Crud({title,t,fields,rows,cat,reload,blank}){
  const [ed,setEd]=useState({}),[nw,setNw]=useState(blank);
  const get=(r,k)=>ed[r.id]?.[k]??r[k];
  const set=(id,k,v)=>setEd(e=>({...e,[id]:{...(e[id]||{}),[k]:v}}));
  const call=async(fn)=>{try{await fn();reload()}catch(e){alert(e.message)}};
  const cell=(f,v,on)=>{
    if(f.t==='bool')return <input type="checkbox" checked={!!v} onChange={e=>on(e.target.checked)}/>;
    if(f.t==='cat'||f.t==='loc'){const L=f.t==='cat'?cat.categories:cat.locations;
      return <select className={In} value={v||''} onChange={e=>on(+e.target.value)}><option value="">—</option>{L.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>}
    return <input className={In} type={f.t==='num'?'number':'text'} value={v??''} onChange={e=>on(f.t==='num'?(e.target.value===''?null:+e.target.value):e.target.value)}/>;
  };
  const row=(r,v,on,btns,key)=><div key={key} className={G+' p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end'}>
    {fields.map(f=><label key={f.k} className="text-xs text-slate-400">{f.l}{cell(f,v(f.k),x=>on(f.k,x))}</label>)}
    <div className="flex gap-2 col-span-2 sm:col-span-4">{btns}</div></div>;
  return <section className="mb-10"><h3 className="text-lg font-bold text-white mb-3">{title}</h3><div className="space-y-2">
    {rows.map(r=>row(r,k=>get(r,k),(k,x)=>set(r.id,k,x),<>
      <button className={Btn+' !py-1.5'} onClick={()=>call(()=>api(`/admin/${t}/${r.id}`,{method:'PUT',body:{...r,...ed[r.id]}}))}>Save</button>
      <button className="px-4 py-1.5 rounded-xl bg-red-500/80 text-white" onClick={()=>confirm('Delete?')&&call(()=>api(`/admin/${t}/${r.id}`,{method:'DELETE'}))}>Delete</button></>,r.id))}
    {row({},k=>nw[k],(k,x)=>setNw(n=>({...n,[k]:x})),
      <button className={Btn+' !py-1.5'} onClick={()=>call(async()=>{await api(`/admin/${t}`,{method:'POST',body:nw});setNw(blank)})}>+ Add new</button>,'new')}
  </div></section>;
}

function Plans({cat,reload}){
  const A={cat,reload};
  return <>
    <Crud title="Categories" t="categories" {...A} rows={cat.categories} blank={{name:''}} fields={[{k:'name',l:'Name'}]}/>
    <Crud title="Locations" t="locations" {...A} rows={cat.locations} blank={{name:'',hardware:'',ptero_location_id:null}}
      fields={[{k:'name',l:'Name'},{k:'hardware',l:'Hardware'},{k:'ptero_location_id',l:'Pterodactyl Location ID',t:'num'}]}/>
    <Crud title="Plans" t="plans" {...A} rows={cat.plans} blank={{category_id:cat.categories[0]?.id,location_id:cat.locations[0]?.id,name:'',ram_mb:1024,cpu_pct:100,disk_mb:5120,ddos:true,price:0,active:true}}
      fields={[{k:'name',l:'Name'},{k:'category_id',l:'Category',t:'cat'},{k:'location_id',l:'Location',t:'loc'},{k:'price',l:'Price ₹',t:'num'},
        {k:'ram_mb',l:'RAM (MB)',t:'num'},{k:'cpu_pct',l:'CPU %',t:'num'},{k:'disk_mb',l:'Disk (MB)',t:'num'},{k:'ddos',l:'DDoS',t:'bool'},{k:'active',l:'Active',t:'bool'}]}/>
  </>;
}

function SettingsTab(){
  const [s,setS]=useState({}),[ok,setOk]=useState('');
  useEffect(()=>{api('/admin/settings').then(setS)},[]);
  const img=(k,w,t,qq)=>async e=>{const f=e.target.files[0];if(f){const u=await fileUrl(f,w,t,qq);setS(x=>({...x,[k]:u}))}};
  const save=async()=>{try{await api('/admin/settings',{method:'PUT',body:s});setOk('Saved ✓ reloading…');setTimeout(()=>location.reload(),700)}catch(e){setOk(e.message)}};
  const groups=[['💳 Payment',[['upi_id','Master UPI ID (name@okaxis)'],['upi_name','Payee name']]],
    ['🎮 Minecraft Panel',[['panel_url','Panel link (https://panel.yoursite.com)'],['ptero_key','Application API key'],['ptero_nest','Nest ID'],['ptero_egg','Egg ID']]],
    ['🌐 Website',[['announce','Top announcement text'],['support_url','Support link'],['discord','Discord link'],['youtube','YouTube link'],['instagram','Instagram link']]]];
  const pic=(k,l,w,t,qq)=><div key={k} className="text-sm space-y-2"><p>{l}</p><input type="file" accept="image/*" className={In} onChange={img(k,w,t,qq)}/>
    {s[k]&&<div className="flex items-center gap-3"><img src={s[k]} className="h-20 rounded bg-white/10 p-1"/><button className="text-red-400 text-xs" onClick={()=>setS({...s,[k]:''})}>Remove</button></div>}</div>;
  return <div className="space-y-5 max-w-lg">
    {groups.map(([t,f])=><div key={t} className={G+' p-5 space-y-3'}><h3 className="font-bold text-white">{t}</h3>
      {f.map(([k,l])=><label key={k} className="block text-sm">{l}<input className={In+' mt-1'} value={s[k]||''} onChange={e=>setS({...s,[k]:e.target.value})}/></label>)}</div>)}
    <div className={G+' p-5 space-y-4'}><h3 className="font-bold text-white">🖼️ Images</h3>
      {pic('logo','Logo (PNG, square looks best)',300,'image/png')}
      {pic('hero_img','Hero background image',1200,'image/jpeg',0.65)}
      {pic('fallback_qr','Static fallback QR image',500,'image/png')}</div>
    <button onClick={save} className={Btn+' w-full'}>Save all settings</button><p className="text-sm text-center">{ok}</p>
  </div>;
}
