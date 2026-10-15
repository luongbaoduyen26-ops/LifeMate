'use strict';
const cloud=new LifeMateCloud(window.LIFEMATE_CONFIG);
const account={user:null,loading:true,authBusy:false,recovery:false,mode:'signin',message:'',loadError:'',saving:false,dirty:false,syncError:'',demo:false};
let legacy=null;
try{const previous=JSON.parse(localStorage.getItem(key));if(previous){validate(previous);legacy=previous}}catch{}
function updateAccountUI(){
  const status=$('.status');
  status.textContent=account.loading?'○ Đang kết nối…':account.loadError?'⚠ Chưa tải được dữ liệu':account.saving?'◌ Đang lưu…':account.dirty?'⚠ Chưa lưu':account.user?'● Đã kết nối đám mây':'○ Chưa đăng nhập';
  status.classList.toggle('unsaved',account.dirty);
  $('#account-button').textContent=account.user?'Tài khoản':'Đăng nhập';
  $('.profile strong').textContent=account.user?.email||'Bạn của LifeMate';
  $('.profile small').textContent=account.user?'Supabase Cloud':'Chưa kết nối tài khoản';
}
function renderAccountGate(){
  let html='';
  if(account.loading)html='<h1>Đang mở không gian của bạn…</h1><p class="muted">Kết nối dữ liệu trên đám mây.</p>';
  else if(!cloud.configured&&!account.demo)html=`<span class="coach-label">LIFEMATE CLOUD</span><h1>Dữ liệu của bạn, trên mọi thiết bị.</h1><p>Website đã có chức năng đăng nhập và lưu đám mây. Chủ website cần kết nối project Supabase một lần để bắt đầu.</p><p class="muted">Xem <a href="https://github.com/luongbaoduyen26-ops/LifeMate/blob/main/SUPABASE_SETUP.md">hướng dẫn kết nối Supabase</a>. Chỉ cần Project URL và Publishable key công khai.</p><button id="view-demo" class="primary">Xem thử bằng dữ liệu mẫu</button><p class="notice">Chế độ xem thử không lưu dữ liệu cá nhân. ${legacy?'Dữ liệu cũ trên trình duyệt vẫn được giữ nguyên, chưa gửi lên đám mây.':''}</p>`;
  else if(account.loadError)html=`<h1>Chưa tải được dữ liệu</h1><p role="alert">${esc(account.loadError)}</p><button id="reload-cloud" class="primary">Thử tải lại</button><button id="signout">Đăng xuất</button>`;
  else if(account.recovery)html=`<h1>Đặt mật khẩu mới</h1><form id="password-form"><label>Mật khẩu mới<input type="password" name="password" required minlength="8" maxlength="128" autocomplete="new-password"></label><button class="primary" ${account.authBusy?'disabled':''}>Lưu mật khẩu mới</button></form><p role="status">${esc(account.message)}</p><button id="signout">Hủy và đăng xuất</button>`;
  else if(cloud.configured&&!account.user)html=authScreen();
  if(!html)return false;
  $('#nav').innerHTML='';$('#content').innerHTML=`<section class="card auth-card">${html}</section>`;document.title='Tài khoản · LifeMate';return true;
}
function authScreen(){const signup=account.mode==='signup',recover=account.mode==='recover';return `<span class="coach-label">KHÔNG GIAN RIÊNG CỦA BẠN</span><h1>${recover?'Quên mật khẩu?':signup?'Bắt đầu cùng LifeMate':'Chào bạn trở lại 🌿'}</h1><p class="muted">${recover?'Nhập email để nhận liên kết đặt mật khẩu mới.':'Đăng nhập để lưu ghi nhận và thói quen trên đám mây, dùng tiếp ở điện thoại hoặc máy tính.'}</p><form id="auth-form"><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>${recover?'':`<label>Mật khẩu<input name="password" type="password" required minlength="${signup?8:1}" maxlength="128" autocomplete="${signup?'new-password':'current-password'}"></label>`}<button class="primary" ${account.authBusy?'disabled':''}>${account.authBusy?'Đang xử lý…':recover?'Gửi email khôi phục':signup?'Tạo tài khoản':'Đăng nhập'}</button></form><p role="status" class="auth-message">${esc(account.message)}</p><div class="auth-switch">${account.mode!=='signin'?'<button data-auth-mode="signin">Đã có tài khoản? Đăng nhập</button>':''}${account.mode!=='signup'?'<button data-auth-mode="signup">Tạo tài khoản mới</button>':''}${account.mode!=='recover'?'<button data-auth-mode="recover">Quên mật khẩu</button>':''}</div><p class="notice">${legacy?'Dữ liệu cũ chưa được gửi đi. Sau khi đăng nhập, bạn có thể chuyển dữ liệu trong Cài đặt.':'Nhật ký và thói quen thuộc tài khoản của bạn.'}</p>`}
function syncBanner(){
  if(account.demo)return '<div class="sync-banner">Đang xem thử · Thay đổi chỉ ở trong tab, không lưu trên thiết bị hay đám mây. <button id="exit-demo">Về trang kết nối</button></div>';
  if(!account.dirty)return '';
  return `<div class="sync-banner" role="alert"><div><strong>${account.saving?'Đang lưu lên đám mây…':'Thay đổi chưa được lưu'}</strong><p>${esc(account.syncError||'Đừng đóng tab cho đến khi lưu hoàn tất.')}</p></div>${account.saving?'':'<button id="retry-save">Thử lưu lại</button><button id="export">Xuất JSON giữ bản nháp</button><button id="reload-cloud">Tải lại từ đám mây</button>'}</div>`;
}
function accountSettings(){return `<section class="card account-card"><div class="section-title"><h2>☁ Tài khoản & dữ liệu đám mây</h2>${account.user?'<button id="signout">Đăng xuất</button>':''}</div><p>${account.user?esc(account.user.email):'Đang xem thử, chưa đăng nhập.'}</p><p class="muted">Ghi nhận và thói quen được lưu trên Supabase khi đăng nhập. Không lưu bản sao dữ liệu sức khỏe vào LocalStorage. Phiên đăng nhập chỉ giữ trong tab; sau khi đóng tab bạn có thể cần đăng nhập lại.</p>${account.user?'<button id="reload-cloud">↻ Tải lại từ đám mây</button>':''}${legacy?`<div class="legacy-box"><h3>Dữ liệu cũ trên trình duyệt</h3><p class="muted">Có ${Object.keys(legacy.records).length} ngày và ${legacy.habits.length} thói quen${legacy.demo?' (có dữ liệu mẫu)':''}. Dữ liệu cũ chưa tự động gửi lên tài khoản.</p><button id="export-legacy">Xuất JSON dữ liệu cũ</button>${account.user?'<button id="migrate-legacy">Chuyển dữ liệu cũ lên tài khoản</button>':''}<button id="remove-legacy" class="danger">Xóa bản cũ trên thiết bị</button></div>`:''}</section>`}
async function saveCloudData(){
  if(account.demo){toast('Chế độ xem thử: thay đổi không được lưu.');return false}
  if(!account.user||account.loading||account.loadError){toast('Vui lòng đăng nhập và tải dữ liệu trước.');return false}
  account.dirty=true;account.saving=true;account.syncError='';updateAccountUI();
  try{validate(data);await cloud.save(data);account.dirty=false;return true}
  catch(error){account.syncError=error.message;toast('Chưa lưu được. Vào Cài đặt để thử lại hoặc xuất JSON.');return false}
  finally{account.saving=false;updateAccountUI()}
}
async function loadCloudData(){
  account.loading=true;account.loadError='';render();
  try{const payload=await cloud.load();if(payload)validate(payload);data=payload||emptyData();account.dirty=false;account.syncError=''}
  catch(error){account.loadError=error.message}
  finally{account.loading=false;render()}
}
function clearPrivateState(){
  conversationEpoch++;data=emptyData();chat=[{role:'model',text:'Chào bạn 🌿 Mình có thể cùng bạn nhìn lại giấc ngủ và thói quen hôm nay.'}];
  busy=false;page='dashboard';account.mode='signin';account.user=null;account.recovery=false;account.dirty=false;account.loadError='';account.syncError='';
  try{sessionStorage.removeItem('lifemate-gemini')}catch{}
  $('#habit-dialog').close();$('#habit-form').reset();
}
// Protect against repeated clicks and overwrites while a save is pending/failed.
for(const type of ['click','change','submit'])document.addEventListener(type,e=>{
  const target=e.target.closest('[data-water],[data-toggle],[data-delete],[data-goal],#reset,#import,#migrate-legacy,#checkin-form,#habit-form');
  if(!target)return;
  if(account.saving||account.dirty||account.loading||(!account.user&&!account.demo)){
    e.preventDefault();e.stopImmediatePropagation();toast(account.saving?'Đang lưu, đợi một chút nhé.':'Hãy xử lý thay đổi chưa lưu trước khi sửa tiếp.');
    if(type==='change'&&e.target.type==='checkbox')e.target.checked=!e.target.checked;
  }
},true);
window.addEventListener('beforeunload',e=>{if(account.dirty){e.preventDefault();e.returnValue=''}});
function exportLegacy(){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(legacy,null,2)],{type:'application/json'}));a.href=url;a.download='lifemate-du-lieu-cu.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='account-button'){if(!account.user&&account.demo){account.demo=false;data=emptyData();render()}else{location.hash='settings';render()}}
  if(b.dataset.authMode){account.mode=b.dataset.authMode;account.message='';render()}
  if(b.id==='view-demo'){account.demo=true;data=seed();render()}
  if(b.id==='exit-demo'){account.demo=false;data=emptyData();render()}
  if(b.id==='retry-save'&&!account.saving){if(await saveCloudData())toast('Đã lưu lên đám mây');render()}
  if(b.id==='reload-cloud'&&!account.saving){if(account.dirty&&!confirm('Bỏ thay đổi chưa lưu và tải bản trên đám mây? Hãy xuất JSON trước nếu muốn giữ bản nháp.'))return;await loadCloudData()}
  if(b.id==='signout'&&!account.saving){if(account.dirty&&!confirm('Thay đổi chưa lưu sẽ mất khi đăng xuất. Bạn đã xuất JSON và muốn tiếp tục?'))return;account.loading=true;render();let error;try{await cloud.signOut()}catch(e){error=e}finally{clearPrivateState();account.loading=false;account.message=error?'Đã xóa phiên trên thiết bị này. Không liên lạc được máy chủ để kết thúc phiên từ xa.':'Đã đăng xuất.';render()}}
  if(b.id==='export-legacy'&&legacy)exportLegacy();
  if(b.id==='migrate-legacy'&&legacy&&account.user){
    if(!confirm('Chuyển dữ liệu cũ lên tài khoản này? Dữ liệu tài khoản hiện có sẽ được thay thế. Hãy xuất JSON trước nếu cần giữ cả hai.'))return;
    data=JSON.parse(JSON.stringify(legacy));const saved=await persist();render();if(saved)toast('Đã chuyển lên tài khoản. Bản cũ trên thiết bị vẫn còn.');
  }
  if(b.id==='remove-legacy'&&confirm('Xóa bản dữ liệu cũ trên trình duyệt? Việc này không xóa dữ liệu đã lưu trên đám mây.')){
    try{localStorage.removeItem(key);legacy=null;render();toast('Đã xóa bản cũ trên thiết bị')}catch{toast('Trình duyệt không cho phép xóa dữ liệu.')}
  }
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!['auth-form','password-form'].includes(form.id))return;
  e.preventDefault();if(account.authBusy)return;
  const values=Object.fromEntries(new FormData(form));account.authBusy=true;account.message='';render();
  try{
    if(form.id==='password-form'){
      await cloud.changePassword(values.password);account.recovery=false;page='dashboard';account.message='';toast('Đã đổi mật khẩu.');await loadCloudData();
    }else if(account.mode==='recover'){
      await cloud.recover(values.email.trim());account.message='Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt mật khẩu. Kiểm tra cả mục thư rác.';
    }else if(account.mode==='signup'){
      const result=await cloud.signUp(values.email.trim(),values.password);
      if(result.access_token){account.user=result.user;page='dashboard';await loadCloudData()}
      else{account.mode='signin';account.message='Hãy mở email để xác nhận tài khoản, rồi quay lại đăng nhập. Nếu email đã tồn tại, hãy đăng nhập hoặc dùng Quên mật khẩu.'}
    }else{
      account.user=await cloud.signIn(values.email.trim(),values.password);page='dashboard';history.replaceState(null,'',location.pathname+location.search+'#dashboard');await loadCloudData();
    }
  }catch(error){account.message=error.message}
  finally{account.authBusy=false;render()}
});
async function startAccount(){
  const requested=location.hash.slice(1);if(['dashboard','checkin','habits','coach','report','settings'].includes(requested))page=requested;
  if(cloud.configured)try{
    const restored=await cloud.restoreSession();
    if(restored){if(account.user&&account.user.id!==restored.user.id)clearPrivateState();account.user=restored.user;account.recovery=restored.recovery;if(!restored.recovery){await loadCloudData();return}}
  }catch(error){cloud.remember(null);account.message=error.message}
  account.loading=false;navigate(location.hash.slice(1));
}
render();startAccount();
