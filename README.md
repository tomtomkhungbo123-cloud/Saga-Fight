# Saga Fight 6.36.0 — Render base + ChatGPT Version 73 changes

Gói này thay thế gói Saga_Fight_V73_Build_6_35_GitHub_Update.zip trước đó.
Dùng repository Render hiện có làm nền; không chuyển sang Online chỉ WebRTC của ChatGPT Site.

## Upload GitHub / Render

1. Giải nén và upload TOÀN BỘ nội dung bên trong ZIP vào GỐC repository GitHub hiện tại.
   Giữ đúng cấu trúc web/, worker/, scripts/, drizzle/, tests-merge/. Ghi đè file trùng tên.
   Không xóa các file tài nguyên sẵn có; đây là bản cập nhật bổ sung, không phải bộ cài trống.
2. Commit, ví dụ: Merge V73 game updates while preserving Render hybrid online.
3. Chờ Render Live. Build command: npm ci. Start command: npm start. Node.js 24.
4. Cả hai thiết bị tải lại cùng địa chỉ Render, xác nhận BUILD 6.36.0.
5. Tạo phòng MỚI. Có thể đổi chiến binh/map trước khi Sẵn sàng.
   Host chọn đấu trường; mỗi người chọn chiến binh của mình.
   Khi kết thúc trận, bấm VỀ SẢNH để đổi lựa chọn và tái đấu trong cùng phòng.

Không cần xóa database hoặc dữ liệu người chơi khi cài gói này.
Database SQLite sẽ tự áp dụng migration mới một lần.

## Giữ từ nền Render

- WebSocket /ws và relay; DIRECT ưu tiên + WebSocket dự phòng.
- Tùy chọn Chỉ DIRECT vẫn không chuyển combat qua server.
- Rollback đối xứng, checkpoint, pacing, ping, jitter và cơ chế khôi phục.
- Bộ tạo số ngẫu nhiên xác định cho bản sao Fairi, tránh sai lệch giữa trình duyệt.
- Sửa menu/mã phòng: menu giãn theo nội dung, thẻ mã được đưa vào vùng nhìn thấy.

Relay giữ nguyên byte so với gói nền Render 6.25.10.
18 hàm transport/checkpoint giữ nguyên. Phần sảnh chọn/sẵn sàng/tái đấu được ghép thêm
vào vòng đời phòng hiện tại, không thay bằng host-snapshot networking của Site.
Rollback capture bổ sung trạng thái kết liễu Fairi; cache vải Thunder chỉ dùng để render.

## Ghép thêm từ Version 73

- Giao diện menu, logo, icon, màn hình chọn đấu trường/chiến binh.
- Sảnh chờ: sửa lựa chọn trước Sẵn sàng, trở về sảnh và rematch cùng mã phòng.
- Chỉnh sửa chiến binh và cảnh kết liễu Fairi; các sửa hình ảnh/animation mới.
- Giao diện hồ sơ và các trường thống kê tài khoản.

TÀI KHOẢN: Supabase chưa được cấu hình. Render vẫn hỗ trợ chơi khách.
Các nút đăng nhập/đăng ký hiển thị CHƯA CẤU HÌNH; không giả lập đăng nhập hoặc mật khẩu.
Thống kê theo người dùng trên Render chưa hoạt động cho đến khi tích hợp xác thực thật.
Header danh tính ChatGPT do client gửi bị loại bỏ trên Node server.

## Kiểm tra và dữ liệu

npm test chạy tests-merge/ để không lẫn các kiểm thử giao thức cũ còn trong repository.
Chi tiết trong VALIDATION.txt. Danh sách và hash file trong CHECKSUMS.sha256.

SQLite mặc định ở .data/rooms.sqlite, hoặc thư mục DATA_DIR nếu đã cấu hình.
Render với filesystem tạm không đảm bảo giữ file qua redeploy; gói này không thay đổi
hạ tầng lưu trữ và không tạo database Supabase.

Gói được tạo từ bộ mã Render 6.25.10 có trong phiên làm việc và nguồn Site Version 73.
Kiểm tra URL công khai trả health 6.25.10 nhưng frontend 6.25.9; gói này đồng bộ các nhãn
client/server lên 6.36.0. Chưa đối chiếu được các chỉnh sửa riêng trong repository GitHub.
Chưa push GitHub và chưa triển khai Render tự động.
