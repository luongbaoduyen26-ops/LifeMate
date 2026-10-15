'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const {createApp}=require('./app.cjs');
async function main(){
  const connectionString=process.env.DATABASE_URL||process.env.POSTGRES_URL;
  if(!connectionString)throw Error('Set DATABASE_URL or POSTGRES_URL in environment settings.');
  const parsed=new URL(connectionString);
  if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.hostname||parsed.port==='0')throw Error('DATABASE_URL must use the private PostgreSQL hostname and its valid port (usually 5432), not an empty external host or port 0.');
  // Prevent connection string options from silently disabling TLS verification.
  for(const option of ['sslmode','sslcert','sslkey','sslrootcert'])if(parsed.searchParams.has(option))throw Error('Remove SSL query options from DATABASE_URL; use DATABASE_SSL and DATABASE_CA_FILE.');
  const production=process.env.NODE_ENV!=='development';
  const ssl=process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true,...(process.env.DATABASE_CA_FILE?{ca:fs.readFileSync(process.env.DATABASE_CA_FILE,'utf8')}: {})}:false;
  const pool=new Pool({connectionString,ssl,max:5,connectionTimeoutMillis:10000,statement_timeout:15000});
  pool.on('error',error=>console.error('Database connection error:',error.code||error.name));
  await pool.query(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
  const app=createApp(pool,{origin:process.env.APP_ORIGIN,production});
  const server=app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('LifeMate backend listening; PostgreSQL schema ready.'));
  const cleanup=setInterval(()=>pool.query('delete from lm_sessions where expires_at<now();delete from lm_auth_limits where expires_at<now()').catch(error=>console.error('Cleanup failed:',error.code||error.name)),60*60*1000);cleanup.unref();
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(cleanup);server.close(async()=>{await pool.end();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()});
}
main().catch(error=>{console.error('Startup failed:',error.code||error.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL hidden]'));process.exit(1)});
