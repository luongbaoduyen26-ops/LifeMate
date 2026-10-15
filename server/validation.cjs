'use strict';
function validPayload(v) {
  if(!v || v.version!==1 || !v.records || typeof v.records!=='object' || Array.isArray(v.records) || !Array.isArray(v.habits) || v.habits.length>500)return false;
  const validDate=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
  for(const [date,r] of Object.entries(v.records)) {
    if(!validDate(date)||!r)return false;
    for(const [k,min,max]of [['sleep',0,24],['water',0,4000],['exercise',0,1440],['nutrition',1,5],['mood',1,5],['energy',1,10]])if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<min||r[k]>max)return false;
    if(!['Sâu giấc','Bình thường','Chập chờn','Khó ngủ'].includes(r.quality)||typeof r.sport!=='string'||r.sport.length>200||typeof r.note!=='string'||r.note.length>5000)return false;
  }
  const ids=new Set();
  for(const h of v.habits){
    if(!h||typeof h.id!=='string'||h.id.length>100||ids.has(h.id)||typeof h.name!=='string'||!h.name.trim()||h.name.length>200||typeof h.emoji!=='string'||h.emoji.length>32||typeof h.category!=='string'||h.category.length>100||typeof h.time!=='string'||h.time.length>100||!Array.isArray(h.done)||h.done.length>50000||!h.done.every(validDate))return false;
    ids.add(h.id);
  }
  return Buffer.byteLength(JSON.stringify(v))<=5*1024*1024;
}
module.exports={validPayload};
