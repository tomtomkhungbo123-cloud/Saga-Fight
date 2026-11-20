import {shopOffer} from './shop.mjs';

export async function readMailbox(DB,user,page=1){
 const counts=await DB.prepare('SELECT COUNT(*) total,COALESCE(SUM(read_at IS NULL),0) unread FROM mailbox_receipts WHERE user_id=?').bind(user).first();
 const pages=Math.max(1,Math.ceil(counts.total/20));page=Math.min(pages,Math.max(1,page));
 const rows=(await DB.prepare(`SELECT m.id,m.title,m.body,m.item_id,m.created_at,r.read_at,r.claimed_at
  FROM mailbox_receipts r JOIN admin_messages m ON m.id=r.message_id WHERE r.user_id=?
  ORDER BY m.created_at DESC,m.id DESC LIMIT 20 OFFSET ?`).bind(user,(page-1)*20).all()).results;
 const items=[...shopOffer().catalog,...shopOffer().retired];
 return {...counts,page,pages,messages:rows.map(m=>({id:m.id,title:m.title,body:m.body,createdAt:m.created_at,readAt:m.read_at,claimedAt:m.claimed_at,item:items.find(i=>i.id===m.item_id)||null}))};
}

export async function adminMailbox(DB,user){
 const history=(await DB.prepare(`SELECT m.id,m.title,m.audience,m.created_at,m.item_id,COUNT(r.user_id) recipients,
  COALESCE(SUM(r.claimed_at IS NOT NULL),0) claimed FROM admin_messages m
  LEFT JOIN mailbox_receipts r ON r.message_id=m.id WHERE m.sender_id=?
  GROUP BY m.id ORDER BY m.created_at DESC LIMIT 20`).bind(user).all()).results;
 return {catalog:shopOffer().catalog,accounts:(await DB.prepare('SELECT COUNT(*) count FROM player_profiles').first()).count,history};
}

export async function sendAdminMail(DB,actor,data,now){
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 if(typeof data.operation!=='string'||!/^[-a-f0-9]{36}$/i.test(data.operation))fail('Yêu cầu gửi không hợp lệ.');
 const title=typeof data.title==='string'?data.title.trim():'';
 const body=typeof data.body==='string'?data.body.trim():'';
 if(!title||title.length>80||!body||body.length>3000)fail('Tiêu đề tối đa 80 ký tự, nội dung tối đa 3.000 ký tự.');
 if(!['one','all'].includes(data.audience))fail('Chọn người nhận.');
 const itemId=data.itemId||null;
 if(itemId&&!shopOffer().catalog.some(item=>item.id===itemId))fail('Vật phẩm chưa được phát hành hoặc không tồn tại.');
 let target=null;
 if(data.audience==='one'){
  const name=String(data.username||'').trim().toLowerCase();
  if(!/^[a-z0-9_]{3,24}$/.test(name))fail('Tên đăng nhập không hợp lệ.');
  const rows=(await DB.prepare('SELECT user_id FROM player_profiles WHERE lower(display_name)=? LIMIT 2').bind(name).all()).results;
  if(rows.length!==1)fail('Không tìm thấy tài khoản. Người nhận cần đăng nhập game ít nhất một lần.',404);
  target=rows[0].user_id;
 }
 const prior=await DB.prepare('SELECT * FROM admin_messages WHERE id=?').bind(data.operation).first();
 if(prior){
  if(prior.sender_id!==actor||prior.title!==title||prior.body!==body||prior.item_id!==itemId||prior.audience!==data.audience||prior.target_id!==target)fail('Yêu cầu gửi đã được dùng cho nội dung khác.',409);
  return {sent:true,alreadyApplied:true,recipients:(await DB.prepare('SELECT COUNT(*) count FROM mailbox_receipts WHERE message_id=?').bind(prior.id).first()).count};
 }
 await DB.batch([
  DB.prepare('INSERT OR IGNORE INTO admin_messages(id,sender_id,title,body,item_id,audience,target_id,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(data.operation,actor,title,body,itemId,data.audience,target,now),
  DB.prepare(`INSERT OR IGNORE INTO mailbox_receipts(message_id,user_id)
   SELECT m.id,p.user_id FROM admin_messages m CROSS JOIN player_profiles p
   WHERE m.id=? AND m.sender_id=? AND (m.audience='all' OR p.user_id=m.target_id)`).bind(data.operation,actor)
 ]);
 // A concurrent request cannot silently reuse another sender's operation ID.
 const saved=await DB.prepare('SELECT * FROM admin_messages WHERE id=?').bind(data.operation).first();
 if(saved.sender_id!==actor||saved.title!==title||saved.body!==body||saved.item_id!==itemId||saved.audience!==data.audience||saved.target_id!==target)fail('Yêu cầu gửi đã thay đổi.',409);
 return {sent:true,recipients:(await DB.prepare('SELECT COUNT(*) count FROM mailbox_receipts WHERE message_id=?').bind(data.operation).first()).count};
}

export async function updateMailbox(DB,user,data,now){
 const receipt=await DB.prepare(`SELECT m.item_id FROM mailbox_receipts r JOIN admin_messages m ON m.id=r.message_id
  WHERE r.user_id=? AND r.message_id=?`).bind(user,String(data.id||'')).first();
 if(!receipt)throw Object.assign(Error('Không tìm thấy thư.'),{status:404});
 if(data.action==='read')await DB.prepare('UPDATE mailbox_receipts SET read_at=COALESCE(read_at,?) WHERE user_id=? AND message_id=?').bind(now,user,data.id).run();
 else if(data.action==='claim'&&receipt.item_id){
  await DB.batch([
   DB.prepare('UPDATE mailbox_receipts SET claimed_at=COALESCE(claimed_at,?),read_at=COALESCE(read_at,?) WHERE user_id=? AND message_id=?').bind(now,now,user,data.id),
   DB.prepare(`INSERT OR IGNORE INTO cosmetic_inventory(user_id,item_id,source,created_at)
    SELECT r.user_id,m.item_id,m.id,? FROM mailbox_receipts r JOIN admin_messages m ON m.id=r.message_id
    WHERE r.user_id=? AND m.id=? AND r.claimed_at IS NOT NULL AND m.item_id IS NOT NULL`).bind(now,user,data.id)
  ]);
 }else throw Object.assign(Error('Thao tác hộp thư không hợp lệ.'),{status:400});
 return {updated:true};
}
