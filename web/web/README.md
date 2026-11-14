# Saga Fight 6.22 — Rollback hai chiều

Bộ mã nguồn đầy đủ cho GitHub và Render. Không cần dịch vụ TURN.

## Cập nhật lên Render đang có

1. Giải nén ZIP. Đưa **toàn bộ nội dung bên trong** lên thư mục gốc repository GitHub đang kết nối với Render. Giữ đúng các thư mục `web`, `scripts`, `worker`, `tests`. Đừng chỉ tải `server.mjs` hoặc `game.js`.
2. Commit thay đổi lên nhánh `main`.
3. Render → service `saga-fight` → Settings: Root Directory để trống nếu `package.json` ở gốc; Build Command `npm ci`; Start Command `npm start`. Runtime Node 24. Giữ loại **Web Service**.
4. Render → Manual Deploy → Deploy latest commit. Chờ trạng thái **Live**.
5. Hai máy đóng tab game cũ, mở lại cùng URL. Phải thấy **BUILD 6.22 · ROLLBACK · DIRECT + WS**. Nếu còn bản cũ, tải lại bỏ cache hoặc xóa dữ liệu website. Tạo phòng mới; phòng/phiên của bản cũ không dùng chung với bản này.
6. Không cần các biến `CLOUDFLARE_TURN_KEY_ID` và `CLOUDFLARE_TURN_API_TOKEN`.

Nếu tạo service mới bằng Blueprint, dùng `render.yaml` có sẵn. Service dùng một instance; room/socket nằm trong bộ nhớ instance, khởi động lại service sẽ ngắt các phòng đang chơi.

## Những gì đã thay đổi

- Cả P1 và P2 mô phỏng **toàn trận ở 120 tick/giây**. Cùng đệm input 2 tick (~16,7 ms); chủ phòng không còn xử lý điều khiển tại chỗ sớm hơn guest theo kiến trúc cũ.
- Input có tick, movement và action; nhận muộn sẽ khôi phục trạng thái rồi chạy lại **cả hai chiến binh**, bao gồm sát thương, hitbox, đạn, cooldown, combo, khống chế, grab và trạng thái hiệp.
- Checkpoint giữ liên kết giữa đối tượng, như đòn đánh và các viên đạn dùng chung một mã/use. Khôi phục cả prototype của Mox. Chuẩn hóa sai số số thực nhỏ mỗi tick; kiểm tra checksum định kỳ để phát hiện lệch trạng thái.
- Âm thanh và thông báo kết quả được phát từ tick đã xác nhận, tránh phát lại âm thanh hoặc công bố thắng thua theo dự đoán sai. Hiệu ứng hình ảnh được tính lại cùng trạng thái. Bù vị trí nhỏ chỉ áp dụng lên hình vẽ, không sửa hitbox; khi dính đòn hoặc bị bắt giữ thì chỉnh ngay về trạng thái đúng.
- Lịch sử đã xác nhận giữ tối đa 180 tick cũ; dự đoán đi trước input/ACK tối đa 48 tick (~400 ms). Khi thiếu input quá lâu, game chờ thay vì tiếp tục chạy sai vô hạn.
- Khi chung mạng và trình duyệt cho phép, thử DIRECT bằng WebRTC host candidates. Không có STUN/TURN; DIRECT không được bảo đảm trên mọi Wi-Fi. Khi không kết nối trực tiếp được, dùng WebSocket qua Render.
- Khi DIRECT hỏng hoặc WebSocket kết nối lại, hai bên khởi tạo epoch mới từ checkpoint đã xác nhận. Checksum lệch cũng yêu cầu đồng bộ lại từ chủ phòng.

## Chạy trên máy tính

Cài Node.js 24, chạy:

```sh
npm ci
npm start
```

Mở `http://localhost:3000` nếu không đặt `PORT` khác. Để chạy kiểm thử, cài cả dependency phát triển bằng `npm ci --include=dev`, rồi chạy `npm test` (đã kiểm tra trên Linux/Node 24).

## Kiểm tra sau cập nhật

- `/healthz` phải trả về `build: "6.22-rollback1"`.
- Cả hai máy phải thấy cùng BUILD 6.22 và badge `ROLLBACK`, đường truyền `DIRECT` hoặc `SERVER WS`, ping P1/P2 thực tế.
- Chung Wi-Fi: thử cả hai vai trò chủ phòng/tham gia; di chuyển, nhảy, đánh thường, Q/W/E/R, đổi dạng Mox, bắt giữ, đóng băng, pause/resume, sang hiệp mới.
- Giữ màn hình và tab game hoạt động khi đấu. Tab nền có thể bị trình duyệt dừng mô phỏng.
- Thông tin đo nằm ở `window.riftNet.metrics()`; trường `rollback` có tick hiện tại, tick xác nhận, số lần/tick đã replay và số lần chờ input.

## Phạm vi kiểm chứng

Xem `VALIDATION.txt` và `docs/rollback-6.22.md`. Đã chạy kiểm thử tự động với game thật trong các JavaScript context riêng, renderer canvas native và relay WebSocket local thật. WebRTC trong bài tích hợp được mô phỏng; chưa thử hai thiết bị vật lý qua mạng của bạn, chưa xác nhận tương thích bit-for-bit giữa Safari iOS và Chrome thực tế.

Rollback giảm độ trễ điều khiển cảm nhận được; không xóa ping, nghẽn Wi-Fi, thời gian truyền qua server hoặc tụt FPS. Khi đường truyền dao động mạnh vẫn có thể nhìn thấy sửa dự đoán hoặc tạm chờ. Nếu badge là SERVER WS, vị trí server vẫn ảnh hưởng độ trễ. Không có cam kết “không lag trong mọi mạng”.
