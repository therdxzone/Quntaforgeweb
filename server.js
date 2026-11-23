const express=require('express'),{Pool}=require('pg'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),multer=require('multer'),crypto=require('crypto'),path=require('path');
const E=process.env,app=express();
const db=new Pool({connectionString:E.DATABASE_URL,ssl:/localhost|127\.0\.0\.1/.test(E.DATABASE_URL||'')?false:{rejectUnauthorized:false}});
const q=(s,p)=>db.query(s,p).then(r=>r.rows);
const ah=f=>(a,b,c)=>f(a,b,c).catch(e=>{console.error(e);b.status(500).json({error:e.message})});
const BASE=(E.PUBLIC_URL||E.RENDER_EXTERNAL_URL||'http://localhost:3000').replace(/\/$/,'');
const up=multer({storage:multer.memoryStorage(),limits:{fileSize:5e6}});
app.use(express.json({limit:'3mb'}));

// ---------- mail (Resend HTTP API; Render free blocks SMTP) ----------
async function mail(to,subject,html){
  if(!E.RESEND_API_KEY){console.log('[mail skipped]',to,subject,html.replace(/<[^>]+>/g,' '));return false}
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+E.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:E.MAIL_FROM||'QuantaForge <onboarding@resend.dev>',to:[to],subject,html})});
  if(!r.ok)console.error('mail fail',await r.text());
  return r.ok;
}

// ---------- auth ----------
const tok=u=>jwt.sign({id:u.id,admin:u.is_admin},E.JWT_SECRET,{expiresIn:'7d'});
const auth=(req,res,next)=>{try{req.u=jwt.verify((req.headers.authorization||'').slice(7),E.JWT_SECRET);next()}catch{res.status(401).json({error:'Login required'})}};
const admin=(req,res,next)=>auth(req,res,()=>req.u.admin?next():res.status(403).json({error:'Admins only'}));

app.get('/api/health',(_,r)=>r.send('ok'));

app.post('/api/auth/signup',ah(async(req,res)=>{
  const email=(req.body.email||'').trim().toLowerCase(),pw=req.body.password||'';
  if(!/^\S+@\S+\.\S+$/.test(email)||pw.length<6)return res.status(400).json({error:'Valid email and 6+ char password required'});
  const [ex]=await q('SELECT * FROM users WHERE email=$1',[email]);
  if(ex&&ex.verified)return res.status(409).json({error:'Account exists, please login'});
  const vt=crypto.randomBytes(24).toString('hex'),h=await bcrypt.hash(pw,10),auto=!E.RESEND_API_KEY;
  if(ex)await q('UPDATE users SET pass=$2,vtoken=$3 WHERE id=$1',[ex.id,h,vt]);
  else await q('INSERT INTO users(email,pass,vtoken) VALUES($1,$2,$3)',[email,h,vt]);
  if(auto)await q('UPDATE users SET verified=true WHERE email=$1',[email]);
  else await mail(email,'Verify your QuantaForge account',`<p>Click to verify: <a href="${BASE}/api/auth/verify?token=${vt}">Verify email</a></p>`);
  res.json({verified:auto});
}));
app.get('/api/auth/verify',ah(async(req,res)=>{
  await q('UPDATE users SET verified=true,vtoken=NULL WHERE vtoken=$1',[req.query.token||'x']);
  res.redirect('/login?verified=1');
}));
app.post('/api/auth/login',ah(async(req,res)=>{
  const [u]=await q('SELECT * FROM users WHERE email=$1',[(req.body.email||'').trim().toLowerCase()]);
  if(!u||!(await bcrypt.compare(req.body.password||'',u.pass)))return res.status(401).json({error:'Wrong email or password'});
  if(!u.verified)return res.status(403).json({error:'Please verify your email first'});
  res.json({token:tok(u),user:{id:u.id,email:u.email,is_admin:u.is_admin}});
}));
app.get('/api/me',auth,ah(async(req,res)=>res.json((await q('SELECT id,email,is_admin FROM users WHERE id=$1',[req.u.id]))[0])));

// ---------- public ----------
app.get('/api/catalog',ah(async(_,res)=>res.json({
  categories:await q('SELECT * FROM categories ORDER BY id'),
  locations:await q('SELECT * FROM locations ORDER BY id'),
  plans:await q('SELECT * FROM plans WHERE active ORDER BY price')})));
app.get('/api/settings',ah(async(_,res)=>{
  const o={};(await q('SELECT * FROM settings')).forEach(r=>o[r.key]=r.value);res.json(o)}));

// ---------- user orders ----------
app.post('/api/orders',auth,ah(async(req,res)=>{
  const [p]=await q('SELECT p.*,l.name lname,l.ptero_location_id FROM plans p JOIN locations l ON l.id=p.location_id WHERE p.id=$1 AND p.active',[req.body.plan_id]);
  if(!p)return res.status(404).json({error:'Plan not found'});
  const ref='QF'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const [o]=await q(`INSERT INTO orders(ref,user_id,plan_id,plan_name,amount,ram_mb,cpu_pct,disk_mb,location_name,ptero_location_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[ref,req.u.id,p.id,p.name,p.price,p.ram_mb,p.cpu_pct,p.disk_mb,p.lname,p.ptero_location_id]);
  res.json(o);
}));
const OCOLS='id,ref,plan_name,amount,status,utr,server_info,location_name,created_at';
app.get('/api/orders/mine',auth,ah(async(req,res)=>res.json(await q(`SELECT ${OCOLS} FROM orders WHERE user_id=$1 ORDER BY id DESC`,[req.u.id]))));
app.get('/api/orders/:id',auth,ah(async(req,res)=>{
  const [o]=await q(`SELECT ${OCOLS} FROM orders WHERE id=$1 AND user_id=$2`,[req.params.id,req.u.id]);
  o?res.json(o):res.status(404).json({error:'Not found'})}));
app.post('/api/orders/:id/proof',auth,up.single('proof'),ah(async(req,res)=>{
  if(!req.file||!/^image\//.test(req.file.mimetype))return res.status(400).json({error:'Upload a screenshot image'});
  const r=await q(`UPDATE orders SET proof=$2,proof_type=$3,utr=$4,status='pending_review' WHERE id=$1 AND user_id=$5 AND status IN ('awaiting_payment','rejected') RETURNING id`,
    [req.params.id,req.file.buffer,req.file.mimetype,(req.body.utr||'').slice(0,40),req.u.id]);
  r.length?res.json({ok:true}):res.status(409).json({error:'Order not awaiting payment'});
}));

// ---------- pterodactyl ----------
async function P(method,p,body){
  const r=await fetch(E.PTERO_URL.replace(/\/$/,'')+'/api/application'+p,{method,headers:{Authorization:'Bearer '+E.PTERO_API_KEY,'Content-Type':'application/json',Accept:'application/json'},body:body?JSON.stringify(body):undefined});
  const t=await r.text();let j={};try{j=JSON.parse(t)}catch{}
  if(!r.ok)throw new Error(j.errors?.[0]?.detail||r.status+' '+t.slice(0,200));
  return j;
}
async function provision(o){
  if(!E.PTERO_URL||!E.PTERO_API_KEY||!E.PTERO_NEST_ID||!E.PTERO_EGG_ID)throw new Error('PTERO_* env vars not set');
  if(!o.ptero_location_id)throw new Error('Set Pterodactyl Location ID for this location in Admin > Plans');
  const [u]=await q('SELECT email FROM users WHERE id=$1',[o.user_id]);
  let password=null,found=(await P('GET','/users?filter[email]='+encodeURIComponent(u.email))).data[0];
  if(!found){
    password=crypto.randomBytes(6).toString('base64url');
    const uname=u.email.split('@')[0].replace(/[^a-z0-9]/gi,'').slice(0,12).toLowerCase()+crypto.randomInt(100,999);
    found=await P('POST','/users',{email:u.email,username:uname,first_name:'QF',last_name:'User',password});
  }
  const uid=found.attributes.id;
  const egg=(await P('GET',`/nests/${E.PTERO_NEST_ID}/eggs/${E.PTERO_EGG_ID}?include=variables`)).attributes;
  const env={};(egg.relationships?.variables?.data||[]).forEach(v=>env[v.attributes.env_variable]=v.attributes.default_value);
  Object.assign(env,JSON.parse(E.PTERO_EGG_ENV||'{}'));
  const s=await P('POST','/servers',{name:`${o.plan_name}-${o.ref}`,user:uid,egg:+E.PTERO_EGG_ID,docker_image:egg.docker_image,startup:egg.startup,environment:env,
    limits:{memory:o.ram_mb,swap:0,disk:o.disk_mb,io:500,cpu:o.cpu_pct},feature_limits:{databases:1,backups:2,allocations:1},
    deploy:{locations:[o.ptero_location_id],dedicated_ip:false,port_range:[]},start_on_completion:true});
  const info={server_id:s.attributes.identifier,panel_url:E.PTERO_URL,email:u.email,password};
  mail(u.email,'Your QuantaForge server is ready!',`<h3>Your ${o.plan_name} server is live</h3><p>Panel: <a href="${E.PTERO_URL}">${E.PTERO_URL}</a><br>Email: ${u.email}<br>Password: ${password||'(your existing panel password)'}<br>Server ID: ${info.server_id}<br>Location: ${o.location_name}</p>`).catch(()=>{});
  return info;
}

// ---------- admin ----------
app.get('/api/admin/stats',admin,ah(async(_,res)=>res.json((await q(`SELECT COALESCE(SUM(amount) FILTER (WHERE status='active'),0)::int sales,COUNT(*) FILTER (WHERE status='active')::int active,COUNT(*) FILTER (WHERE status='pending_review')::int pending FROM orders`))[0])));
app.get('/api/admin/orders',admin,ah(async(_,res)=>res.json(await q(`SELECT o.id,o.ref,o.plan_name,o.location_name,o.amount,o.status,o.utr,o.created_at,(o.proof IS NOT NULL) has_proof,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY (o.status='pending_review') DESC,o.id DESC LIMIT 200`))));
app.get('/api/admin/orders/:id/proof',admin,ah(async(req,res)=>{
  const [o]=await q('SELECT proof,proof_type FROM orders WHERE id=$1',[req.params.id]);
  if(!o||!o.proof)return res.sendStatus(404);res.type(o.proof_type).send(o.proof)}));
app.post('/api/admin/orders/:id/approve',admin,ah(async(req,res)=>{
  const [o]=await q(`UPDATE orders SET status='provisioning' WHERE id=$1 AND status='pending_review' RETURNING *`,[req.params.id]); // idempotent lock
  if(!o)return res.status(409).json({error:'Order is not pending review'});
  try{
    const info=await provision(o);
    await q(`UPDATE orders SET status='active',server_info=$2 WHERE id=$1`,[o.id,info]);
    res.json({ok:true});
  }catch(e){
    await q(`UPDATE orders SET status='pending_review' WHERE id=$1`,[o.id]);
    res.status(502).json({error:'Provisioning failed: '+e.message});
  }
}));
app.post('/api/admin/orders/:id/reject',admin,ah(async(req,res)=>{
  const r=await q(`UPDATE orders SET status='rejected' WHERE id=$1 AND status='pending_review' RETURNING user_id,ref`,[req.params.id]);
  if(!r.length)return res.status(409).json({error:'Order is not pending review'});
  const [u]=await q('SELECT email FROM users WHERE id=$1',[r[0].user_id]);
  mail(u.email,'Payment rejected',`<p>Your payment for order ${r[0].ref} could not be verified. Please re-upload a clear screenshot from your Orders page.</p>`).catch(()=>{});
  res.json({ok:true});
}));
app.get('/api/admin/plans',admin,ah(async(_,res)=>res.json(await q('SELECT * FROM plans ORDER BY id'))));

const T={categories:['name'],locations:['name','hardware','ptero_location_id'],plans:['category_id','location_id','name','ram_mb','cpu_pct','disk_mb','ddos','price','active']};
for(const [t,c] of Object.entries(T)){
  app.post(`/api/admin/${t}`,admin,ah(async(req,res)=>res.json((await q(`INSERT INTO ${t}(${c}) VALUES(${c.map((_,i)=>'$'+(i+1))}) RETURNING *`,c.map(k=>req.body[k])))[0])));
  app.put(`/api/admin/${t}/:id`,admin,ah(async(req,res)=>res.json((await q(`UPDATE ${t} SET ${c.map((k,i)=>k+'=$'+(i+2))} WHERE id=$1 RETURNING *`,[req.params.id,...c.map(k=>req.body[k])]))[0])));
  app.delete(`/api/admin/${t}/:id`,admin,ah(async(req,res)=>{await q(`DELETE FROM ${t} WHERE id=$1`,[req.params.id]);res.json({ok:true})}));
}
app.put('/api/admin/settings',admin,ah(async(req,res)=>{
  for(const k of ['upi_id','upi_name','support_url','fallback_qr'])
    if(k in req.body)await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',[k,String(req.body[k]||'')]);
  res.json({ok:true})}));

// ---------- frontend ----------
const dist=path.join(__dirname,'dist');
app.use(express.static(dist));
app.get('*',(_,res)=>res.sendFile(path.join(dist,'index.html')));

// ---------- boot ----------
(async()=>{
  await q(`
  CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,pass TEXT NOT NULL,verified BOOLEAN DEFAULT false,vtoken TEXT,is_admin BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS locations(id SERIAL PRIMARY KEY,name TEXT NOT NULL,hardware TEXT,ptero_location_id INT);
  CREATE TABLE IF NOT EXISTS plans(id SERIAL PRIMARY KEY,category_id INT REFERENCES categories ON DELETE CASCADE,location_id INT REFERENCES locations ON DELETE CASCADE,name TEXT NOT NULL,ram_mb INT,cpu_pct INT,disk_mb INT,ddos BOOLEAN DEFAULT true,price INT NOT NULL,active BOOLEAN DEFAULT true);
  CREATE TABLE IF NOT EXISTS orders(id SERIAL PRIMARY KEY,ref TEXT UNIQUE,user_id INT REFERENCES users,plan_id INT REFERENCES plans ON DELETE SET NULL,plan_name TEXT,amount INT,ram_mb INT,cpu_pct INT,disk_mb INT,location_name TEXT,ptero_location_id INT,status TEXT DEFAULT 'awaiting_payment',utr TEXT,proof BYTEA,proof_type TEXT,server_info JSONB,created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
  INSERT INTO settings VALUES('upi_id',''),('upi_name','QuantaForge'),('support_url','') ON CONFLICT DO NOTHING;`);
  if(E.ADMIN_EMAIL&&E.ADMIN_PASSWORD)
    await q(`INSERT INTO users(email,pass,verified,is_admin) VALUES($1,$2,true,true) ON CONFLICT(email) DO UPDATE SET is_admin=true,verified=true,pass=$2`,[E.ADMIN_EMAIL.toLowerCase(),await bcrypt.hash(E.ADMIN_PASSWORD,10)]);
  if(!(await q('SELECT 1 FROM categories LIMIT 1')).length){
    const cats=[];for(const n of['Budget','Standard','Premium'])cats.push((await q('INSERT INTO categories(name) VALUES($1) RETURNING id',[n]))[0].id);
    for(const [n,h,pl] of [['India','AMD EPYC',1],['Singapore','AMD EPYC',2],['Dubai','AMD Ryzen',3]]){
      const lid=(await q('INSERT INTO locations(name,hardware,ptero_location_id) VALUES($1,$2,$3) RETURNING id',[n,h,pl]))[0].id;
      for(const [ci,name,ram,cpu,disk,price] of [[0,'Dirt',1024,100,5120,20],[0,'Coal',2048,150,10240,40],[1,'Redstone',4096,200,20480,80],[2,'Diamond',8192,300,40960,150]])
        await q('INSERT INTO plans(category_id,location_id,name,ram_mb,cpu_pct,disk_mb,price) VALUES($1,$2,$3,$4,$5,$6,$7)',[cats[ci],lid,name,ram,cpu,disk,price]);
    }
  }
  app.listen(E.PORT||3000,()=>console.log('QuantaForge on',E.PORT||3000));
})().catch(e=>{console.error(e);process.exit(1)});
