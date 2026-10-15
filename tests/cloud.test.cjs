const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(handler,hash=''){
  const saved=new Map(),requests=[],location={origin:'https://example.test',pathname:'/LifeMate/',hash,search:''};
  const context={window:{},URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,Error,TypeError,Number,atob,location,history:{replaceState(){location.hash=''}},sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},fetch:async(url,options)=>{requests.push({url,options});const [status,body]=await handler(url,options);return {ok:status<400,status,text:async()=>JSON.stringify(body)}}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../cloud.js'),'utf8'),context);
  const cloud=new context.window.LifeMateCloud({supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'sb_publishable_test'});
  return {cloud,saved,requests,location};
}
test('password login and account data are authenticated; payload is not cached',async()=>{
  const {cloud,saved,requests}=setup(async(url)=>url.includes('/token?')?[200,{access_token:'token-a',refresh_token:'refresh-a',expires_in:3600,user:{id:'a'}}]:url.includes('/rpc/')?[200,1]:[200,[]]);
  await cloud.signIn('a@example.test','password');assert.equal(cloud.session.user.id,'a');assert.equal(await cloud.load(),null);await cloud.save({version:1,records:{},habits:[]});assert.equal(cloud.revision,1);assert.equal(requests.at(-1).options.headers.Authorization,'Bearer token-a');assert.equal(saved.size,1);assert.ok(![...saved.values()][0].includes('records'));
});
test('signup awaiting confirmation does not create a session',async()=>{
  const {cloud}=setup(async()=>[200,{user:{id:'pending'}}]);await cloud.signUp('a@example.test','password');assert.equal(cloud.session,null);
});
test('expired session refreshes before authenticated request',async()=>{
  const {cloud,requests}=setup(async(url)=>url.includes('refresh_token')?[200,{access_token:'new',refresh_token:'new-refresh',expires_in:3600}]:[200,[]]);cloud.remember({access_token:'old',refresh_token:'refresh',expires_at:1});await cloud.load();assert.equal(requests.length,2);assert.equal(requests[1].options.headers.Authorization,'Bearer new');
});
test('conflict preserves previous revision and reports recovery action',async()=>{
  const {cloud}=setup(async()=>[409,{code:'40001'}]);cloud.remember({access_token:'a',expires_in:3600});cloud.revision=3;await assert.rejects(()=>cloud.save({}),/thiết bị khác/);assert.equal(cloud.revision,3);
});
test('email recovery callback removes token hash and verifies user',async()=>{
  const {cloud,location,requests}=setup(async()=>[200,{id:'a',email:'a@example.test'}],'#access_token=token&refresh_token=refresh&type=recovery&expires_in=3600');const result=await cloud.restoreSession();assert.equal(location.hash,'');assert.equal(result.recovery,true);assert.equal(result.user.id,'a');assert.equal(requests[0].options.headers.Authorization,'Bearer token');
});
test('signout clears session even when server is unreachable',async()=>{
  const {cloud,saved}=setup(async()=>{throw new TypeError('network')});cloud.remember({access_token:'a',expires_in:3600});await assert.rejects(()=>cloud.signOut(),/Internet/);assert.equal(cloud.session,null);assert.equal(saved.size,0);
});
test('frontend rejects secret and service_role keys',()=>{
  const {cloud}=setup(async()=>[200,{}]);cloud.key='sb_secret_bad';assert.equal(cloud.configured,false);cloud.key='header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';assert.equal(cloud.configured,false);cloud.key='header.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.signature';assert.equal(cloud.configured,true);
});
