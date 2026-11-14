# Saga Fight 6.21 — sửa dự đoán và replay input của guest

Bản vá dành cho gói GitHub/Render đã gửi trước đó. Giữ đường DIRECT + WebSocket dự phòng từ 6.20, không cần TURN.

## Đã sửa gì

Guest trước đây cập nhật nhân vật bằng một hàm rút gọn khác host: thiếu một số chuyển động kỹ năng, cooldown và tiến trình trạng thái. Khi phát lại input sau snapshot, clock mô phỏng cũng không tăng đúng từng bước. Điều này tạo sai khác để host sửa lại dù mạng có ping thấp.

Bản 6.21:

- Guest phục hồi từ snapshot authoritative rồi replay các input chưa ACK bằng cùng hàm updateFighter của host, ở bước 1/120 giây.
- Replay có clock riêng; clock, projectile thật, VFX thật, camera, sound và HP của trận không bị phát lại hoặc sửa bởi phần dự đoán. Các phép mô phỏng thực hiện trên bản sao nhân vật.
- Dự đoán vẫn không tự xác nhận damage, kết quả, grab hoặc heal. Những phần này chờ host.
- Giữ cache pose trình bày của nhân vật guest qua snapshot thay vì tạo lại toàn bộ.
- History prediction giới hạn 240 frame. Sai khác nhỏ được sửa ở phần hiển thị; không nội suy qua các thay đổi bắt/đánh trúng/chết.
- DIRECT không nghẽn có mục tiêu khoảng 60 snapshot/input batch mỗi giây. Scheduler dùng deadline tích lũy để tránh bị giảm nhịp do setInterval làm tròn thời gian. WebSocket vẫn điều tiết theo RTT/buffer.
- Thêm số đo prediction/replay trong window.riftNet.metrics() để phân biệt lỗi sửa dự đoán với lỗi mạng.

Đây là **client-side rollback/replay input cho nhân vật guest**, chưa phải full rollback combat hoặc mô phỏng toàn bộ trận đấu ở cả hai máy. Không dự đoán sát thương của đối thủ rồi hoàn tác. Host vẫn quyết định combat.

## Cập nhật GitHub và Render

1. Giải nén ZIP.
2. Ở gốc repository Saga-Fight → Add file → Upload files, upload **toàn bộ nội dung bên trong ZIP**, giữ nguyên cấu trúc thư mục, ghi đè file trùng tên rồi Commit changes.
3. Không xóa assets hoặc file game khác; không tạo thêm thư mục cha, web/web hay scripts/scripts.
4. Render giữ Build Command `npm ci`, Start Command `node server.mjs` hoặc `npm start`, Node.js 24, một instance, Health Check `/healthz`.
5. Chọn Deploy latest commit, chờ Live.
6. Hai máy tải lại cùng URL; phải thấy **BUILD 6.21 · DIRECT + WS** rồi tạo phòng mới.

Các đường dẫn chính cần cập nhật:

| File | Vai trò |
|---|---|
| package.json, package-lock.json | Phiên bản và thư viện |
| server.mjs | Health check mới |
| scripts/relay.mjs | Protocol 81 |
| worker/index.mjs | API phòng |
| web/game.js | Shared-step prediction, replay, clock, cache pose |
| web/online.js | Nhịp gửi DIRECT và metrics |
| web/index.html | Nhãn phiên bản/script |

ZIP cũng có kiểm thử và fixture để chạy npm test khi có môi trường kiểm thử tương ứng.

Health check phải có:

```json
{"ok":true,"build":"6.21-replay1","transport":"hybrid","turnRequired":false}
```

## Kiểm tra thực tế

Trên cả hai máy, xác nhận đúng 6.21 và xem badge DIRECT/SERVER WS. Khi chung Wi-Fi, chỉ DIRECT mới bỏ đường combat qua Render. Giữ tab và màn hình mở.

Cho guest thử: chạy rồi dừng, đổi hướng, nhảy hai lần, đánh thường, Melanta Q và Mox E. So sánh với host và ghi lại ping P1/P2/SERVER cùng FPS.

Nếu vẫn giật, gửi video ngắn của guest và ảnh badge/FPS của hai máy. Tụt FPS do GPU, trình duyệt hoặc thiết bị không được khắc phục chỉ bằng replay. Nếu vẫn SERVER WS, cần xác định vì sao DIRECT không mở được.

## Giới hạn kiểm chứng

- Kiểm thử shared-step chạy trên Node VM, gồm 5 nhân vật, clock/cooldown, chuyển động khi hết choáng, isolation HP/sound/VFX, bounded replay và cadence DIRECT.
- WebSocket được kiểm tra bằng socket thật trên máy kiểm thử. WebRTC/DIRECT vẫn được mô phỏng, chưa chứng minh UDP hoặc ping trên Wi-Fi thực tế.
- Chưa deploy vào GitHub/Render của người dùng, chưa thử trên iOS/Safari thật, chưa xác minh cải thiện FPS hay độ mượt trên hai thiết bị thật.
- Các số đo sai khác vị trí hoặc chi phí CPU trong báo cáo là bài kiểm tra có kiểm soát, không phải mức cải thiện ping/FPS thực tế.
- Full rollback combat cần snapshot/khôi phục toàn bộ trạng thái, input theo tick, kiểm soát RNG và side effect, cùng kiểm thử toàn bộ kỹ năng. Phạm vi đó chưa được triển khai trong bản vá này.
