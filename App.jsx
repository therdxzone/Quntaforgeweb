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
  const {user,setUser,S}=useU(),nav=useNavigate();
  const out=()=>{localStorage.removeItem('t');setUser(null);nav('/')};
  return <header className="sticky top-0 z-20 bg-[#0B0F19]/80 backdrop-blur border-b border-white/10">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <Link to="/" className="text-xl font-extrabold text-white">Quanta<span className="text-[#00A3FF]">Forge</span></Link>
      <nav className="hidden sm:flex gap-6 text-sm">
        <Link to="/">Home</Link><a href="/#pricing">Minecraft</a><a href="/#pricing">VPS</a>
        <a href={S.support_url||'#'} target="_blank" rel="noreferrer">Support</a>
      </nav>
      <div className="flex items-center gap-2 text-sm">
        {user?.is_admin&&<Link to="/admin" className="text-[#00A3FF]">Admin</Link>}
        {user?<><Link to="/orders" className={Btn+' !py-1.5'}>Client Area</Link><button onClick={out} className="text-slate-400">Logout</button></>
             :<Link to="/login" className={Btn+' !py-1.5'}>Client Area / Login</Link>}
      </div>
    </div></header>;
}

function Footer(){
  return <footer className="mt-16 border-t border-white/10 py-8 text-center text-sm text-slate-400 space-y-3">
    <div className="flex justify-center gap-5"><a href="#">TOS</a><a href="#">Privacy</a><a href="#">Refund Policy</a></div>
    <div className="flex justify-center gap-4 text-slate-300"><span>Discord</span><span>YouTube</span><span>Instagram</span></div>
    <div className="flex justify-center gap-3 text-xs">{['UPI','GPay','PhonePe'].map(x=><span key={x} className="px-3 py-1 rounded-md border border-white/10">{x}</span>)}</div>
    <p>© {new Date().getFullYear()} QuantaForge</p></footer>;
}

function Home(){
  const [d,setD]=useState(null),[cat,setCat]=useState(),[loc,setLoc]=useState(),nav=useNavigate(),{user}=useU();
  useEffect(()=>{api('/catalog').then(x=>{setD(x);setCat(x.categories[0]?.id);setLoc(x.locations[0]?.id)})},[]);
  const order=id=>user?nav('/order/'+id):nav('/login?next='+encodeURIComponent('/order/'+id));
  const tab=a=>`px-4 py-2 rounded-xl text-sm font-semibold border transition ${a?'bg-[#00A3FF] text-black border-[#00A3FF]':'border-white/10 hover:border-[#00A3FF]/60'}`;
  const plans=d?d.plans.filter(p=>p.category_id==cat&&p.location_id==loc):[];
  return <>
    <section className="text-center px-4 pt-16 pb-12 max-w-3xl mx-auto">
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight">High-Performance <span className="text-[#00A3FF]">Minecraft</span> Hosting</h1>
      <p className="mt-5 text-slate-400">Lag-free servers on AMD EPYC &amp; Ryzen, DDoS protection, instant setup after payment approval.</p>
      <a href="#pricing" className={Btn+' mt-8'}>View Plans</a>
    </section>
    <section id="pricing" className="max-w-6xl mx-auto px-4">
      {d&&<>
        <div className="flex flex-wrap justify-center gap-2">{d.categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} className={tab(c.id==cat)}>{c.name}</button>)}</div>
        <div className="flex flex-wrap justify-center gap-2 mt-3">{d.locations.map(l=><button key={l.id} onClick={()=>setLoc(l.id)} className={tab(l.id==loc)}>{l.name} ({l.hardware})</button>)}</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {plans.map(p=><div key={p.id} className={GH+' p-6 flex flex-col'}>
            <h3 className="text-xl font-bold text-white">{p.name}</h3>
            <p className="text-3xl font-extrabold text-[#00A3FF] mt-2">₹{p.price}<span className="text-sm text-slate-400">/mo</span></p>
            <ul className="mt-4 space-y-1.5 text-sm flex-1">
              <li>🧠 {gb(p.ram_mb)} RAM</li><li>⚡ {p.cpu_pct}% CPU</li><li>💾 {gb(p.disk_mb)} SSD</li><li>🛡️ DDoS Protection {p.ddos?'✓':'✗'}</li></ul>
            <button onClick={()=>order(p.id)} className={Btn+' mt-5'}>Order Now</button></div>)}
          {!plans.length&&<p className="col-span-full text-center text-slate-500">No plans here yet.</p>}
        </div></>}
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
  const {planId}=useParams(),nav=useNavigate(),{user}=useU(),done=useRef(false),[err,setErr]=useState('');
  useEffect(()=>{
    if(!user){nav('/login?next='+encodeURIComponent('/order/'+planId),{replace:true});return}
    if(done.current)return;done.current=true;
    api('/orders',{method:'POST',body:{plan_id:+planId}}).then(o=>nav('/pay/'+o.id,{replace:true})).catch(e=>setErr(e.message));
  },[]);
  return <p className="text-center mt-20">{err||'Creating your order…'}</p>;
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
  const act=async(o,a)=>{
    if(a==='approve'&&!confirm(`Approve ${o.ref} and create server?`))return;
    setBusy(o.id);
    try{await api(`/admin/orders/${o.id}/${a}`,{method:'POST'})}catch(e){alert(e.message)}
    setBusy(0);reload();
  };
  return <div className="space-y-3">
    {orders.map(o=><div key={o.id} className={G+' p-4 flex flex-wrap gap-3 items-center justify-between'}>
      <div className="text-sm"><b className="text-white">{o.plan_name} · ₹{o.amount}</b> <span className="text-slate-400">({o.location_name})</span><br/>
        {o.email} · {o.ref}{o.utr&&` · UTR ${o.utr}`}<br/><span className="text-[#00A3FF]">{o.status.replace('_',' ')}</span></div>
      <div className="flex gap-2">
        {o.has_proof&&<button onClick={()=>view(o)} className="px-3 py-1.5 rounded-lg border border-white/20 text-sm">Proof</button>}
        {o.status==='pending_review'&&<>
          <button disabled={busy===o.id} onClick={()=>act(o,'approve')} className={Btn+' !py-1.5 !bg-green-500'}>{busy===o.id?'Creating…':'Approve'}</button>
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
  useEffect(()=>{api('/settings').then(setS)},[]);
  const img=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>setS(x=>({...x,fallback_qr:r.result}));r.readAsDataURL(f)};
  const save=async()=>{try{await api('/admin/settings',{method:'PUT',body:s});setOk('Saved ✓')}catch(e){setOk(e.message)}};
  return <div className={G+' p-5 space-y-4 max-w-lg'}>
    {[['upi_id','Master UPI ID (e.g. name@okaxis)'],['upi_name','Payee name'],['support_url','Support link (Discord/WhatsApp URL)']].map(([k,l])=>
      <label key={k} className="block text-sm">{l}<input className={In+' mt-1'} value={s[k]||''} onChange={e=>setS({...s,[k]:e.target.value})}/></label>)}
    <label className="block text-sm">Static fallback QR image<input type="file" accept="image/*" className={In+' mt-1'} onChange={img}/></label>
    {s.fallback_qr&&<img src={s.fallback_qr} className="w-32 bg-white p-1 rounded"/>}
    <button onClick={save} className={Btn}>Save settings</button> <span className="text-sm">{ok}</span>
  </div>;
}
