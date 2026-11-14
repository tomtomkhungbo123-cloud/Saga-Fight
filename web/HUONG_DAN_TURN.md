# Saga Fight 6.17 — Cloudflare TURN patch 1

Bản vá dành cho gói GitHub/Render 6.17 đã gửi trước đó. Không đổi combat, visual nhân vật hoặc assets.

## 1. Upload bản vá lên GitHub

Giải nén ZIP. Trong thư mục gốc repository `Saga-Fight`, chọn Add file → Upload files và kéo 5 mục sau vào:

- `server.mjs` (file)
- `scripts` (thư mục, chứa turn.mjs)
- `worker` (thư mục, chứa index.mjs)
- `web` (thư mục, chứa online.js và index.html)
- `HUONG_DAN_TURN.md` (file hướng dẫn)

Commit changes. Upload cập nhật/ghi đè đúng đường dẫn; không xóa các file game cũ, không tạo thêm thư mục cha, không đặt web bên trong web.
Không cần upload API Token, không cần đổi package.json, không có thư viện mới cần cài.

## 2. Thêm hai biến trên Render

Vào service saga-fight → Environment → Add Environment Variable:

| Key | Value |
|---|---|
| CLOUDFLARE_TURN_KEY_ID | TURN Token ID / Key ID từ đúng TURN Server trên Cloudflare |
| CLOUDFLARE_TURN_API_TOKEN | API Token đi kèm TURN key đó |

Đây là token của Realtime TURN, không phải Global API Key hoặc token bất kỳ cho DNS/Workers.
Không gửi giá trị vào chat, không đưa vào GitHub, không gõ vào web/online.js.

Lưu biến và triển khai lại. Start Command giữ `node server.mjs` hoặc `npm start`.
Nếu Render đã tự deploy từ GitHub, vẫn cần deploy sau khi lưu environment để áp dụng token.

## 3. Kiểm tra

1. Chờ service Live.
2. Mở link Render + `/healthz`; build phải là `6.17-turn1`, `turnConfigured` phải là `true`.
3. `turnConfigured: true` chỉ xác nhận cả hai biến đã được nhập; chưa chứng minh token hợp lệ. Token chỉ được xác thực thực tế khi tạo kết nối phòng.
4. Cả hai máy tải lại cùng link Render. Menu hiển thị `BUILD 6.17 · TURN 1`.
5. Tạo phòng mới và vào phòng bằng máy còn lại.
6. Badge sẽ hiện DIRECT hoặc RELAY khi đã xác định tuyến thực tế. DIRECT là kết nối trực tiếp; RELAY là qua TURN. Cả hai đều có thể là kết quả đúng.

## 4. Bắt buộc TURN để kiểm tra relay

Nếu muốn chứng minh TURN hoạt động ngay cả khi hai máy kết nối trực tiếp được:

1. Thêm biến `TURN_RELAY_ONLY` với giá trị `true` trên Render, lưu và deploy.
2. Tải lại cả hai máy, tạo phòng mới. Nếu vào trận được và badge hiện RELAY, relay đã hoạt động cho lượt thử này.
3. Sau kiểm tra, xóa biến hoặc đổi thành `false`, deploy lại để cho phép lựa chọn DIRECT khi phù hợp.

## 5. Khi lỗi

- `turnConfigured: false`: thiếu một hoặc cả hai biến trên instance đang chạy, hoặc chưa deploy cấu hình mới.
- “Không lấy được TURN…”: kiểm tra TURN Key ID và API Token đi kèm, trạng thái dịch vụ/billing và kết nối từ server tới Cloudflare. Không chụp giá trị token khi gửi ảnh lỗi.
- Có token nhưng vẫn ICE disconnected: cần kiểm tra tuyến thật và mạng của hai thiết bị. Bản vá không đảm bảo mọi mạng đều kết nối được và không đảm bảo giảm RTT.
- Nếu đóng tab/khóa màn hình hoặc mất mạng kéo dài, trận có thể dừng và cần tạo phòng mới. Bản vá này chưa triển khai ICE restart tự động.
- Khi chưa cấu hình cả hai biến, game vẫn cho phép thử STUN/DIRECT như bản trước. Nếu chỉ cấu hình một biến, game báo lỗi cấu hình.

## Cách hoạt động

- `/api/rooms/ice` chỉ trả cấu hình sau khi xác thực room token của người chơi và kiểm tra cùng origin.
- API Token dài hạn nằm ở server. Server gọi API Cloudflare để tạo thông tin TURN tạm thời, hạn 2 giờ, cache riêng theo phòng/người chơi trong 10 phút.
- Game ưu tiên cho phép mọi tuyến (`all`), để ICE chọn tuyến hoạt động. TURN là lựa chọn dự phòng khi DIRECT không khả dụng; không ép tất cả trận qua relay mặc định.
- UDP và TLS/TCP 443 được giữ theo phản hồi nhà cung cấp; port 53 bị loại để tránh timeout trong trình duyệt.
- Các endpoint tạo phòng vẫn công khai như bản game gốc. Khi mở cho lượng người chơi lớn, cần bổ sung kiểm soát lạm dụng/cấp phòng và theo dõi quota dịch vụ.
- Render không chuyển tiếp combat. Combat tiếp tục dùng WebRTC, Cloudflare chỉ relay khi tuyến được chọn là RELAY.

## Kiểm chứng

Kiểm thử tự động dùng API Cloudflare giả lập: kiểm tra TTL, header xác thực chỉ ở server, không lộ API Token trong phản hồi, cache/dedupe, giới hạn phòng/token, từ chối khác origin, cấu hình relay-only và client truyền TURN vào RTCPeerConnection.
Chưa dùng token thật, chưa triển khai vào tài khoản Render của người dùng, chưa kiểm chứng hai thiết bị thật. Thành công trong mô phỏng không chứng minh TURN thực tế đã hoạt động.

Tài liệu chính thức: https://developers.cloudflare.com/realtime/turn/generate-credentials/
