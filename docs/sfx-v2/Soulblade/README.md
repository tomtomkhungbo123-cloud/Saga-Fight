# Soulblade SFX — bản sửa V2

Gói vá 8 WAV cho Soulblade. Giữ nguyên ID/tên file/event V1.
Chưa tích hợp vào game live. Không thay âm Thunder Stance, Mox, Cylast hay UI.
Mở Soulblade_AB_Preview.html để nghe A/B; V1 chỉ nhúng trong bảng nghe thử.

## Âm mới
- slash_1/2/3: vệt kiếm sắc, thân âm thấp dày hơn; đòn thứ ba nặng hơn.
- q_spin: các nhịp xoáy kiếm dày và rõ, giữ nhịp 85 ms của file cũ.
- w_throw: phi kiếm có lực gió, giảm tiếng ngân mỏng.
- w_blink: sóng âm nén rồi bung, có đuôi cộng hưởng và nhát chém theo sau.
- r_cast: tiếng thét chiến đấu tổng hợp, khởi âm nhanh, khàn và dữ.
- bleed_explode: tiếng nổ dày, kiếm xé và lớp thét trầm ở hậu âm.
Các file e_mist và bleed_apply không thuộc phạm vi sửa, tiếp tục dùng bản hiện tại.

## Tham khảo
https://www.youtube.com/watch?v=pHcN41tAnHY
Đã mở được metadata: Assassin's Creed - Hidden Blade Sound (Original Version),
HeGe - Sound FX and UST. Chưa truy cập được audio để đối chiếu trực tiếp.
Các âm trong gói được tổng hợp độc lập theo mô tả người dùng, không chứa sample video.
Tiếng thét là âm tổng hợp bằng glottal source + formant + noise; không phải giọng thu.

## Cập nhật game hiện tại
1. Tìm đúng asset/buffer mà audio manager đang dùng. Thay 8 WAV cùng tên trong wav/.
2. manifest.json là PATCH: chỉ merge 8 entry theo id, không ghi đè manifest toàn game.
3. Giữ nguyên các SFX ngoài patch, bao gồm Thunder Stance V2 nếu đã cập nhật.
4. Nếu đang dùng base64 hay bundle nhúng, phải thay dữ liệu âm tương ứng và đổi cache key.
5. R cast phát một lần khi bắt đầu cast; bleed explode chỉ phát lúc nổ kết thúc xuất huyết.
   Không phát lại tiếng thét trên mỗi hit, tầng bleed, frame, particle hoặc packet mạng.
6. W blink đã chứa cả sóng âm và nhát chém; tránh chồng thêm cue slash vào cùng hành động.
   Giữ timing gameplay thực tế; nếu cần tách cue theo animation, tách audio tại điểm phù hợp.
7. Không thay damage, cooldown, combo hay thời điểm hit để khớp âm.
8. Giữ mute/master volume/unlock iOS hiện có. Gain trong manifest là mức khởi đầu,
   cần kiểm tra mix khi hai người tung chiêu; dùng master compressor và voice limit.
9. Không gắn chồng ba slash vào cùng một lần vung kiếm; chọn đúng N1/N2/N3.

## Định dạng và kiểm tra
WAV PCM 16-bit / 48 kHz / mono; peak dưới -1 dBFS; fade ngắn chống click.
Đã kiểm tra format, không clip, đầu/cuối, checksum, đường dẫn/ID/event và ZIP.
Chưa đánh giá nghe trên thiết bị hay kiểm tra mix trong game thực tế.
Script tái tạo cần numpy/scipy, thư mục Saga_SFX_v1 và preview Thunder V2 để dựng A/B.
