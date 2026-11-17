import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/account-identity.js';
import {api} from '../worker/core.mjs';
const identity=globalThis.SagaIdentity;
const settings={mailer_autoconfirm:true,disable_signup:false,external:{email:true}};
test('username login has one canonical identity, rejects invalid names and retains old email logins',()=>{
 assert.equal(identity.loginAddress('  Saga_Player  '),'saga_player@players.sagafight.invalid');
 assert.equal(identity.loginAddress('old@example.com'),'old@example.com');
 assert.equal(identity.usernameFromAddress('saga_player@players.sagafight.invalid'),'saga_player');
 for(const name of ['ab','a@b.com','tên_người','name space','x'.repeat(25)])assert.throws(()=>identity.address(name));
});
test('registration makes no auth request while confirmations are enabled',async()=>{
 const client={auth:{signUp(){throw Error('Must not send signup');}}};
 await assert.rejects(identity.register(client,'saga_player','password123',{...settings,mailer_autoconfirm:false}),{code:'signup_not_ready'});
});
test('username registration needs no supplied email and returns a real Supabase session',async()=>{
 let received;const session={access_token:'real-session-placeholder'};
 const client={auth:{async signUp(payload){received=payload;return {data:{session},error:null};}}};
 const result=await identity.register(client,'Saga_Player','password123',settings);
 assert.equal(received.email,'saga_player@players.sagafight.invalid');assert.equal(received.options.data.username,'saga_player');assert.equal(result.data.session,session);
 await assert.rejects(identity.register(client,'saga_player','short',settings),{code:'invalid_password'});
 client.auth.signUp=async()=>({data:{session:null},error:null});await assert.rejects(identity.register(client,'saga_player','password123',settings),{code:'signup_not_ready'});
});
test('account username is derived from the verified address, preserving legacy accounts',async()=>{
 const headers={'oai-authenticated-user-id':'verified-uuid','oai-authenticated-user-email':'saga_player@players.sagafight.invalid'};
 const response=await api(new Request('https://saga.test/api/account',{headers}),{});assert.equal((await response.json()).user.username,'saga_player');
});
