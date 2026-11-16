# Saga Fight 6.25.7 — DIRECT checking và chẩn đoán

Gói cập nhật cho repository đang có game. Giữ Aether, Fairi, hai map, rollback và STUN của bản 6.25.6. Không cần TURN/token.

## Cập nhật

Giải nén Saga_Fight_6_25_7_DIRECT_Checking_Fix.zip; kéo toàn bộ NỘI DUNG vào GỐC repository GitHub, ghi đè file cùng tên và commit. Giữ ảnh/âm thanh cũ. Render npm ci / npm start; chờ Live. Cả hai máy tải lại BUILD 6.25.7, health clientBuild 6.25.7/protocol91. Rời phòng cũ và tạo phòng mới. Đây không phải gói cài repository trắng.

## Thay đổi

- Khi hết 12 giây nhưng ICE vẫn checking/connected/completed mà DIRECT chưa sẵn sàng, cho thêm tối đa 18 giây, tổng 30 giây. Không chờ vô hạn, không âm thầm dùng gameplay WS trong phòng Chỉ DIRECT.
- Một ứng viên ICE bị trình duyệt từ chối không hủy toàn bộ thương lượng; ghi nhận lỗi theo loại và tiếp tục các ứng viên còn lại.
- Thêm Sao chép chẩn đoán ở thẻ phòng. Thông tin gồm build, vai trò, trạng thái ICE, số/loại ứng viên hai phía, lỗi STUN/ứng viên, mô tả đã trao đổi và probe. Không chứa SDP, địa chỉ IP, mã phòng hoặc token. Nếu clipboard bị chặn, hiện ô văn bản để sao chép thủ công.

## Nếu vẫn lỗi

1. Chỉ MỘT máy bấm Tạo phòng. Máy còn lại nhập đúng mã trong THẺ PHÒNG của máy tạo rồi bấm Vào phòng; không tạo hai phòng riêng. Nếu đã có phòng đang hoạt động, bấm Rời phòng trước khi vào mã khác. Mã đang gõ ở ô nhập không thay đổi phòng hiện tại.
2. Giữ cả hai trang mở. Nếu DIRECT thất bại sau thời gian chờ, bấm Sao chép chẩn đoán ở CẢ HAI máy và gửi nội dung để xác định bước bị chặn.
3. Có thể chọn Tự động để dùng WS dự phòng nếu muốn chơi ngay; Chỉ DIRECT sẽ dừng nếu không thể kết nối trực tiếp.

Cùng Wi-Fi không bảo đảm DIRECT. ICE checking với hai ứng viên không đủ để kết luận lỗi là router, trình duyệt hay trao đổi kết nối. Bản sửa xử lý điểm thất bại sớm trong mã, không bảo đảm vượt qua cách ly thiết bị/chặn UDP/quyền trình duyệt. Không tự bật microphone/camera hoặc yêu cầu quyền media.

Kiểm chứng: 31 trường hợp mạng/server khác nhau đã đạt qua bộ hồi quy và kiểm tra bổ sung; WebRTC được mô phỏng, signaling/relay dùng WebSocket local thật. Chưa xác minh trên hai thiết bị/router của bạn. Chưa deploy GitHub/Render thay bạn.
