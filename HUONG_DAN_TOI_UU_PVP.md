# Saga Fight 6.19 — tối ưu PvP WebSocket

Bản vá cho gói game GitHub/Render 6.17 hoặc 6.18 đã gửi trước đó. Không cần TURN hoặc API Token Cloudflare.

## 1. Cập nhật

Giải nén ZIP, upload **toàn bộ nội dung bên trong** vào **gốc repository Saga-Fight** trên GitHub và Commit changes. Giữ đúng cấu trúc thư mục, ghi đè file trùng tên, không xóa assets/game cũ và không thêm thư mục cha.

Các file chạy game cần có:

| Đường dẫn | Thay đổi |
|---|---|
| package.json | Phiên bản 6.19, thư viện ws |
| package-lock.json | Khóa thư viện cho npm ci |
| server.mjs | Server và health check 6.19-ws2 |
| scripts/relay.mjs | Relay WebSocket, giới hạn snapshot chờ, đo RTT server |
| worker/index.mjs | API phòng, không cần TURN |
| web/online.js | Input mới, nén hướng di chuyển, điều tiết snapshot |
| web/game.js | Làm mượt phần hiển thị đối thủ và đạn trên guest |
| web/index.html | BUILD 6.19 · ONLINE WS và phiên bản script mới |

ZIP cũng kèm kiểm thử và hướng dẫn; upload tất cả để không thiếu phụ thuộc.

## 2. Render

- Build Command: `npm ci`
- Start Command: `node server.mjs` hoặc `npm start`
- Health Check Path: `/healthz`
- Node: 24
- Một instance duy nhất.
- Manual Deploy → Deploy latest commit, chờ Live.
- Không cần biến Cloudflare/TURN; các biến cũ nếu còn sẽ không được sử dụng.

Mở link Render + `/healthz`, phải có:

```json
{"ok":true,"build":"6.19-ws2","transport":"websocket","turnRequired":false}
```

Cả hai máy tải lại cùng link Render, thấy BUILD 6.19 · ONLINE WS rồi tạo phòng mới. Không dùng chung phòng với bản cũ.

## 3. Cải tiến

- Trên WebSocket, chỉ gửi frame input và lệnh mới, không gửi lại toàn bộ lịch sử chưa ACK trên mỗi tick. Lịch sử vẫn giữ ở guest cho dự đoán/hòa giải cho tới khi host ACK.
- Các frame liên tiếp cùng hướng được gom thành run. Đổi hướng hoặc bấm chiêu vẫn gửi ngay, không chờ chu kỳ định kỳ.
- Snapshot tối đa khoảng 30 Hz; khoảng 20 Hz khi RTT cao, 15 Hz khi buffer bắt đầu nghẽn. Mô phỏng combat vẫn 120 Hz; không giảm tốc độ nhân vật hoặc nhịp mô phỏng.
- Hạn chế xếp hàng snapshot, ưu tiên dữ liệu mới. Bỏ bớt bước di chuyển đã cũ khi host nhận một lô trễ, không bỏ lệnh đánh/nhảy/kỹ năng và không chạy nhanh physics để bù.
- Kéo giãn khoảng polling HTTP phòng khi WebSocket đã vào trận, giảm tác vụ không cần thiết trên Render.
- Host/guest vẫn có heartbeat, tạm dừng và epoch/snapshot để khôi phục. Ngưỡng phát hiện nghẽn có tính đến RTT/jitter; không giả ping thấp hoặc bỏ kiểm tra mất đồng bộ.
- Vị trí hiển thị đối thủ được làm mượt riêng khỏi trạng thái authoritative. Đạn trên guest có ngoại suy hiển thị tối đa 75 ms giữa snapshot; không tự tính damage phía guest.

## 4. Đọc ping để xác định vấn đề còn lại

- **P1/P2**: RTT đo qua relay tới đối thủ và quay về. Đây là độ trễ đường đi đầy đủ.
- **SERVER**: RTT trực tiếp từ thiết bị hiện tại tới server Render và quay về. Chỉ báo này không phải ping của đối thủ.
- Nếu SERVER thấp nhưng P1/P2 cao: cần so sánh SERVER của máy còn lại, tải thiết bị và tình trạng đường truyền của bên đó.
- Nếu SERVER cũng cao trên cả hai máy: kiểm tra Region của service trên Render. Với người chơi Việt Nam, Singapore là khu vực cần thử; vị trí gần không bảo đảm tuyến mạng tốt nhất.
- Không cần gửi token khi chụp ảnh ping. Nếu vẫn không chơi được, gửi ảnh badge P1/P2/SERVER của cả hai máy và mục Region trong Render.

Render không đổi được region cho một service đã tạo theo tài liệu hiện tại; nếu service nằm ở khu vực khác, cần tạo service mới ở Singapore và deploy cùng repository. Không xóa service cũ trước khi kiểm tra service mới.

## 5. Giới hạn kiểm chứng

- Các số đo băng thông trong báo cáo đi kèm là mô phỏng JSON payload, chưa tính đầy đủ TCP/TLS và băng thông thực tế trên Internet.
- Hạ lượng dữ liệu và hàng đợi có thể giảm trễ do nghẽn; không thể làm biến mất RTT đường truyền, TCP retransmission hoặc khoảng cách tới server.
- Chưa deploy vào GitHub/Render của người dùng, chưa thử hai thiết bị thật khác mạng. Không tuyên bố ping thực tế đã giảm trước khi người dùng cập nhật và đo.
- Gói Free của Render có giới hạn tài nguyên/băng thông. Khi host quá tải hoặc đường mạng không phù hợp, cần kiểm tra số đo trước khi quyết định nâng gói hay đổi hạ tầng.
- Một instance. Redeploy/restart có thể kết thúc các phòng hiện có và cần tạo lại.

Tài liệu Render: https://render.com/docs/websocket và https://render.com/docs/regions
