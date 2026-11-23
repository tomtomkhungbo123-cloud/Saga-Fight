CREATE TABLE saga_inventory_internal.gacha_spins (
 user_id text NOT NULL REFERENCES saga_inventory_internal.wallets(user_id),
 request_id uuid NOT NULL,
 item_id text NOT NULL,
 created_at bigint NOT NULL,
 PRIMARY KEY (user_id,request_id)
);
ALTER TABLE saga_inventory_internal.gacha_spins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON saga_inventory_internal.gacha_spins FROM PUBLIC,anon,authenticated;

CREATE FUNCTION saga_inventory_internal.spin_gacha(p_key text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 uid text := p_data->>'user';
 spin_id uuid := (p_data->>'requestId')::uuid;
 created bigint := (p_data->>'now')::bigint;
 cost constant bigint := 150;
 state jsonb;
 reward text;
BEGIN
 -- The existing server credential check and per-wallet lock apply to the whole spin.
 state := saga_inventory_internal.dispatch(p_key,'sync',p_data);
 IF state ? 'missing' THEN RETURN state; END IF;

 SELECT item_id INTO reward FROM saga_inventory_internal.gacha_spins WHERE user_id=uid AND request_id=spin_id;
 IF FOUND THEN RETURN state || jsonb_build_object('reward',reward); END IF;

 SELECT candidate.item_id INTO reward
 FROM jsonb_array_elements_text(p_data->'candidates') WITH ORDINALITY AS candidate(item_id,priority)
 WHERE candidate.item_id IN ('thunder-jade','soul-amethyst','thunder-crimson','cylast-gold')
   AND NOT EXISTS(SELECT 1 FROM saga_inventory_internal.items WHERE user_id=uid AND item_id=candidate.item_id)
 ORDER BY candidate.priority LIMIT 1;
 IF reward IS NULL THEN
  RETURN jsonb_build_object('status',409,'error','Bạn đã sở hữu tất cả phần thưởng Gacha.');
 END IF;
 IF (state->>'balance')::bigint<cost THEN
  RETURN jsonb_build_object('status',409,'error','Bạn chưa đủ Scoin.');
 END IF;

 UPDATE saga_inventory_internal.wallets SET balance=balance-cost WHERE user_id=uid;
 INSERT INTO saga_inventory_internal.events VALUES(uid,'gacha',spin_id::text,-cost,created);
 INSERT INTO saga_inventory_internal.items VALUES(uid,reward,'gacha',created);
 INSERT INTO saga_inventory_internal.gacha_spins VALUES(uid,spin_id,reward,created);
 RETURN saga_inventory_internal.dispatch(p_key,'read',p_data) || jsonb_build_object('reward',reward);
END;
$$;
REVOKE ALL ON FUNCTION saga_inventory_internal.spin_gacha(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION saga_inventory_internal.spin_gacha(text,jsonb) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.saga_inventory_rpc(p_key text,p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE WHEN p_action='gacha' THEN saga_inventory_internal.spin_gacha(p_key,p_data)
 ELSE saga_inventory_internal.dispatch(p_key,p_action,p_data) END;
$$;
