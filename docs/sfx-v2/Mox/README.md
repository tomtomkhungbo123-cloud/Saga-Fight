# Mox SFX V2 — fire, energy and massive impact

7 WAV: thay 6 file cùng ID/path/event V1, thêm 1 cue nổ R đánh xa khi trúng.
Chưa tích hợp vào game live. Mở Mox_AB_Preview.html để nghe từng âm cũ/mới.
Không sửa âm đổi dạng mox_transform hoặc âm nhân vật khác.

## Nội dung
- mox_melee: cú đấm trầm dày, đầu âm gọn, lửa bùng và cháy lách tách.
- mox_shot: sóng năng lượng có lực áp suất và đuôi vang.
- mox_bullet_hit: đạn trúng, lửa nổ ngắn.
- mox_r_grab: bắt/nhấc mục tiêu, lực ngắn gọn để dành cao trào cho cú nện.
- mox_r_slam: tiếng nổ điện ảnh cực lớn khi đáp đất, shockwave trầm, dư âm cuộn,
  lửa và mảnh vỡ. Dài gần 5 giây. Mang cảm giác đại chấn theo yêu cầu, không phải
  bản ghi âm hay mô phỏng vật lý chính xác của một vụ nổ hạt nhân.
- mox_r_barrage_shot: từng phát pháo năng lượng, thân âm nặng, đuôi ngắn để giữ nhịp.
- mox_r_barrage_hit (MỚI): vụ nổ riêng khi đạn ulti thực sự trúng mục tiêu.

## Tích hợp vào Saga hiện tại
1. manifest.json là PATCH: merge 7 entry theo id, không thay manifest toàn game.
2. Thay 6 file cũ đúng tên hoặc thay buffer/base64 nhúng; thêm file R hit mới.
   Không thay combat, damage, cooldown, tốc độ đạn hoặc timing animation.
3. mox_melee tiếp tục dùng event mox.melee.cast theo V1: tiếng đấm vung/lửa.
   Cue hit-confirm đang có chỉ phát trên hit hợp lệ; không tính một âm thành damage.
4. mox_shot phát khi phóng sóng. mox_bullet_hit chỉ khi va chạm thực tế.
5. R đánh xa: barrage_shot phát từng viên lúc phóng, không phát ở mỗi frame.
   Gắn barrage_hit vào hit-confirm của đạn R bằng attack instance + target + hit index.
   Khi dùng cue R hit mới, tránh chồng thêm mox_bullet_hit trên cùng sự kiện.
   Giới hạn 3 voice R hit và khoảng cách tối thiểu 80 ms cho mỗi người cast;
   throttle chỉ tác động âm thanh, không bỏ hit damage/COMBO.
6. R cận chiến: r_grab khi bắt, r_slam MỘT lần đúng lúc đáp đất/va chạm đất,
   không phát lúc nhảy, lộn người, ở mỗi target hoặc mỗi particle nổ.
   Ưu tiên cao, tối đa 2 voice slam cho hai người chơi. Fade voice cũ nếu phải thay.
7. Đuôi vang dài được render sẵn trong WAV. Không tạo reverb real-time mới hoặc
   thêm convolver trên từng đòn. Preload/decode một lần; tái sử dụng audio manager.
8. Giữ master mute/volume/unlock iOS; dùng compressor/voice limit sẵn có.
   gain trong manifest chỉ là mức bắt đầu, cần cân trong trận khi spam nhiều viên.
9. Scene reset/thoát trận phải fade các voice còn lại; đổi cache key sau cập nhật.
10. Giữ nguyên SFX Thunder/Soulblade/Cylast V2 đã áp dụng và mọi âm ngoài gói.

## Tham khảo
https://www.youtube.com/watch?v=7HHil0H17V4
Chưa truy cập được audio để đối chiếu trực tiếp. Bộ âm được tổng hợp độc lập
bằng code theo mô tả người dùng, không chứa sample video.

## Định dạng và kiểm tra
WAV PCM 16-bit / 48 kHz / mono; peak dưới -1 dBFS, fade ngắn chống click.
Đã kiểm tra format, peak, đầu/cuối, checksum, ID/path/event thay thế, JS preview và ZIP.
Chưa nghe kiểm tra trên thiết bị hay kiểm tra mix/timing trong game thực tế.
Script tái tạo cần numpy/scipy và Saga_SFX_v1 cùng Soulblade preview V2 để dựng A/B.
