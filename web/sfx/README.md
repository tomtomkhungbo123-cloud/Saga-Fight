# SAGA SFX — v1

Bộ âm thanh tổng hợp bằng code cho Saga Fight. Chưa sửa hoặc triển khai game live.
Mở Saga_Sound_Lab.html bằng trình duyệt để nghe từng âm. File nghe thử hoạt động offline.
Các cue dựa trên bộ kỹ năng đã mô tả; cần đối chiếu event trong mã nguồn khi tích hợp.

## Định dạng
WAV PCM 16-bit / 48 kHz / mono. Đỉnh tín hiệu tối đa dưới -2 dBFS.
Âm thanh gốc được tổng hợp bằng script đi kèm, không dùng sample bên ngoài.
manifest.json liệt kê ID, đường dẫn, thời lượng và event đề xuất.

## Gắn vào combat
- Âm vung kiếm/phóng chiêu phát khi animation bắt đầu hành động tương ứng.
- hit_1..3 chỉ phát khi xác nhận hit; random một biến thể, pitch 0.96–1.04.
- Không phát hit trên mỗi frame hoặc particle. Dùng attack instance + target + hit index để chống trùng.
- Bleed apply phát một lần khi áp hiệu ứng; bleed explode phát đúng lúc nổ kết thúc.
- Thunder R phát thunder_r_strike cho từng tia thực tế, không lồng sẵn nhịp tia.
- Mox R tách grab/slam; barrage_shot phát từng viên theo nhịp animation thực tế.
- Cylast ice_shatter chỉ phát khi băng thực sự bị phá. Rain hit giới hạn 1 lần mỗi 100 ms cho mỗi nguồn.
- Combo 5/10/15 chỉ phát một lần lúc vượt ngưỡng; reset cờ khi combo kết thúc.
- scene_transition dài 0.6 giây, dùng với chuyển cảnh fade hiện tại.
- Không đổi damage, hit timing, cooldown hoặc combo logic để khớp file âm thanh.

## Phát âm trên web/mobile
Mở khóa AudioContext từ thao tác chạm đầu tiên; preload + decode audio một lần.
Dùng master gain và compressor; giới hạn 16 voice, ưu tiên KO/ultimate và loại voice ưu tiên thấp khi đầy.
Âm combat đặt pan theo vị trí tương đối trên màn hình; UI ở giữa. Không để nhiều tầng hit cùng peak.
Gain trong manifest là điểm bắt đầu; cân lại trong trận thực tế. Âm rain/lifesteal nên nhỏ hơn đòn chính.
Pause/menu cần dừng hoặc fade các voice còn lại; tránh phát lại hit từ rollback/replay mạng.

## Nội dung

### UI
- `ui_hover` — Rê nút
- `ui_confirm` — Xác nhận
- `ui_back` — Quay lại
- `scene_transition` — Chuyển cảnh

### Combat
- `round_start` — Bắt đầu trận
- `jump` — Nhảy
- `land` — Tiếp đất
- `hit_1` — Đánh trúng 1
- `hit_2` — Đánh trúng 2
- `hit_3` — Đánh trúng 3
- `block` — Đỡ đòn
- `special_cancel` — Special Cancel
- `combo_5` — COMBO 5 hit
- `combo_10` — COMBO 10 hit
- `combo_15` — COMBO 15 hit
- `ko` — K.O.
- `victory` — Chiến thắng

### Soulblade
- `soulblade_slash_1` — Chém thường 1
- `soulblade_slash_2` — Chém thường 2
- `soulblade_slash_3` — Chém thường 3
- `soulblade_q_spin` — Q · Xoáy kiếm
- `soulblade_w_throw` — W · Phi kiếm
- `soulblade_w_blink` — W · Dịch chuyển chém
- `soulblade_e_mist` — E · Hóa sương
- `soulblade_r_cast` — R · Khởi chiêu
- `soulblade_bleed_apply` — Áp xuất huyết
- `soulblade_bleed_explode` — Xuất huyết phát nổ

### Thunder Stance
- `thunder_normal` — Đánh thường · Sét
- `thunder_q_bolt` — Q · Phóng sét
- `thunder_w_orb` — W · Tung cầu sét
- `thunder_w_stomp` — W · Giậm điện
- `thunder_e_teleport` — E · Lướt sét
- `thunder_r_strike` — R · Sét giáng (mỗi tia)

### Mox
- `mox_melee` — Đánh cận chiến
- `mox_shot` — Đạn đánh xa
- `mox_bullet_hit` — Đạn trúng · Tia lửa
- `mox_transform` — Đổi dạng
- `mox_r_grab` — R cận chiến · Bắt mục tiêu
- `mox_r_slam` — R cận chiến · Nện đất
- `mox_r_barrage_shot` — R đánh xa · Mỗi phát đạn

### Cylast
- `cylast_normal` — Đánh thường · Phép băng
- `cylast_q_freeze` — Q · Đóng băng
- `cylast_ice_shatter` — Đòn thường · Phá băng
- `cylast_w_rain_cast` — W · Triệu mưa băng
- `cylast_w_rain_hit` — W · Băng rơi trúng
- `cylast_e_cast` — E · Sương phép
- `cylast_r_storm` — R · Bão tại vị trí cast
- `cylast_lifesteal` — R · Sương hút máu
