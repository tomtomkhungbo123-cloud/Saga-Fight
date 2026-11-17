// Username identities use a reserved, non-deliverable address internally.
// Supabase Auth continues to own password hashing, rate limits and sessions.
((root)=>{'use strict';
 const suffix='@players.sagafight.invalid';
 function normalize(value){const username=String(value||'').trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))throw Object.assign(Error('Tên đăng nhập gồm 3–24 chữ cái không dấu, số hoặc dấu gạch dưới.'),{code:'invalid_username'});return username;}
 function address(username){return normalize(username)+suffix;}
 function usernameFromAddress(email){const value=String(email||'').toLowerCase();if(!value.endsWith(suffix))return null;try{return normalize(value.slice(0,-suffix.length));}catch{return null;}}
 function loginAddress(value){const input=String(value||'').trim();return input.includes('@')?input:address(input);}
 async function register(client,username,password,settings){
  username=normalize(username);
  if(typeof password!=='string'||password.length<8)throw Object.assign(Error('Mật khẩu cần ít nhất 8 ký tự.'),{code:'invalid_password'});
  if(settings?.mailer_autoconfirm!==true||settings?.disable_signup||!settings?.external?.email)throw Object.assign(Error('Đăng ký đang được cấu hình. Vui lòng thử lại sau.'),{code:'signup_not_ready'});
  const result=await client.auth.signUp({email:address(username),password,options:{data:{username,display_name:username}}});
  if(result.error)throw result.error;
  if(!result.data?.session)throw Object.assign(Error('Chưa đăng ký được tài khoản. Vui lòng thử lại sau.'),{code:'signup_not_ready'});
  return result;
 }
 root.SagaIdentity=Object.freeze({normalize,address,usernameFromAddress,loginAddress,register});
})(globalThis);
