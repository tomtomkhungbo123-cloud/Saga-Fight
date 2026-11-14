# Thunder Stance SFX — bản sửa V2

Gói vá chỉ chứa 6 WAV thay thế cho Thunder Stance, giữ nguyên tên file/ID/event của V1.
Không chứa hay chỉnh âm thanh nhân vật khác. Chưa tích hợp vào game live.

## Nghe thử
Mở Thunder_AB_Preview.html bằng trình duyệt. So sánh V1/V2 theo từng chiêu.
V1 chỉ được nhúng trong bảng nghe thử; 6 file trong wav/ đều là V2.

## Thay đổi âm sắc
- Bỏ tiếng rít có cao độ kiểu laser và nhịp buzz đều.
- Tạo điện phóng không đều, tiếng nứt sét đầu âm, thân nổ rộng và đuôi sấm rền.
- Đánh thường/lướt có đuôi ngắn để không chồng quá nhiều âm trong combo.
- Cầu sét giữ mức nhẹ hơn; giậm điện và sét giáng có lực nổ lớn nhất.
- R vẫn là MỘT tiếng sét cho mỗi tia thực tế; không trộn sẵn hai tia trong file.

## Tham khảo
https://www.youtube.com/watch?v=zdJ8cd93zCM
Tên video: Thunder Spell Sound Effect No Copyright — Gravity Sound.
Đã truy cập được metadata nhưng chưa truy cập được audio để đối chiếu trực tiếp.
Âm V2 được tổng hợp độc lập theo yêu cầu tăng lực và âm sắc sét; không chứa sample video.

## Tích hợp vào Saga hiện tại
1. Tìm đường dẫn asset đang được audio manager dùng; thay đúng 6 WAV có cùng tên.
2. manifest.json ở gói này là PATCH, KHÔNG ghi đè toàn bộ manifest của game.
   Chỉ merge sáu entry trong sounds theo id. Giữ nguyên event đang dùng trong code.
3. Nếu game dùng âm nhúng/base64, thay buffer/chuỗi âm tương ứng, không chỉ chép WAV.
4. Giữ nguyên master volume/mute và cơ chế unlock audio iOS hiện có.
5. gain là mức khởi đầu đề xuất: kiểm tra mix trong trận. R nên giới hạn hai voice
   chồng nhau; fade voice cũ nếu quá giới hạn, không bỏ tiếng đầu của tia mới.
6. Làm mới cache audio sau thay thế. Không đổi cooldown, damage hoặc thời điểm hit.
7. Kiểm tra N/Q/W/E/R trên loa và tai nghe; QA gain khi spam combo hoặc cả hai
   người chơi cùng tung chiêu. Các phép kiểm tra file không thay thế kiểm tra trong game.

WAV PCM 16-bit / 48 kHz / mono. Peak tối đa dưới -1 dBFS, có fade chống click.
validation.json ghi thời lượng và mức tín hiệu đo được. make_thunder_v2.py đi kèm
để tái tạo; script yêu cầu thư mục Saga_SFX_v1 gốc để tạo bảng A/B.
