# Saga Fight 6.24.4 — Map cho GitHub / Render

Gói cập nhật dưới 100 file, dùng cho repository Saga Fight hiện có ảnh/âm thanh. Bao gồm Fairi, netcode rollback cân nhịp hai phía và bản sửa DIRECT/STUN 6.23.1.

## Upload GitHub

1. Giải nén Saga_Fight_6_24_4_Maps_GitHub_Update.zip.
2. Tải lại trang Upload files đang lỗi (nếu có). Ở GỐC repository Saga-Fight, kéo toàn bộ NỘI DUNG bên trong thư mục giải nén vào ô upload: web, worker, scripts, tests, docs và các file ở gốc. Giữ đúng thư mục, không upload nguyên ZIP, không đặt thêm thư mục bao ngoài.
3. Commit changes. Giữ nguyên ảnh/âm thanh cũ trên GitHub; gói này không thay thế một repository trắng.
4. Render: npm ci / npm start. Chờ Auto-Deploy hoặc Manual Deploy → Deploy latest commit, trạng thái Live.
5. Cả hai máy tải lại BUILD 6.24.4; /healthz có clientBuild 6.24.4, protocol 89. Rời phòng cũ, tạo phòng mới.

## Map mới

- Rừng tiên linh: ảnh nền mới, đấu trường rộng 3200 × 1600, địa hình và camera theo nhân vật; khi hai người chung máy, camera giữ cả hai trong khung hình.
- Hang đá lãng quên: góc nhìn mới và cảnh đệm hai bên/phía trên để hạn chế lộ mép ảnh khi nhảy cao. Zoom thế giới còn 75% so với bản map 6.24.2, nhân vật/hiệu ứng nhỏ hơn; không đổi sát thương hoặc tầm chiêu vì zoom.
- Fairi, Mox và Melanta dùng giới hạn đấu trường theo map, tránh bị chặn ở biên map cũ.
- Chọn ĐẤU TRƯỜNG trước khi tạo phòng. Chủ phòng quyết định map; người vào phòng tự nhận cùng map, không tự đổi trong phòng. Snapshot rollback lưu map/địa hình; camera giữ riêng từng thiết bị.

## Kết nối và kiểm chứng

Giữ chế độ Chung Wi-Fi · Chỉ DIRECT và Tự động · DIRECT ưu tiên, server dự phòng. STUN tìm địa chỉ, không có TURN/token. Cùng Wi-Fi không bảo đảm DIRECT nếu router/trình duyệt hạn chế.

212 kiểm thử đạt trên Node 24, gồm 72 cặp nhân vật/map restore/replay, đồng bộ map qua DIRECT/WebSocket, Fairi Q/E/R trên map rộng, pixel mép ảnh/camera Hang đá và các hồi quy mạng/đồ họa. Xem VALIDATION.txt. Chưa thử trên hai thiết bị Wi-Fi vật lý của bạn; không bảo đảm xóa mọi giật do mạng hoặc thiết bị. Chưa deploy GitHub/Render thay bạn.
