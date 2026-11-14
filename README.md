# Saga Fight 6.22.5 — cân nhịp hai máy và phòng Chỉ DIRECT

Bản vá dành cho GitHub/Render đang dùng 6.22.4. Giữ cài đặt đồ họa, rollback, thanh ping gọn và nội suy hiển thị.

## Cập nhật

1. Giải nén Saga_Fight_6_22_5_Host_Sync_DIRECT_Only.zip.
2. Ghi đè toàn bộ file trong gói vào đúng đường dẫn ở gốc repository GitHub. Đặc biệt phải cập nhật worker/index.mjs, scripts/relay.mjs và các file web cùng nhau. Giữ các asset/file khác đang có.
3. Commit → Render → Manual Deploy → Deploy latest commit. Build Command npm ci; Start Command npm start; Node 24. Chờ Live.
4. Hai máy tải lại, xác nhận BUILD 6.22.5. /healthz phải trả về 6.22.5-clock1, protocol 86.
5. Rời phòng cũ và tạo phòng mới. Hai máy phải dùng cùng bản.

## Chơi chung Wi-Fi chỉ qua DIRECT

Trước khi bấm Tạo phòng, chủ phòng chọn Kết nối phòng → Chung Wi-Fi · Chỉ DIRECT. Người tham gia tự nhận chế độ của phòng. Input trận đấu và checksum chỉ đi DataChannel DIRECT; relay server từ chối chuyển tiếp các gói này trong phòng Chỉ DIRECT. Nếu DIRECT không thiết lập được hoặc mất giữa trận, game báo rõ/dừng, không chuyển gameplay sang WS. Rời phòng để kiểm tra mạng rồi tạo lại.

Server vẫn phục vụ trang, tạo/vào phòng, trao đổi ICE và thông điệp khởi tạo/khôi phục checkpoint; đây không phải chế độ LAN offline. Game không biết chắc SSID/cùng Wi-Fi của hai máy. Router cách ly thiết bị, Wi-Fi khách, VPN hoặc chính sách trình duyệt có thể chặn DIRECT. Khi chơi khác mạng, có thể chọn Tự động · DIRECT ưu tiên, server dự phòng.

## Sửa lệch trải nghiệm chủ phòng/người tham gia

Bản trước đặt thời điểm khởi động host/guest theo các độ trễ khác nhau: lệnh START đi qua WS nhưng phía guest bù bằng RTT của đường DIRECT. Khi đường server chậm và DIRECT nhanh, chủ phòng có thể chạy trước nhiều tick. Người tham gia có sẵn input của chủ phòng, còn chủ phòng phải dự đoán input người tham gia nhiều hơn.

Bản này đo RTT của bước khởi tạo/ACK qua đúng đường điều khiển để bù START. Heartbeat mang tick/epoch, cho phép ước lượng lệch nhịp; phía đi trước giữ lại tối đa một tick mỗi frame khi lệch quá hai tick. Áp dụng giống nhau cho cả hai vai, không đổi trạng thái hay bỏ input để bắt kịp. Việc cân nhịp có thể làm chậm bước mô phỏng tạm thời trong lúc chỉnh lệch, không phải bỏ độ trễ mạng.

Chẩn đoán: window.riftNet.metrics() có startControlRttMs, clockSkewTicks, clockHolds và connectionMode. Giữ số liệu ping/FPS thật; không tạo số ping cố định.

## Kiểm chứng

152 kiểm thử đạt trên Node 24.22.1. Đã tái hiện ca tín hiệu WS trễ 120 ms với DIRECT nhanh: bản trước host chạy trước khoảng 19 tick; bản sửa về 0 tick ở lần đo đại diện. Cố tình cho từng phía chạy trước cũng được cân nhịp mà không reset epoch, giữ checksum giống nhau. Đã kiểm tra phòng DIRECT thành công, thất bại, mất DIRECT giữa trận, chính sách host truyền cho guest, relay chặn input WS và cập nhật thiếu backend được báo rõ.

Chưa thử trên hai thiết bị vật lý/Wi-Fi của bạn. Không bảo đảm xóa mọi giật do GPU/CPU, Wi-Fi hoặc jitter bất đối xứng. Chi tiết: docs/host-clock-direct-6.22.5.md.
