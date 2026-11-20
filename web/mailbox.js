(()=>{
'use strict';
const $=id=>document.getElementById(id),dialog=$('mailboxDialog');
let user=null,admin=false,generation=0,page=1,pending=false,opener,sendDraft=null,sendBusy=false;
const status=text=>$('mailboxStatus').textContent=text;
const make=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
async function request(path,body){
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{...await window.SagaAccount.headers(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Chưa kết nối được hộp thư.');return data;
}
function badge(count=0){$('mailboxBadge').hidden=!count;$('mailboxBadge').textContent=count>99?'99+':String(count);$('mailboxOpen').setAttribute('aria-label',count?'Hộp thư, '+count+' thư chưa đọc':'Hộp thư');}
async function load(quiet=false){
 if(!user||pending)return;const version=generation;pending=true;
 if(!quiet)status('Đang tải thư…');
 try{const data=await request('account/mailbox?page='+page);if(version!==generation)return;badge(data.unread);page=data.page;if(!quiet){render(data);status('');}}
 catch(error){if(version===generation&&!quiet)status(error.message);}
 finally{if(version===generation)pending=false;}
}
function render(data){
 const list=$('mailboxList');list.replaceChildren();
 $('mailboxPaging').hidden=data.pages<2;$('mailboxPage').textContent=page+' / '+data.pages;
 $('mailboxPrev').disabled=page<=1;$('mailboxNext').disabled=page>=data.pages;
 if(!data.messages.length){list.append(make('p','Chưa có thư. Thông báo và quà từ admin sẽ xuất hiện tại đây.','mail-empty'));return;}
 for(const mail of data.messages){
  const card=make('details',null,'mail-card'+(mail.readAt?'':' unread'));
  const summary=make('summary');summary.append(make('strong',mail.title),make('small',new Date(mail.createdAt).toLocaleString('vi-VN')));card.append(summary);
  card.append(make('p','BAN QUẢN TRỊ SAGA FIGHT','mail-sender'),make('p',mail.body,'mail-body'));
  if(mail.item){
   const gift=make('div',null,'mail-gift');gift.append(make('span','Quà tặng · '+mail.item.name));
   const button=make('button',mail.claimedAt?'Đã nhận':'Nhận quà');button.type='button';button.disabled=!!mail.claimedAt;
   button.addEventListener('click',async()=>{const version=generation;button.disabled=true;try{await request('account/mailbox',{action:'claim',id:mail.id});if(version!==generation)return;button.textContent='Đã nhận';status('Đã nhận quà vào Túi đồ. Vật phẩm đã sở hữu sẽ không được cộng trùng.');void window.SagaShop?.refresh();void load(true);}catch(error){if(version===generation){button.disabled=false;status(error.message);}}});
   gift.append(button);card.append(gift);
  }
  let reading=false;card.addEventListener('toggle',async()=>{if(!card.open||mail.readAt||reading)return;reading=true;const version=generation;try{await request('account/mailbox',{action:'read',id:mail.id});if(version===generation){mail.readAt=Date.now();card.classList.remove('unread');void load(true);}}catch{reading=false;}});
  list.append(card);
 }
}
function view(compose=false){$('mailboxInbox').hidden=compose;$('mailboxAdmin').hidden=!compose;$('mailboxInboxTab').setAttribute('aria-pressed',String(!compose));$('mailboxAdminTab').setAttribute('aria-pressed',String(compose));status('');}
async function management(){
 if(!admin)return;view(true);const version=generation;status('Đang tải quyền quản trị…');
 try{const data=await request('admin/mailbox');if(version!==generation)return;
  const select=$('mailGift');select.replaceChildren(make('option','Không kèm quà'));select.firstChild.value='';
  for(const item of data.catalog){const option=make('option',item.name);option.value=item.id;select.append(option);}
  $('mailAudienceCount').textContent=data.accounts+' tài khoản đã đăng nhập game. Gửi toàn bộ chỉ áp dụng cho các tài khoản hiện có.';
  $('mailHistory').replaceChildren();for(const sent of data.history){$('mailHistory').append(make('li',sent.title+' · '+sent.recipients+' người nhận · '+sent.claimed+' đã nhận quà · '+new Date(sent.created_at).toLocaleString('vi-VN')));}
  status('');
 }catch(error){if(version===generation)status(error.message);}
}
function resetDraft(){sendDraft=null;$('mailSendConfirm').hidden=true;$('mailSendFields').disabled=false;}
async function open(){opener=document.activeElement;view();if(!dialog.open)dialog.showModal();$('mailboxClose').focus({preventScroll:true});$('mailboxLogin').hidden=!!user;$('mailboxTabs').hidden=!user;$('mailboxList').replaceChildren();if(user)await load();else status('Đăng nhập để nhận thông báo và quà từ admin.');}
$('mailboxOpen').addEventListener('click',open);$('mailboxClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
$('mailboxLogin').addEventListener('click',()=>{dialog.close();window.SagaAccount.open('login');});
$('mailboxInboxTab').addEventListener('click',()=>{view();void load();});$('mailboxAdminTab').addEventListener('click',management);
$('mailboxRefresh').addEventListener('click',()=>load());
$('mailboxPrev').addEventListener('click',()=>{page--;void load();});$('mailboxNext').addEventListener('click',()=>{page++;void load();});
$('mailAudience').addEventListener('change',()=>{$('mailUsernameRow').hidden=$('mailAudience').value!=='one';$('mailUsername').required=$('mailAudience').value==='one';});
$('mailSendForm').addEventListener('submit',event=>{event.preventDefault();if(!admin||sendBusy)return;
 const name=$('mailUsername').value.trim();sendDraft={operation:crypto.randomUUID(),audience:$('mailAudience').value,username:name,title:$('mailTitle').value.trim(),body:$('mailBody').value.trim(),itemId:$('mailGift').value};
 $('mailSendPreview').textContent='Gửi “'+sendDraft.title+'” tới '+(sendDraft.audience==='all'?'TOÀN BỘ tài khoản hiện có':name)+(sendDraft.itemId?' · Quà: '+$('mailGift').selectedOptions[0].textContent:' · Không kèm quà')+'.';
 $('mailSendFields').disabled=true;$('mailSendConfirm').hidden=false;$('mailSendNow').focus();
});
$('mailSendEdit').addEventListener('click',resetDraft);
$('mailSendNow').addEventListener('click',async()=>{if(!sendDraft||!admin||sendBusy)return;sendBusy=true;$('mailSendNow').disabled=true;$('mailSendEdit').disabled=true;const version=generation;status('Đang gửi…');
 try{const result=await request('admin/mailbox',sendDraft);if(version!==generation)return;$('mailSendForm').reset();$('mailUsernameRow').hidden=false;$('mailUsername').required=true;resetDraft();await management();if(version===generation)status('Đã gửi thành công tới '+result.recipients+' tài khoản.');}
 catch(error){if(version===generation)status(error.message+' Bạn có thể thử gửi lại; hệ thống không gửi trùng.');}
 finally{sendBusy=false;$('mailSendNow').disabled=false;$('mailSendEdit').disabled=false;}
});
window.SagaMailbox={sync(email,allowed){
 const next=email||null,role=allowed===true;if(user===next&&admin===role)return;user=next;admin=role;generation++;pending=false;page=1;badge();resetDraft();$('mailboxAdminTab').hidden=!admin;$('mailboxList').replaceChildren();$('mailHistory').replaceChildren();$('mailSendForm').reset();if(dialog.open)dialog.close();if(user)void load(true);
}};
window.addEventListener('focus',()=>{if(user)void load(true);});
setInterval(()=>{if(user&&!document.hidden&&!$('menu').hidden)void load(true);},60000);
})();
