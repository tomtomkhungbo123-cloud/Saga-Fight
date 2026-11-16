# Rừng tiên linh — Saga Fight 6.24.0

- Map mới dùng ảnh tham khảo được cung cấp, có nền đi được và các đảo nổi. Các bậc rêu bổ sung nối đường leo lên các đảo cao.
- Kích thước thế giới: 3200 × 1600, map cũ 1600 × 1117.
- Camera nhìn vùng 2200 × 1535.875: nhân vật hiển thị khoảng 73% kích thước trước; hitbox, tốc độ, tầm chiêu và sát thương giữ nguyên đơn vị thế giới.
- PvE, Sandbox và Online: camera bám nhân vật của máy đang chơi; giới hạn ở biên map và làm mượt bằng thời gian thực, độc lập rollback. Chỉ hướng ngang khi đối thủ ngoài khung hình.
- PvP chung máy: camera theo trung điểm và zoom ra theo khoảng cách giữa hai người, tối đa hết chiều rộng map.
- Online: map do chủ phòng chọn và được giữ trong cấu hình phòng khi khách vào/reconnect. Camera riêng từng máy, hình học và va chạm dùng chung.
- Sửa biên lướt Fairi Q, Melanta W/E và Mox E/R theo map; Thunder/Soulblade dùng biên thế giới chung sẵn có.
- Nền và các bậc được vẽ vào bộ đệm một lần, camera chỉ dịch ảnh đã lưu. Tất cả mức đồ họa dùng cùng map và luật va chạm.

## Cài đặt

Gói cập nhật dành cho repository đang chạy bản 6.25.7 có đủ ảnh/âm thanh. Giải nén và chép đè đúng đường dẫn vào gốc repository, giữ các file không nằm trong gói. Upload cả worker/index.mjs và các file web, không chỉ game.js. Render tiếp tục dùng npm ci / npm start. Hai máy tải lại BUILD 6.24.0, rời phòng cũ và tạo phòng mới. Nếu dùng Cloudflare Worker riêng, deploy lại Worker để lưu lựa chọn map.

## Kiểm tra thực tế còn cần

Chưa thử trên hai điện thoại/iPad thật và router Wi-Fi của người dùng. Kiểm thử DIRECT tự động dùng WebRTC mô phỏng, cùng relay WebSocket thật. Chưa deploy lên game đang chạy.
