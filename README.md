# Saga Fight 6.25.8 — Kiểm tra và sửa tương tác kết nối giữa trình duyệt

Bản cập nhật trực tiếp cho game GitHub/Render đang dùng 6.25.7. Giữ Aether, bảy chiến binh, hai map, rollback và STUN. Thay đổi nằm ở thương lượng kết nối DIRECT; chưa có bằng chứng xác nhận nguyên nhân duy nhất của lỗi trên thiết bị của người dùng.

## Cập nhật

Giải nén Saga_Fight_6_25_8_Connection_Interop_Update.zip. Ở GỐC repository GitHub, kéo toàn bộ NỘI DUNG vào Upload files và commit, giữ đúng thư mục và giữ ảnh/âm thanh cũ. Không upload nguyên ZIP. Gói dưới100file, không dùng cho repository trắng.

Render giữ npm ci / npm start. Chờ Live. Cả hai máy tải lại BUILD 6.25.8, /healthz có clientBuild 6.25.8 và protocol92. Rời phòng cũ, tạo phòng mới. Thử máy tính tạo phòng → iPad vào, sau đó đổi vai nếu cần.

## Các điểm tìm thấy và đã sửa

1. Hoàn tất ICE: mã cũ chuyển tiếp RTCIceCandidate có chuỗi rỗng nhưng bỏ qua sự kiện candidate=null. Bản này chuyển sự kiện hoàn tất toàn cục thành end-of-candidates hợp lệ, xử lý cả hai dạng và tránh gửi lặp. Không giả định mọi trình duyệt phát sự kiện hoàn tất giống nhau.
2. SDP/ICE bất đồng bộ: thông điệp signaling cũ gọi xử lý trực tiếp, nhiều promise có thể chồng nhau. Bản này xếp hàng theo phiên, áp dụng offer/answer xong rồi mới xử lý tiếp candidate/route, có giới hạn hàng đợi. Gói của PC/phiên đã đóng không được làm hỏng lượt kết nối mới.
3. Trạng thái disconnected lúc khởi tạo: không dùng thời gian đóng2.5giây của trận đang chạy cho kết nối chưa mở. Khởi tạo vẫn có deadline hữu hạn12giây và phần chờ thêm18giây khi phù hợp; trạng thái failed vẫn được xử lý. Không chờ vô hạn.
4. Ứng viên được chống lặp và gắn với PC hiện tại; một ứng viên lỗi không hủy các ứng viên còn lại. Báo cáo trong game có trạng thái gửi/nhận end-of-candidates.

Chỉ DIRECT vẫn không chuyển gameplay sang WebSocket. Tự động vẫn có WebSocket dự phòng. Không thêm TURN hoặc quyền camera/microphone.

## Kết quả kiểm tra và giới hạn

36 ca mạng/server/đồ họa đã đạt qua bộ hồi quy. Ba ca mô phỏng nghiêm ngặt tái hiện thất bại trên mã6.25.7 và đạt ở6.25.8: candidate đến khi setRemoteDescription chưa hoàn tất; một phía chỉ báo hoàn tất bằng null; disconnected tạm thời khi chưa vào trận. Thử hai vai host/guest với độ trễ khác nhau và kiểm tra end marker đúng một lần, không có candidate bị từ chối và không dùng WS gameplay trong phòng Chỉ DIRECT.

Đây là kiểm thử hành vi bằng VM/RTCPeerConnection giả lập và WebSocket local thật, không phải chạy Safari/Edge thật. Chưa thử trên máy tính/iPhone/iPad vật lý. Không thể kết luận các điểm trên là nguyên nhân duy nhất của log đã gửi hoặc bảo đảm mọi Wi-Fi đều DIRECT được.

Tài liệu đối chiếu: https://www.w3.org/TR/webrtc/ và https://www.rfc-editor.org/info/rfc8838/
