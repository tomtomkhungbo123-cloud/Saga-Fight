ALTER TABLE saga_inventory_internal.gacha_spins
 ADD COLUMN refund integer NOT NULL DEFAULT 0 CHECK (refund >= 0 AND refund < 150);

CREATE FUNCTION saga_inventory_internal.spin_gacha_with_duplicates(p_key text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 uid text := p_data->>'user';
 spin_id uuid := (p_data->>'requestId')::uuid;
 created bigint := (p_data->>'now')::bigint;
 cost constant bigint := 150;
 state jsonb;
 reward text;
 refund_amount integer;
BEGIN
 -- Dispatch verifies the server key and holds the wallet lock for this transaction.
 state := saga_inventory_internal.dispatch(p_key,'sync',p_data);
 IF state ? 'missing' THEN RETURN state; END IF;

 SELECT item_id,refund INTO reward,refund_amount
 FROM saga_inventory_internal.gacha_spins WHERE user_id=uid AND request_id=spin_id;
 IF FOUND THEN RETURN state || jsonb_build_object('reward',reward,'duplicateScoin',refund_amount); END IF;

 IF (state->>'balance')::bigint<cost THEN
  RETURN jsonb_build_object('status',409,'error','Bạn chưa đủ Scoin.');
 END IF;
 reward := p_data->>'itemId';
 refund_amount := (p_data->>'refund')::integer;
 IF reward IS NULL OR reward NOT IN ('thunder-jade','soul-amethyst','thunder-crimson','cylast-gold')
    OR refund_amount IS NULL OR refund_amount<=0 OR refund_amount>=cost THEN
  RAISE EXCEPTION 'Invalid Gacha reward';
 END IF;

 INSERT INTO saga_inventory_internal.items VALUES(uid,reward,'gacha',created) ON CONFLICT DO NOTHING;
 IF FOUND THEN refund_amount := 0; END IF;
 UPDATE saga_inventory_internal.wallets SET balance=balance-cost+refund_amount WHERE user_id=uid;
 INSERT INTO saga_inventory_internal.events VALUES(uid,'gacha',spin_id::text,refund_amount-cost,created);
 INSERT INTO saga_inventory_internal.gacha_spins(user_id,request_id,item_id,created_at,refund)
 VALUES(uid,spin_id,reward,created,refund_amount);
 RETURN saga_inventory_internal.dispatch(p_key,'read',p_data)
  || jsonb_build_object('reward',reward,'duplicateScoin',refund_amount);
END;
$$;
REVOKE ALL ON FUNCTION saga_inventory_internal.spin_gacha_with_duplicates(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION saga_inventory_internal.spin_gacha_with_duplicates(text,jsonb) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.saga_inventory_rpc(p_key text,p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE p_action
  WHEN 'gacha' THEN saga_inventory_internal.spin_gacha(p_key,p_data)
  WHEN 'gacha_with_duplicates' THEN saga_inventory_internal.spin_gacha_with_duplicates(p_key,p_data)
  ELSE saga_inventory_internal.dispatch(p_key,p_action,p_data)
 END;
$$;
