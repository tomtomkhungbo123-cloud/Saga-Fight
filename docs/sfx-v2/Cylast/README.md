# Cylast SFX V2 — đóng băng, mưa băng và bão tuyết

Gói vá 5 WAV: 3 file thay thế và 2 loop mới. Chưa tích hợp vào game live.
Mở Cylast_Preview.html để nghe Q cũ/mới, W/R theo demo 3/6/10 giây và thử hủy chiêu.
Thời gian demo không phải thời lượng kỹ năng thực tế.

## File thay thế (giữ ID, đường dẫn và event V1)
- cylast_q_freeze: đóng băng với đuôi vang khuếch tán dài khoảng 2.5 giây.
- cylast_w_rain_cast: tiếng khởi mưa băng.
- cylast_r_storm: tiếng bão tuyết bùng lên khi cast.

## File thêm mới, phải gắn vào lifecycle chiêu
- cylast_w_rain_loop: pha lê long lanh, duy trì liên tục khi vùng mưa băng tồn tại.
- cylast_r_storm_loop: gió bão mạnh và hạt băng cuộn, duy trì khi vùng Skill 4 tồn tại.
Hai WAV loop dài 4 giây, đã dựng tuần hoàn và kiểm tra bước nối mẫu.
Không fade đầu/cuối WAV loop. Game dùng AudioBufferSourceNode.loop=true, ramp gain
80 ms khi vào, fade 120 ms khi hết/hủy. Khi biết thời điểm kết thúc, fade TRƯỚC mốc đó
để âm hết đúng mốc. Khi bị hủy bất ngờ, fade nhanh sau event hủy.

## Tích hợp vào Saga hiện tại
1. manifest.json là PATCH, chỉ merge 5 sounds theo id, không ghi đè toàn manifest game.
2. Thay đúng 3 WAV cùng tên hoặc dữ liệu base64/buffer nhúng. Thêm 2 loop mới.
   Chỉ chép WAV thay thế sẽ không đủ để duy trì W/R đến hết chiêu.
3. Khi skill instance tạo vùng ảnh hưởng, phát cast MỘT lần rồi khởi loop MỘT lần.
   Nếu code đã gọi cast cue thì không gọi thêm lần nữa qua helper.
4. Lấy thời điểm kết thúc từ vòng đời vùng kỹ năng thực tế, KHÔNG dùng thời gian trói
   chân 1.5 giây của Skill 4 làm thời lượng bão. Không đặt cứng 4 giây theo độ dài file.
5. Dừng/fade cả loop và cast tail khi vùng kết thúc, bị xóa/hủy, reset round, thoát menu
   hay scene teardown. Nếu vùng vẫn tồn tại sau khi người cast bị đánh trúng/chết thì
   giữ âm theo vùng đó; không tự suy diễn dừng dựa trên trạng thái nhân vật.
6. Mỗi loop quản lý theo skill instance ID để hỗ trợ hai Cylast. Chống phát trùng khi
   replay/rollback hoặc packet mạng lặp; không start loop ở mỗi hit/tick/frame/particle.
7. Giữ audio context, master volume/mute, unlock iOS và pan hiện có. Không decode WAV
   trong game loop. Không phát lại loop khi master đang mute; chỉ thay master gain.
8. cylast_w_rain_hit tiếp tục là cue xác nhận hit nhỏ riêng; không phát một hit cue cho
   từng giọt hình ảnh. Các âm normal/e/ice_shatter/lifesteal giữ nguyên.
9. Kiểm tra W/R ngắn và dài hơn 4 giây, hủy sớm, hai vùng đồng thời và thoát trận.
   Bật global compressor/voice budget đã có để mix bão không lấn hết âm combat.
10. Giữ nguyên damage, cooldown, radius, root duration và combat/COMBO hiện tại.

## Helper gắn lifecycle
CylastSFX.mjs là adapter tham khảo, không tự tìm event của game.
Truyền AudioContext đang unlock, output master/mute và Map id -> AudioBuffer đã decode.
const sfx = new CylastSFX(existingContext, existingMasterGain, decodedBuffers);
sfx.freeze();
sfx.start(skillInstanceId, 'w'); // hoặc 'r'; tự gọi stop theo lifecycle
sfx.stop(skillInstanceId);
sfx.stopAll(); // khi reset/scene teardown
Nếu đã biết end time theo AudioContext: start(id, 'r', contextEndTime).
Đổi clock game/pausable clock sang audio clock cẩn thận; pause context hoặc dừng/khởi
lại âm theo hệ thống pause hiện có, không để thời gian audio chạy vượt game.
Nếu game có audio manager tương đương, tái sử dụng manager đó và chỉ áp lifecycle này.

## Nguồn tham khảo
https://www.youtube.com/watch?v=8e_B4gHCSHk
Metadata: [Free Skill Sound Effect / Boreas] Original Character Sounds - WAVy,
WAVy_Sound. Chưa truy cập được audio để đối chiếu trực tiếp. Các WAV được tổng hợp
bằng code theo mô tả người dùng, không chứa sample từ video.

## Kiểm tra
PCM 16-bit / 48 kHz / mono. Đã kiểm tra format, peak, checksum, điểm nối loop, ZIP
và lifecycle adapter bằng mock AudioContext. Chưa nghe kiểm tra trên thiết bị hay
kiểm tra mix trong game live. validation.json ghi kết quả đo file.
Scripts tạo âm và đóng gói được kèm theo để tái tạo.
