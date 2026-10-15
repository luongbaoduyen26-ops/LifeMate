'use strict';
// Same-origin backend only. PostgreSQL credentials and sessions never enter browser JS.
class LifeMateCloud {
  constructor(){this.revision=0;this.recoveryCode=null;this.label='PostgreSQL trên Vibe Host'}
  get configured(){return true}
  remember(){} // No bearer tokens or health records persisted in browser storage.
  async request(path,{method='GET',body}={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-LifeMate-Request':'1'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
      const text=await response.text();let result;try{result=JSON.parse(text)}catch{throw Error('Website chưa chạy backend Node.js. Kiểm tra nhật ký triển khai trên host.')}
      if(!response.ok){const error=Error(result.error||'Không xử lý được yêu cầu.');error.status=response.status;throw error}
      return result;
    }catch(error){if(error.name==='AbortError')throw Error('Kết nối quá lâu. Nếu đang lưu, hãy giữ bản nháp và thử lại.');if(error instanceof TypeError)throw Error('Không kết nối được máy chủ. Kiểm tra Internet rồi thử lại.');throw error}
    finally{clearTimeout(timer)}
  }
  async restoreSession(){try{const result=await this.request('/auth/me');return {user:result.user,recovery:false}}catch(e){if(e.status===401)return null;throw e}}
  async signIn(email,password){return (await this.request('/auth/login',{method:'POST',body:{email,password}})).user}
  async signUp(email,password){const result=await this.request('/auth/signup',{method:'POST',body:{email,password}});this.recoveryCode=result.recovery_code;return result}
  async recover(email,recoveryCode,password){const result=await this.request('/auth/recover',{method:'POST',body:{email,recoveryCode,password}});this.recoveryCode=result.recovery_code;return result}
  async rotateRecovery(password){const result=await this.request('/auth/recovery-code',{method:'POST',body:{password}});this.recoveryCode=result.recovery_code}
  async signOut(){await this.request('/auth/logout',{method:'POST',body:{}});this.revision=0;this.recoveryCode=null}
  async load(){const result=await this.request('/data');this.revision=result.revision;return result.payload}
  async save(payload){const result=await this.request('/data',{method:'PUT',body:{payload,expectedRevision:this.revision}});if(!Number.isInteger(result.revision)||result.revision<=this.revision)throw Error('Chưa xác nhận được lần lưu. Hãy xuất bản nháp trước khi tải lại.');this.revision=result.revision}
}
window.LifeMateCloud=LifeMateCloud;
