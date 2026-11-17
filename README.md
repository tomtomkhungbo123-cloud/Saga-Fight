# Saga Fight 6.25.10 — Khôi phục DIRECT iOS

Gói KHÔI PHỤC cho repository đang dùng bản Render6.25.9. Phần bắt tay/kết nối DIRECT trở về cơ chế6.25.7 mà người dùng đã báo iOS↔iOS hoạt động. Giữ gameplay hiện tại, Aether, Fairi, hai map, rollback và cài đặt đồ họa.

## Cập nhật

Giải nén Saga_Fight_6_25_10_DIRECT_Recovery.zip. Kéo toàn bộ NỘI DUNG vào gốc repository GitHub, ghi đè đúng đường dẫn rồi commit. Không xóa asset/file khác, không upload nguyên ZIP. Gói chỉ có các file khác so với6.25.9, không dùng để tạo repository trắng.

Render giữ npm ci / npm start; chờ deploy Live. Hai thiết bị phải cùng mở địa chỉ Render, tải lại và kiểm tra BUILD6.25.10. /healthz có clientBuild6.25.10 và protocol94. Rời mọi phòng cũ rồi tạo phòng mới bằng Chỉ DIRECT. Nên xác nhận lại iPhone↔iPad trước.

## Phạm vi khôi phục

- Bỏ gom SDP/đệm ứng viên của6.25.9; gửi offer/answer và trickle ICE như6.25.7.
- Bỏ hàng đợi SDP/ICE, end-marker tổng hợp và thay đổi thời điểm đóng kết nối của6.25.8; các hàm startDirect/directSignal/peerConnection/directChannel/fallback đã được so sánh với6.25.7.
- Giữ báo cáo đọc-only về origin và các cặp ICE. Không thêm trang kiểm tra riêng, TURN hay quyền media.
- Cập nhật đồng bộ build/protocol/cache để tránh hai thiết bị dùng lẫn phiên bản.

Đây là rollback một thay đổi có thể gây hồi quy, không phải kết luận nguyên nhân đã được chứng minh. iOS↔iOS vẫn cần xác nhận lại trên thiết bị. Lỗi laptop↔iOS chưa được xác nhận khắc phục. Nếu máy đang chạy các file lẫn phiên bản, việc cập nhật đầy đủ và tải lại cả hai máy là cần thiết.

## Kiểm chứng

34 kiểm thử mạng/server/đồ họa/khôi phục đạt. Các kiểm thử mô phỏng PeerConnection, dùng WebSocket local thật; không thay thế kiểm tra Safari/iPhone/iPad vật lý. Gameplay không thay đổi ngoài dấu phiên bản, không chạy lại toàn bộ test nhân vật/map cho gói transport này.
