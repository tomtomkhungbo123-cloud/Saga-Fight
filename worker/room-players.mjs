// Public room identities come only from server-owned profiles, never client payloads.
export async function roomPlayers(DB,ids,joined=false){
 const rows=(await DB.prepare('SELECT user_id,display_name FROM player_profiles WHERE user_id IN (?,?)').bind(ids[0],ids[1]).all()).results;
 return ids.map((id,index)=>{
  if(index===1&&!joined)return null;
  if(!id)return 'Khách '+(index+1);
  const name=rows.find(row=>row.user_id===id)?.display_name;
  return typeof name==='string'&&/^[a-z0-9_]{3,24}$/i.test(name)?name:'Chiến binh '+(index+1);
 });
}
