# Saga Fight 6.25.9 — Laptop / iOS DIRECT

Bản sửa trực tiếp phần kết nối của game, dựa trên bản Render6.25.8. Giữ Aether, bảy chiến binh, hai map, rollback, lựa chọn đồ họa và Chỉ DIRECT. Chưa xác nhận nguyên nhân duy nhất của lỗi trên thiết bị vật lý.

## Cập nhật một lần trên GitHub

Giải nén `Saga_Fight_6_25_9_Laptop_iOS_DIRECT_Update.zip`. Ở GỐC repository Saga-Fight, kéo toàn bộ NỘI DUNG lên Add file → Upload files rồi Commit changes. Giữ đúng thư mục và giữ các ảnh/âm thanh cũ. Không upload nguyên ZIP hoặc thêm thư mục bao ngoài. Đây là gói cập nhật cho repository đã có game, không phải repository trắng.

Render giữ Build Command npm ci, Start Command npm start. Chờ deploy Live. Cả laptop và iPhone/iPad mở CÙNG ĐỊA CHỈ RENDER, xác nhận BUILD6.25.9. /healthz có clientBuild6.25.9/protocol93. Rời phòng cũ, tạo phòng mới bằng Chỉ DIRECT. Không trộn trang chatgpt.site với trang onrender.com: chúng là hai máy chủ phòng riêng, file tải lên GitHub/Render không tự cập nhật trang Site.

## Thay đổi kết nối

- Offer/answer chờ gom ICE tối đa1.8giây rồi gửi chính localDescription hiện tại, bao gồm ứng viên đã thu thập được. Không sửa địa chỉ IP hoặc sửa tay SDP.
- Các ứng viên trước đó được đệm, không gửi trước offer/answer. Không gửi lặp ứng viên đã có trong SDP. Ứng viên đến muộn vẫn được chuyển tiếp; không đợi gom vô hạn.
- Khi rời phòng/đóng PC, hủy chờ gom và không gửi SDP từ phiên cũ.
- Giữ hàng đợi SDP/ICE tuần tự, end-of-candidates và xử lý disconnected khởi tạo từ6.25.8.
- STUN công khai Cloudflare + Google. Không có TURN, token, quyền camera/microphone hay gameplay relay trong phòng Chỉ DIRECT.
- Sao chép chẩn đoán trong game có địa chỉ gốc trang đang chạy, chế độ trao đổi gathered-sdp+late-trickle và các cặp ICE: loại/dạng địa chỉ, số yêu cầu và phản hồi. Không chép địa chỉ IP ứng viên, SDP, mã phòng hay token.

Thời gian gom chỉ ở bước vào phòng; không thêm input delay trong trận. Nếu DIRECT không mở được, Chỉ DIRECT vẫn dừng, Tự động vẫn có WS dự phòng.

## Kiểm chứng và giới hạn

40 kiểm thử đạt trên Node24.22.1: SDP có ứng viên trước khi gửi, chống lặp, trickle muộn, giới hạn thời gian gom, hủy phiên, báo cáo ICE không lộ IP/token, hai vai, rollback DIRECT/WS, clock pacing, reconnect, graphics và server.

Các kiểm thử dùng VM/RTCPeerConnection mô phỏng và WebSocket local thật. Chưa chạy trên laptop/iPhone/iPad/router thật. Bản sửa thay đổi đường trao đổi kết nối để giảm phụ thuộc thứ tự sự kiện giữa trình duyệt, không khẳng định sẽ vượt qua mọi chính sách hệ điều hành/mạng hoặc đã chứng minh nguyên nhân lỗi của người dùng. Nếu vẫn lỗi, chẩn đoán trong game có thêm dữ liệu cặp ICE để tiếp tục kiểm tra.
