# Saga Fight 6.20 — DIRECT + WebSocket dự phòng

Bản vá dành cho Saga Fight GitHub/Render 6.17–6.19 đã gửi trước đó. Mục tiêu: hai máy có thể truyền combat trực tiếp khi mạng cho phép, đặc biệt khi ở cùng Wi-Fi; dùng WebSocket Render nếu không thiết lập được DIRECT. Không dùng TURN, không cần token Cloudflare.

## 1. Cập nhật GitHub

Giải nén ZIP. Tại **gốc repository Saga-Fight** → Add file → Upload files, kéo **toàn bộ nội dung bên trong ZIP** vào, giữ đúng cấu trúc thư mục và Commit changes. Ghi đè file cùng tên; không xóa file/ảnh/âm thanh còn lại của game.

Các file chạy game cần có:

| Đường dẫn | Nội dung |
|---|---|
| package.json | Phiên bản 6.20 và ws |
| package-lock.json | Khóa thư viện |
| server.mjs | HTTP/WebSocket, health check 6.20-hybrid1 |
| scripts/relay.mjs | Xác thực, signaling trực tiếp, relay dự phòng |
| worker/index.mjs | API phòng |
| web/online.js | Chọn DIRECT hoặc WebSocket, chuyển tuyến an toàn |
| web/game.js | Dự đoán/hiển thị mượt từ bản 6.19 |
| web/index.html | BUILD 6.20 · DIRECT + WS |

Không tạo thêm thư mục cha hay đường dẫn scripts/scripts hoặc web/web.
ZIP cũng kèm hướng dẫn và kiểm thử; upload tất cả để không thiếu fixture khi chạy npm test.

## 2. Deploy Render

- Build Command: `npm ci`
- Start Command: `node server.mjs` hoặc `npm start`
- Health Check Path: `/healthz`
- Node.js 24, một instance.
- Không cần thêm hoặc thay API Token. Biến Cloudflare cũ không được dùng.
- Chọn Manual Deploy → Deploy latest commit, chờ Live.

Mở link Render + `/healthz`, phải thấy:

```json
{"ok":true,"build":"6.20-hybrid1","transport":"hybrid","turnRequired":false}
```

## 3. Chơi thử cùng Wi-Fi

1. Hai máy mở **cùng link Render**, tải lại trang để đều hiển thị **BUILD 6.20 · DIRECT + WS**.
2. Dùng cùng mạng Wi-Fi chính. Wi-Fi khách hoặc router cô lập thiết bị có thể không cho hai máy kết nối trực tiếp.
3. Tạo phòng mới rồi vào bằng máy thứ hai.
4. Game thử kết nối trực tiếp có giới hạn thời gian. Không cần bấm nút chọn tuyến.
5. Trong trận đọc badge:
   - **DIRECT**: combat đi trực tiếp qua RTCDataChannel giữa hai máy.
   - **SERVER WS**: combat đi qua Render bằng WebSocket dự phòng.
6. **P1/P2** là RTT thực tế qua đường combat đang chọn. **SERVER** là RTT riêng tới Render; SERVER có thể cao hơn ping combat khi DIRECT đang hoạt động.

Chung tên Wi-Fi không tự chứng minh hai máy có đường nội bộ thông nhau. DIRECT cũng không tự chứng minh địa chỉ hai máy nằm cùng một subnet. Bản này hiển thị DIRECT dựa trên tuyến thực sự đang dùng, không giả gắn nhãn LAN.

## 4. Cách chọn đường truyền

- Render luôn giữ WebSocket đã xác thực để tạo phòng, trao đổi SDP/candidate, điều phối chọn tuyến và làm dự phòng.
- WebRTC chỉ dùng host candidates với `iceServers: []`: không gọi STUN hoặc TURN bên ngoài. Dùng kênh ordered/reliable để giữ tính đúng của cơ chế chỉ gửi input mới từ bản 6.19.
- Hai máy phải thử dữ liệu hai chiều trên DataChannel. Chỉ host được quyết định tuyến, guest phải ACK cùng mã lựa chọn trước khi host bắt đầu trận.
- Nếu DIRECT không mở được trong khoảng 4 giây, game chọn WebSocket thay vì dừng với lỗi ICE. Trao đổi chọn tuyến còn phụ thuộc RTT tới Render.
- Không tự nâng từ WebSocket sang DIRECT trong lúc đánh. Việc chọn DIRECT được thực hiện khi bắt đầu phòng, tránh đổi đường truyền liên tục.
- Nếu DIRECT bị ngắt trong trận, hai máy tạm dừng; host yêu cầu chuyển sang WebSocket, chờ guest ACK, tăng epoch, xóa input cũ và gửi snapshot đầy đủ. Chỉ tiếp tục sau khi guest ACK trạng thái mới.
- Nếu WebSocket điều phối cũng bị mất, game vẫn dùng cơ chế thử kết nối lại có giới hạn. Mất mạng lâu hoặc Render restart có thể buộc tạo phòng mới.

## 5. Kiểm chứng và giới hạn

- WebSocket được kiểm tra bằng TCP/socket thật trên máy kiểm thử.
- WebRTC được kiểm thử bằng RTCPeerConnection/DataChannel mô phỏng: SDP, candidate đến trước remote description, probe hai chiều, chọn tuyến/ACK, combat bỏ qua relay và chuyển lại WebSocket không mất HP hoặc lặp kỹ năng.
- Chưa thử UDP WebRTC trên hai thiết bị thật, Safari/iOS thật hoặc router Wi-Fi của người dùng. Không tuyên bố ping thực tế đã giảm trước khi cập nhật và đo.
- Nếu router/trình duyệt chặn DIRECT, game vẫn phải dùng SERVER WS và chịu RTT của tuyến đó. Không đảm bảo chung Wi-Fi luôn chọn được DIRECT.
- Không giảm chất lượng nhân vật, thay damage/cooldown hoặc thay luật combat. Giữ các tối ưu băng thông và render từ 6.19.
- Render và kết nối Internet vẫn cần cho tạo phòng và điều phối. Đây chưa phải chế độ LAN hoàn toàn offline.
- Một instance; redeploy/restart có thể kết thúc phòng đang chơi. Giới hạn tài nguyên/băng thông Render vẫn áp dụng cho đường server.

## 6. Nếu vẫn trễ

Gửi ảnh badge **DIRECT/SERVER WS**, **P1/P2/SERVER**, **FPS** trên cả hai máy, cùng model thiết bị. Không gửi API token hoặc ảnh biến bí mật. Nếu FPS thấp dù ping DIRECT thấp, cần kiểm tra hiệu năng render riêng.

Tài liệu: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event và https://render.com/docs/websocket
