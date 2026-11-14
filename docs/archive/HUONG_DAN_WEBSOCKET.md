# Saga Fight 6.18 — PvP Online qua Render WebSocket

Bản cập nhật dành cho game Saga Fight 6.17 đang chạy trên Render. Không cần Cloudflare, TURN, STUN hoặc WebRTC.
Giữ nguyên bộ nhân vật, visual, sát thương, kỹ năng, AI và cơ chế dự đoán chuyển động hiện có.

## Cập nhật GitHub — quan trọng

1. Giải nén ZIP trên máy tính.
2. Mở **gốc repository Saga-Fight** trên GitHub, chọn Add file → Upload files.
3. Kéo **nội dung bên trong ZIP**, gồm các file ở gốc và các thư mục `scripts`, `worker`, `web` vào trang upload. Không upload nguyên ZIP và không tạo thêm thư mục cha.
4. Bấm Commit changes. Việc upload cập nhật các file trùng tên, giữ nguyên những file game cũ khác. Không xóa thư mục web hiện có.

Kiểm tra đủ 7 đường dẫn sau sau khi commit:

| Đường dẫn | Vai trò |
|---|---|
| `package.json` | Khai báo thư viện WebSocket |
| `package-lock.json` | Khóa phiên bản để npm ci cài đúng |
| `server.mjs` | HTTP và WebSocket trên cùng cổng Render |
| `scripts/relay.mjs` | Server relay; đây là file mới, bắt buộc có |
| `worker/index.mjs` | API tạo/vào/đóng phòng |
| `web/online.js` | Kết nối WebSocket và khôi phục trận |
| `web/index.html` | Nhãn BUILD 6.18 · ONLINE WS |

Không đặt file mới thành `scripts/scripts/relay.mjs` hoặc `web/web/online.js`.
Không upload node_modules; Render cài ws bằng npm ci.

## Cài đặt Render

Giữ service Web Service hiện có, khu vực Singapore, một instance:

| Mục | Giá trị |
|---|---|
| Build Command | `npm ci` |
| Start Command | `node server.mjs` hoặc `npm start` |
| Health Check Path | `/healthz` |
| NODE_VERSION | `24` |
| Root Directory | Để trống nếu package.json ở gốc repository |

Không cần API Token, không thêm cổng WebSocket riêng. Có thể xóa các biến CLOUDFLARE_TURN_KEY_ID, CLOUDFLARE_TURN_API_TOKEN, TURN_RELAY_ONLY; nếu giữ, bản mới cũng không đọc hay gọi chúng.
Chọn Manual Deploy → Deploy latest commit và chờ Live. Sau khi deploy, phòng của phiên bản cũ cần được tạo lại.

## Kiểm tra đúng bản

Mở link Render + `/healthz`, kết quả phải có:

```json
{"ok":true,"build":"6.18-ws1","transport":"websocket","turnRequired":false}
```

Hai máy mở cùng link Render, tải lại trang. Menu phải có **BUILD 6.18 · ONLINE WS**.
Một máy tạo phòng, máy còn lại nhập mã. Trong trận badge hiển thị **SERVER WS** cùng ping đo thực tế.
Ping là RTT từ máy qua relay tới đối thủ và quay lại; không phải ping riêng đến Render.

Không có bước tạo Cloudflare TURN hoặc kiểm tra ICE nữa. Nếu còn thấy lỗi ICE/DataChannel hoặc lỗi API Token, ít nhất một máy hoặc bản server vẫn chưa nhận đủ file mới.

## Cách hoạt động và giới hạn

- Hai máy kết nối WSS tới `/ws` trên cùng domain Render. Server chỉ chuyển tiếp giữa hai thành viên đã xác thực trong cùng phòng. Room token gửi trong frame xác thực, không đưa vào URL.
- Host vẫn quyết định combat, sát thương, HP và kết quả. Guest giữ dự đoán di chuyển và hòa giải với snapshot host; đây chưa phải server authoritative chống gian lận từ host.
- Giữ mô phỏng 120 Hz, truyền dữ liệu tối đa khoảng 60 Hz. Snapshot delta, ACK, heartbeat và giới hạn buffer được giữ. Server giới hạn payload 85 KB và số message; cắt kết nối chậm thay vì xếp hàng vô hạn.
- Mất kết nối ngắn: tạm dừng, thử lại với backoff, xóa lệnh cũ và đồng bộ snapshot/epoch trước khi tiếp tục. Sau khoảng 15 giây không khôi phục được, trở về menu với hướng dẫn tạo phòng mới.
- WebSocket dùng TCP. Khi mạng mất gói, có thể tăng trễ do truyền lại; chuyển sang WebSocket không đảm bảo mọi mạng mượt hoặc không bao giờ mất kết nối.
- Chỉ dùng một instance. Các socket/phòng relay nằm trong bộ nhớ instance, DB SQLite mặc định nằm trên ổ tạm. Redeploy/restart có thể kết thúc phòng, cần tạo mới.
- Mọi dữ liệu trận đấu đi qua Render, tiêu thụ tài nguyên và băng thông Render. Gói Free vẫn có giới hạn và có thể ngủ khi không hoạt động; việc bỏ TURN không đồng nghĩa host miễn phí vô hạn.
- Chưa triển khai vào tài khoản GitHub/Render của người dùng và chưa đo trên hai thiết bị thật khác mạng. Cần thử thực tế sau khi cập nhật.

## Nếu deploy lỗi

- Cannot find package `ws`: kiểm tra đã cập nhật cả package.json và package-lock.json; Build Command phải là npm ci.
- Cannot find module scripts/relay.mjs: upload file này vào đúng thư mục scripts ở gốc repository.
- Healthz vẫn là 6.17/6.17-turn1: chưa deploy commit mới hoặc đang mở nhầm link service.
- Healthz đúng nhưng menu cũ: kiểm tra web/index.html và web/online.js đã được ghi đè, tải lại cả hai máy.
- WebSocket kết nối thất bại: kiểm tra service đang Live, cả hai máy cùng URL, Node.js server đang chạy. Gửi log/ảnh lỗi đã che token; không gửi API token Cloudflare.

Tài liệu Render: https://render.com/docs/websocket
