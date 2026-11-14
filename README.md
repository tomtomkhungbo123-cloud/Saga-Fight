# Saga Fight 6.17 — GitHub + Render

Gói xuất từ nguồn Saga Fight Build 6.17, commit `76afb6b0bc90d8386b35e3553cb9a4edfb8999d6`.
Giữ nguyên visual, combat, PvE, PvP cùng máy, âm thanh và WebRTC PvP.
Server Node.js thay phần chạy Cloudflare/D1 bằng SQLite cho API phòng; không thay giao thức combat.

## 1. Đưa lên GitHub

1. Giải nén gói này.
2. Tạo repository GitHub, ví dụ `saga-fight` (có thể chọn Private).
3. Upload toàn bộ **nội dung trong thư mục** `saga-fight-render`, không upload nguyên ZIP.
4. Đảm bảo `package.json`, `package-lock.json`, `server.mjs` và `render.yaml` ở ngay gốc repository, cùng cấp với `web/`.
5. Không cần bật GitHub Pages: Render sẽ phục vụ cả game và API trên cùng một link HTTPS.

## 2. Triển khai Render

### Cách A — Blueprint

1. Đăng nhập https://dashboard.render.com và kết nối GitHub.
2. Chọn **New → Blueprint**, chọn repository vừa tạo.
3. Kiểm tra cấu hình: Node, Singapore, `npm ci`, `npm start`, health check `/healthz`.
4. `render.yaml` mặc định chọn **Free** để thử; xem gói và chi phí trên Render trước khi đổi sang gói trả phí.
5. Triển khai và mở URL HTTPS Render cấp.

### Cách B — Web Service thủ công

| Mục | Giá trị |
|---|---|
| Service type | Web Service, không phải Static Site |
| Runtime | Node |
| Region | Singapore |
| Root Directory | Để trống nếu package.json ở gốc |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |
| Environment | `NODE_VERSION=24`, `NODE_ENV=production` |

Không đặt PORT cố định trên Render; server dùng PORT do host cấp.
Không cần nhập URL API vào game: game gọi `/api/rooms/...` trên cùng domain.

## 3. Kiểm tra sau khi host

1. Mở `/healthz`: phải có `ok: true` và build `6.17`.
2. Hai máy mở **cùng URL Render**, tải lại để cùng phiên bản.
3. Máy 1 chọn PvP Online → tạo phòng. Máy 2 nhập mã để vào.
4. Kiểm tra badge `DIRECT` và ping thực; thử đi lại, nhảy, đánh và kết thúc hiệp trên cả hai máy.
5. Thử riêng chung Wi-Fi và khác mạng. Nếu lỗi, lưu dòng trạng thái ICE và log Render để chẩn đoán.

## 4. Giới hạn cần biết

- Combat dùng WebRTC DataChannel trực tiếp giữa hai trình duyệt. Render phục vụ game và signaling, không xử lý combat hoặc chuyển tiếp toàn bộ dữ liệu trận đấu.
- Chuyển host không đảm bảo giảm ping combat, giật hình hoặc độ trễ input. Cần đo trên hai thiết bị thật.
- Bản hiện tại chỉ có STUN, chưa có TURN dự phòng. Mạng chặn UDP, NAT hạn chế hoặc Wi-Fi cô lập thiết bị có thể không kết nối được. Khi đó cần tích hợp TURN có cấp credential phù hợp; không đặt TURN secret cố định trong mã frontend.
- Chỉ chạy **một instance**. SQLite nằm trên ổ tạm mặc định; restart/redeploy làm mất phòng hiện có, người chơi cần tạo phòng mới. Không dùng cấu hình này để scale nhiều instance.
- Free có thể ngủ sau thời gian không nhận lưu lượng; dùng gói không ngủ nếu cần mở phòng ổn định. Chọn gói trả phí là quyết định riêng trên Render.
- HTTP nhận phòng kiểm tra same-origin. Hai máy cần dùng cùng domain, không chia một máy GitHub Pages và một máy Render.
- Source export chưa triển khai lên tài khoản Render của bạn và chưa xác minh WebRTC trên hai thiết bị thật tại host đó.

## 5. Chạy trên máy tính

Cài Node.js 24, mở terminal trong thư mục dự án:

```sh
npm ci
npm start
```

Mở http://localhost:3000. Kiểm thử tự động: `npm test`.
WebRTC trên điện thoại truy cập địa chỉ LAN HTTP có thể bị giới hạn; dùng link HTTPS Render để thử online.

## Tài liệu chính thức

- https://render.com/docs/web-services
- https://render.com/docs/blueprint-spec
- https://render.com/docs/regions
- https://render.com/docs/free

`docs/PROJECT_HISTORY.md` là lịch sử phát triển; hướng dẫn triển khai hiện hành là README này.
