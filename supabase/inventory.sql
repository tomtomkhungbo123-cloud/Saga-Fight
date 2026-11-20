-- Server-only inventory API. Private tables never grant access to browser roles.
CREATE SCHEMA IF NOT EXISTS saga_inventory_internal;
REVOKE ALL ON SCHEMA saga_inventory_internal FROM PUBLIC;
CREATE TABLE saga_inventory_internal.config (id boolean PRIMARY KEY DEFAULT true CHECK(id),key_hash text NOT NULL);
CREATE TABLE saga_inventory_internal.wallets (user_id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),created_at bigint NOT NULL);
CREATE TABLE saga_inventory_internal.items (user_id text NOT NULL REFERENCES saga_inventory_internal.wallets(user_id),item_id text NOT NULL,source text NOT NULL,created_at bigint NOT NULL,PRIMARY KEY(user_id,item_id));
CREATE TABLE saga_inventory_internal.loadouts (user_id text NOT NULL REFERENCES saga_inventory_internal.wallets(user_id),slot text NOT NULL,item_id text NOT NULL,PRIMARY KEY(user_id,slot),FOREIGN KEY(user_id,item_id) REFERENCES saga_inventory_internal.items(user_id,item_id));
CREATE TABLE saga_inventory_internal.events (user_id text NOT NULL REFERENCES saga_inventory_internal.wallets(user_id),kind text NOT NULL,source_id text NOT NULL,amount bigint NOT NULL,created_at bigint NOT NULL,PRIMARY KEY(user_id,kind,source_id));
CREATE TABLE saga_inventory_internal.migration_backups (user_id text PRIMARY KEY,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE saga_inventory_internal.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_inventory_internal.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_inventory_internal.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_inventory_internal.loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_inventory_internal.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_inventory_internal.migration_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA saga_inventory_internal FROM PUBLIC,anon,authenticated;

CREATE FUNCTION saga_inventory_internal.dispatch(p_key text,p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid text:=p_data->>'user'; state jsonb; entry jsonb; iid text; slot_name text; price bigint; delta bigint; applied integer; wallet_balance bigint; created bigint; inserted integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM saga_inventory_internal.config WHERE key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF uid IS NULL OR length(uid)<1 OR length(uid)>200 THEN RAISE EXCEPTION 'Invalid user'; END IF;
 IF p_action='bootstrap' THEN
  state:=p_data->'snapshot';
  IF jsonb_typeof(state)<>'object' OR (state->>'balance')::bigint<0 THEN RAISE EXCEPTION 'Invalid snapshot'; END IF;
  INSERT INTO saga_inventory_internal.wallets VALUES(uid,(state->>'balance')::bigint,(extract(epoch FROM now())*1000)::bigint) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  PERFORM 1 FROM saga_inventory_internal.wallets WHERE user_id=uid FOR UPDATE;
  IF inserted=1 THEN
   INSERT INTO saga_inventory_internal.migration_backups(user_id,snapshot) VALUES(uid,state);
   FOR entry IN SELECT value FROM jsonb_array_elements(state->'ledger') LOOP
    INSERT INTO saga_inventory_internal.events VALUES(uid,entry->>'kind',entry->>'source_id',(entry->>'amount')::bigint,(entry->>'created_at')::bigint) ON CONFLICT DO NOTHING;
   END LOOP;
   FOR entry IN SELECT value FROM jsonb_array_elements(state->'owned') LOOP
    INSERT INTO saga_inventory_internal.items VALUES(uid,entry#>>'{}','migration',(extract(epoch FROM now())*1000)::bigint) ON CONFLICT DO NOTHING;
   END LOOP;
   FOR slot_name,iid IN SELECT key,value FROM jsonb_each_text(state->'equipped') LOOP
    INSERT INTO saga_inventory_internal.loadouts SELECT uid,slot_name,iid WHERE EXISTS(SELECT 1 FROM saga_inventory_internal.items WHERE user_id=uid AND item_id=iid) ON CONFLICT DO NOTHING;
   END LOOP;
  END IF;
 END IF;
 SELECT balance INTO wallet_balance FROM saga_inventory_internal.wallets WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('missing',true); END IF;
 IF p_action IN ('sync','buy','equip','unequip') THEN
  FOR entry IN SELECT value FROM jsonb_array_elements(p_data->'events') LOOP
   IF entry->>'kind' IN ('pve','online') AND (entry->>'amount')::bigint>0 THEN
    INSERT INTO saga_inventory_internal.events VALUES(uid,entry->>'kind',entry->>'source_id',(entry->>'amount')::bigint,(entry->>'created_at')::bigint) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS applied=ROW_COUNT;
    IF applied=1 THEN UPDATE saga_inventory_internal.wallets SET balance=balance+(entry->>'amount')::bigint WHERE user_id=uid; END IF;
   ELSIF NOT EXISTS(SELECT 1 FROM saga_inventory_internal.events WHERE user_id=uid AND kind=entry->>'kind' AND source_id=entry->>'source_id') THEN RAISE EXCEPTION 'Unrecognized legacy event';
   END IF;
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_data->'gifts') LOOP
   INSERT INTO saga_inventory_internal.items VALUES(uid,entry->>'item_id',entry->>'source',(entry->>'created_at')::bigint) ON CONFLICT DO NOTHING;
  END LOOP;
 END IF;
 IF p_action IN ('buy','equip','unequip') THEN
  iid:=p_data->>'item';slot_name:=p_data->>'slot';price:=(p_data->>'price')::bigint;created:=(p_data->>'now')::bigint;
  IF iid IS NULL OR slot_name IS NULL OR price<0 OR price>1000000 THEN RAISE EXCEPTION 'Invalid item'; END IF;
  IF p_action='buy' AND NOT EXISTS(SELECT 1 FROM saga_inventory_internal.items WHERE user_id=uid AND item_id=iid) THEN
   IF NOT COALESCE((p_data->>'admin')::boolean,false) THEN
    IF (SELECT balance FROM saga_inventory_internal.wallets WHERE user_id=uid)<price THEN RETURN jsonb_build_object('status',409,'error','Bạn chưa đủ Scoin.'); END IF;
    UPDATE saga_inventory_internal.wallets SET balance=balance-price WHERE user_id=uid;
    INSERT INTO saga_inventory_internal.events VALUES(uid,'purchase',iid,-price,created);
   END IF;
   INSERT INTO saga_inventory_internal.items VALUES(uid,iid,CASE WHEN COALESCE((p_data->>'admin')::boolean,false) THEN 'admin' ELSE 'purchase' END,created);
  ELSIF p_action='equip' THEN
   IF NOT EXISTS(SELECT 1 FROM saga_inventory_internal.items WHERE user_id=uid AND item_id=iid) THEN RETURN jsonb_build_object('status',403,'error','Bạn chưa sở hữu vật phẩm này.'); END IF;
   INSERT INTO saga_inventory_internal.loadouts VALUES(uid,slot_name,iid) ON CONFLICT(user_id,slot) DO UPDATE SET item_id=excluded.item_id;
  ELSIF p_action='unequip' THEN DELETE FROM saga_inventory_internal.loadouts WHERE user_id=uid AND slot=slot_name AND item_id=iid;
  END IF;
 ELSIF p_action NOT IN ('read','bootstrap','sync') THEN RAISE EXCEPTION 'Unknown inventory action';
 END IF;
 RETURN jsonb_build_object('balance',(SELECT balance FROM saga_inventory_internal.wallets WHERE user_id=uid),'owned',COALESCE((SELECT jsonb_agg(item_id ORDER BY item_id) FROM saga_inventory_internal.items WHERE user_id=uid),'[]'::jsonb),'equipped',COALESCE((SELECT jsonb_object_agg(slot,item_id) FROM saga_inventory_internal.loadouts WHERE user_id=uid),'{}'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION saga_inventory_internal.dispatch(text,text,jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA saga_inventory_internal TO anon,authenticated;
GRANT EXECUTE ON FUNCTION saga_inventory_internal.dispatch(text,text,jsonb) TO anon,authenticated;
CREATE FUNCTION public.saga_inventory_rpc(p_key text,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT saga_inventory_internal.dispatch(p_key,p_action,p_data); $$;
REVOKE ALL ON FUNCTION public.saga_inventory_rpc(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saga_inventory_rpc(text,text,jsonb) TO anon,authenticated;

CREATE POLICY no_client_access ON saga_inventory_internal.config FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY no_client_access ON saga_inventory_internal.wallets FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY no_client_access ON saga_inventory_internal.items FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY no_client_access ON saga_inventory_internal.loadouts FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY no_client_access ON saga_inventory_internal.events FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY no_client_access ON saga_inventory_internal.migration_backups FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
