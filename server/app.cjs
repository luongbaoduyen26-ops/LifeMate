'use strict';
const express=require('express');
const helmet=require('helmet');
const {randomUUID,timingSafeEqual}=require('node:crypto');
const path=require('node:path');
const {sha,secret,hashPassword,verifyPassword}=require('./auth.cjs');
const {validPayload}=require('./validation.cjs');
const SESSION_MS=7*24*60*60*1000;
const fail=(status,message)=>Object.assign(new Error(message),{status});
function createApp(db,{origin,production=true}={}){
  if(!origin || new URL(origin).origin!==origin || (production&&!origin.startsWith('https://')))throw Error('APP_ORIGIN must be an origin without a trailing slash; HTTPS is required in production.');
  const app=express(),cookieName=production?'__Host-lifemate_session':'lifemate_session';
  app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],connectSrc:["'self'",'https://generativelanguage.googleapis.com'],imgSrc:["'self'",'data:'],formAction:["'self'"],upgradeInsecureRequests:production?[]:null}},strictTransportSecurity:production?undefined:false,referrerPolicy:{policy:'no-referrer'}}));
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method) && (req.get('origin')!==origin || req.get('x-lifemate-request')!=='1' || !req.is('application/json')))return next(fail(403,'Yêu cầu không hợp lệ. Hãy mở lại website đúng địa chỉ.'));
    next();
  });
  app.use('/api',express.json({limit:'5mb',strict:true}));
  function cookie(res,value,maxAge=SESSION_MS){res.cookie(cookieName,value,{httpOnly:true,secure:production,sameSite:'lax',path:'/',maxAge})}
  function token(req){const item=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));return item?.slice(cookieName.length+1)||''}
  async function authenticate(req,res,next){try{const t=token(req);if(!/^[A-Za-z0-9_-]{43}$/.test(t))throw fail(401,'Vui lòng đăng nhập lại.');const result=await db.query('select u.id,u.email from lm_sessions s join lm_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()',[sha(t)]);if(!result.rows[0])throw fail(401,'Phiên đăng nhập đã hết hạn.');req.user=result.rows[0];next()}catch(e){next(e)}}
  async function limit(req,scope,max){
    // Do not trust client-controlled X-Forwarded-For. The DB email bucket is shared across replicas.
    const ip=req.socket.remoteAddress||'unknown';
    const buckets=[sha(scope+':ip:'+ip),sha(scope+':email:'+String(req.body?.email||'').trim().toLowerCase())];
    for(const bucket of buckets){const result=await db.query(`insert into lm_auth_limits(bucket,attempts,expires_at) values($1,1,now()+interval '15 minutes') on conflict(bucket) do update set attempts=case when lm_auth_limits.expires_at<now() then 1 else lm_auth_limits.attempts+1 end, expires_at=case when lm_auth_limits.expires_at<now() then now()+interval '15 minutes' else lm_auth_limits.expires_at end returning attempts`,[bucket]);if(result.rows[0].attempts>max)throw fail(429,'Thử quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.')}
  }
  function credentials(body){const email=String(body?.email||'').trim().toLowerCase(),password=body?.password;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<8||Buffer.byteLength(password)>256)throw fail(400,'Email không hợp lệ hoặc mật khẩu chưa đủ 8 ký tự (tối đa 256 byte).');return {email,password}}
  async function session(userId,res,expectedHash=null){const raw=secret();const result=await db.query('insert into lm_sessions(token_hash,user_id,expires_at) select $1,id,$3 from lm_users where id=$2 and ($4::text is null or password_hash=$4) returning user_id',[sha(raw),userId,new Date(Date.now()+SESSION_MS),expectedHash]);if(!result.rows.length)throw fail(400,'Thông tin đăng nhập đã thay đổi. Vui lòng thử lại.');cookie(res,raw)}
  app.get('/api/health',async(req,res,next)=>{try{await db.query('select 1');res.json({ok:true,storage:'postgresql'})}catch(e){next(e)}});
  app.post('/api/auth/signup',async(req,res,next)=>{try{await limit(req,'signup',10);const {email,password}=credentials(req.body),id=randomUUID(),recoveryCode=secret();const hash=await hashPassword(password),raw=secret();try{await db.query('with created as (insert into lm_users(id,email,password_hash,recovery_hash) values($1,$2,$3,$4) returning id) insert into lm_sessions(token_hash,user_id,expires_at) select $5,id,$6 from created',[id,email,hash,sha(recoveryCode),sha(raw),new Date(Date.now()+SESSION_MS)])}catch(e){if(e.code==='23505')throw fail(409,'Không thể tạo tài khoản với email này. Hãy đăng nhập hoặc dùng mã khôi phục.');throw e}cookie(res,raw);res.status(201).json({user:{id,email},recovery_code:recoveryCode})}catch(e){next(e)}});
  app.post('/api/auth/login',async(req,res,next)=>{try{await limit(req,'login',30);const {email,password}=credentials(req.body);const row=(await db.query('select * from lm_users where email=$1',[email])).rows[0];if(!row){await hashPassword(password);throw fail(400,'Email hoặc mật khẩu chưa đúng.')}if(!await verifyPassword(password,row.password_hash))throw fail(400,'Email hoặc mật khẩu chưa đúng.');await session(row.id,res,row.password_hash);res.json({user:{id:row.id,email:row.email}})}catch(e){next(e)}});
  app.get('/api/auth/me',authenticate,(req,res)=>res.json({user:req.user}));
  app.post('/api/auth/logout',async(req,res,next)=>{try{await db.query('delete from lm_sessions where token_hash=$1',[sha(token(req))]);cookie(res,'',0);res.json({ok:true})}catch(e){next(e)}});
  app.post('/api/auth/recover',async(req,res,next)=>{try{
    await limit(req,'recover',10);const {email,password}=credentials(req.body),code=String(req.body.recoveryCode||'');if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw fail(400,'Email hoặc mã khôi phục không đúng.');
    const user=(await db.query('select id,recovery_hash from lm_users where email=$1',[email])).rows[0];const actual=Buffer.from(sha(code),'hex'),expected=Buffer.from(user?.recovery_hash||'0'.repeat(64),'hex');if(!user||!timingSafeEqual(actual,expected))throw fail(400,'Email hoặc mã khôi phục không đúng.');
    const nextCode=secret(),raw=secret(),hash=await hashPassword(password);
    // Atomic rotation makes old recovery codes unusable and revokes all prior sessions.
    const result=await db.query(`with changed as (update lm_users set password_hash=$1,recovery_hash=$2 where id=$3 and recovery_hash=$4 returning id), revoked as (delete from lm_sessions where user_id in (select id from changed)), issued as (insert into lm_sessions(token_hash,user_id,expires_at) select $5,id,$6 from changed returning user_id) select user_id as id from issued`,[hash,sha(nextCode),user.id,sha(code),sha(raw),new Date(Date.now()+SESSION_MS)]);
    if(!result.rows.length)throw fail(400,'Mã đã được dùng. Hãy dùng mã khôi phục mới nhất.');cookie(res,raw);res.json({user:{id:user.id,email},recovery_code:nextCode});
  }catch(e){next(e)}});
  app.post('/api/auth/recovery-code',authenticate,async(req,res,next)=>{try{
    await limit(req,'rotate-code',10);const password=req.body?.password;if(typeof password!=='string'||Buffer.byteLength(password)>256)throw fail(400,'Vui lòng nhập mật khẩu hiện tại.');
    const row=(await db.query('select password_hash from lm_users where id=$1',[req.user.id])).rows[0];if(!await verifyPassword(password,row.password_hash))throw fail(400,'Mật khẩu chưa đúng.');const code=secret();
    const result=await db.query('update lm_users set recovery_hash=$1 where id=$2 and password_hash=$3 returning id',[sha(code),req.user.id,row.password_hash]);if(!result.rows.length)throw fail(409,'Tài khoản đã thay đổi. Hãy thử lại.');res.json({recovery_code:code});
  }catch(e){next(e)}});
  app.get('/api/data',authenticate,async(req,res,next)=>{try{const result=await db.query('select payload,revision from lm_data where user_id=$1',[req.user.id]);res.json(result.rows[0]||{payload:null,revision:0})}catch(e){next(e)}});
  app.put('/api/data',authenticate,async(req,res,next)=>{try{
    const {payload,expectedRevision}=req.body||{};if(!Number.isInteger(expectedRevision)||expectedRevision<0||!validPayload(payload))throw fail(400,'Dữ liệu ghi nhận hoặc bản sao lưu không hợp lệ.');
    const result=expectedRevision===0?await db.query('insert into lm_data(user_id,payload,revision) values($1,$2,1) on conflict(user_id) do nothing returning revision',[req.user.id,payload]):await db.query('update lm_data set payload=$1,revision=revision+1,updated_at=now() where user_id=$2 and revision=$3 returning revision',[payload,req.user.id,expectedRevision]);
    if(!result.rows[0])throw fail(409,'Dữ liệu đã thay đổi trên thiết bị khác. Xuất JSON bản nháp rồi tải lại từ đám mây trước khi sửa tiếp.');res.json(result.rows[0]);
  }catch(e){next(e)}});
  app.use('/api',(req,res)=>res.status(404).json({error:'Không có chức năng này.'}));
  // Explicit allowlist: never expose source, .env, SQL, tests, or dependency files.
  const root=path.resolve(__dirname,'..');
  for(const name of ['index.html','app.js','account.js','cloud.js','config.js','style.css'])app.get(name==='index.html'?['/','/index.html']:'/'+name,(req,res)=>{res.set('Cache-Control','no-store');res.sendFile(path.join(root,name))});
  app.use((req,res)=>res.status(404).type('text').send('Not found'));
  app.use((error,req,res,next)=>{const status=error.status||500;if(status>=500)console.error('Request failed:',error.code||error.name);res.status(status).json({error:status>=500?'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.':status===413?'Tệp quá lớn (tối đa 5 MB).':error.type==='entity.parse.failed'?'Nội dung JSON không hợp lệ.':error.message})});
  return app;
}
module.exports={createApp};
