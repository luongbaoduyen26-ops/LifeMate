'use strict';
const {randomBytes,scrypt:callbackScrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(callbackScrypt);
const sha=value=>createHash('sha256').update(value).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return 'scrypt$'+salt+'$'+key.toString('hex')}
async function verifyPassword(password,stored){
  const [algorithm,salt,hex]=String(stored).split('$');
  if(algorithm!=='scrypt'||!salt||!hex)return false;
  const expected=Buffer.from(hex,'hex');
  const actual=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
module.exports={sha,secret,hashPassword,verifyPassword};
