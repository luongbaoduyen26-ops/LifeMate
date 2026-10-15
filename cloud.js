'use strict';
// Supabase Auth + PostgREST over HTTPS; no health data is cached on disk.
class LifeMateCloud {
  constructor(config) {
    this.url = String(config?.supabaseUrl || '').replace(/\/$/, '');
    this.key = String(config?.supabasePublishableKey || '');
    this.sessionKey = 'lifemate.auth.' + this.url;
    this.session = null;
    this.refreshing = null;
    this.revision = 0;
    try { this.session = JSON.parse(sessionStorage.getItem(this.sessionKey)); } catch {}
  }
  get configured() {
    try { if(this.key.includes('.')){const claims=JSON.parse(atob(this.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.role!=='anon')return false;} const u = new URL(this.url); return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co') && !!this.key && !this.key.startsWith('sb_secret_'); } catch { return false; }
  }
  remember(session) {
    this.session = session?.access_token ? {...session, expires_at: session.expires_at || Math.floor(Date.now()/1000)+(session.expires_in || 3600)} : null;
    // Session persistence is optional; browsers blocking storage can still use the current page.
    try { if (this.session) sessionStorage.setItem(this.sessionKey, JSON.stringify(this.session)); else sessionStorage.removeItem(this.sessionKey); } catch {}
  }
  async request(path, {method='GET', body, authenticated=false, retry=true}={}) {
    if (!this.configured) throw Error('Chưa kết nối Supabase.');
    if (authenticated) await this.ensureSession();
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 20000);
    try {
      const headers = {apikey:this.key, 'Content-Type':'application/json'};
      if (authenticated) headers.Authorization = 'Bearer '+this.session.access_token;
      const response = await fetch(this.url+path, {method, headers, body:body===undefined?undefined:JSON.stringify(body), signal:controller.signal, cache:'no-store', referrerPolicy:'no-referrer'});
      const raw = await response.text(); let result;
      try { result = raw ? JSON.parse(raw) : null; } catch { throw Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
      if (!response.ok) {
        if (authenticated && response.status===401 && retry && this.session?.refresh_token) {
          await this.refresh(); return this.request(path,{method,body,authenticated,retry:false});
        }
        const code=result?.code || result?.error_code;
        if (code==='40001') throw Error('Dữ liệu đã thay đổi trên thiết bị khác. Xuất JSON để giữ thay đổi của bạn, rồi bấm Tải lại từ đám mây trước khi sửa tiếp.');
        if (code==='invalid_credentials') throw Error('Email hoặc mật khẩu chưa đúng.');
        if (code==='email_not_confirmed') throw Error('Hãy mở email xác nhận tài khoản trước khi đăng nhập.');
        if (response.status===429) throw Error('Có quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.');
        if (code==='PGRST202' || code==='42P01') throw Error('Chưa tạo cơ sở dữ liệu LifeMate. Hãy chạy tệp supabase/schema.sql trong SQL Editor.');
        if (response.status===401 || response.status===403) throw Error('Không có quyền truy cập. Kiểm tra cấu hình hoặc đăng nhập lại.');
        if (result?.msg==='Password should be at least 6 characters.' || code==='weak_password') throw Error('Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.');
        throw Error('Không thực hiện được yêu cầu (HTTP '+response.status+'). Hãy thử lại hoặc kiểm tra cài đặt Supabase.');
      }
      return result;
    } catch(error) {
      if (error.name==='AbortError') throw Error('Kết nối quá lâu. Dữ liệu chưa được xác nhận lưu; hãy thử lại.');
      if (error instanceof TypeError) throw Error('Không kết nối được Supabase. Kiểm tra Internet rồi thử lại.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async ensureSession() {
    if (!this.session?.access_token) throw Error('Vui lòng đăng nhập.');
    if (this.session.expires_at < Date.now()/1000+60) await this.refresh();
  }
  async refresh() {
    if (!this.refreshing) this.refreshing=(async()=>{
      if (!this.session?.refresh_token) throw Error('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
      const session=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token}});
      this.remember(session);
    })().finally(()=>{this.refreshing=null;});
    return this.refreshing;
  }
  redirectUrl() { return location.origin+location.pathname; }
  async signIn(email,password) {
    const session=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    this.remember(session); return session.user;
  }
  async signUp(email,password) {
    const result=await this.request('/auth/v1/signup?redirect_to='+encodeURIComponent(this.redirectUrl()),{method:'POST',body:{email,password}});
    if(result.access_token)this.remember(result);
    return result;
  }
  async recover(email) {
    return this.request('/auth/v1/recover?redirect_to='+encodeURIComponent(this.redirectUrl()),{method:'POST',body:{email}});
  }
  async changePassword(password) {
    return this.request('/auth/v1/user',{method:'PUT',authenticated:true,body:{password}});
  }
  async restoreSession() {
    const params=new URLSearchParams(location.hash.slice(1));
    const callback=params.has('access_token') || params.has('error');
    let recovery=false;
    if(callback) {
      // Remove bearer tokens from the address bar before rendering any application page.
      history.replaceState(null,'',location.pathname+location.search);
      if(params.has('error'))throw Error('Liên kết xác nhận đã hết hạn hoặc không hợp lệ. Hãy yêu cầu lại email.');
      this.remember({access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in'))||3600});
      recovery=params.get('type')==='recovery';
    }
    if(!this.session)return null;
    const user=await this.request('/auth/v1/user',{authenticated:true});
    this.remember({...this.session,user});
    return {user,recovery};
  }
  async signOut() {
    try { if(this.session)await this.request('/auth/v1/logout?scope=local',{method:'POST',authenticated:true}); }
    finally { this.remember(null); this.revision=0; }
  }
  async load() {
    const rows=await this.request('/rest/v1/lifemate_data?select=payload,revision',{authenticated:true});
    if(!Array.isArray(rows)||rows.length>1)throw Error('Phản hồi dữ liệu không hợp lệ.');
    this.revision=rows[0]?.revision || 0;
    return rows[0]?.payload || null;
  }
  async save(payload) {
    const result=await this.request('/rest/v1/rpc/save_lifemate_data',{method:'POST',authenticated:true,body:{new_payload:payload,expected_revision:this.revision}});
    if(!Number.isInteger(result)||result<=this.revision)throw Error('Chưa xác nhận được lần lưu này. Hãy tải lại dữ liệu trước khi tiếp tục.');
    this.revision=result;
  }
}
window.LifeMateCloud=LifeMateCloud;
