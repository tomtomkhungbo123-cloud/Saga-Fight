# Saga Fight 6.23.0 — Fairi cho GitHub / Render

Gói mã nguồn đầy đủ: Fairi mới nhất (kể cả sửa màu trong trận), ghép với netcode rollback và chế độ Chỉ DIRECT của bản Render 6.22.5. Giữ cài đặt đồ họa Tự động / Cao / Cân bằng / Thấp và giới hạn hiển thị 60 / 30 FPS; mô phỏng chiến đấu vẫn 120 Hz.

## Cập nhật GitHub

1. Giải nén `Saga_Fight_6_23_0_Fairi_GitHub_Render.zip`.
2. Tải toàn bộ nội dung bên trong lên GỐC repository đang dùng, ghi đè file cùng tên. Giữ đúng thư mục `web/fairi/`, `web/`, `worker/`, `scripts/`, không đặt thêm một thư mục bao ngoài. Không chỉ tải `game.js` hoặc `index.html`.
3. Commit. Render: Build Command `npm ci`, Start Command `npm start`, Root Directory để trống nếu repository chứa `package.json` ở gốc. Nếu Auto-Deploy bật, chờ deploy; nếu chưa chạy thì Manual Deploy → Deploy latest commit.
4. Chờ Live. Mở `/healthz`: `clientBuild` phải là `6.23.0`, `protocol` là `87`.
5. Cả hai máy tải lại trang, kiểm tra `BUILD 6.23.0`, rời phòng cũ và tạo phòng mới. Nếu còn bản cũ, tải lại bỏ cache hoặc xóa dữ liệu trang. Không trộn các file từ hai bản.

## Fairi

900 HP; Q ba tích lũy; W tàng hình / đâm bất ngờ; E bốn bản sao; R hội tụ cùng bản sao. Dùng logic chiến đấu của bản game chính mới nhất, không thay bằng thông số nhân vật cũ trong hội thoại. Màu thân theo bản vẽ; màu nhấn HUD riêng; đổi màu khi đấu trùng nhân vật và màu xám khi hạ gục được giữ.

Bản sao và kỹ năng được lưu/khôi phục trong snapshot rollback ở cả hai phía. Ngẫu nhiên điều khiển bản sao dùng hash số nguyên ổn định thay cho hash lượng giác để giảm nguy cơ lệch giữa trình duyệt. Bộ đệm hình ảnh tách khỏi trạng thái chiến đấu; chỉnh nhẹ rollback giữ animation, chỉnh cứng reset đúng nhân vật.

## Kết nối

Chung Wi-Fi: trước khi tạo phòng chọn `Chung Wi-Fi · Chỉ DIRECT`. Người tham gia nhận chính sách của chủ phòng. Gameplay không chuyển sang WS khi DIRECT mất; game dừng và báo lỗi kết nối. Server vẫn phục vụ trang, phòng, signaling và khôi phục checkpoint. Không tự nhận diện chắc chắn hai máy cùng Wi-Fi; router cách ly thiết bị có thể chặn DIRECT.

Khác mạng: chọn `Tự động · DIRECT ưu tiên, server dự phòng`. Không cần cấu hình TURN để dùng WS dự phòng. Độ mượt còn phụ thuộc RTT, jitter, thiết bị và khu vực server; gói này không bảo đảm mọi mạng đều không trễ.

Giữ các sửa cân nhịp host/guest, gộp rollback, nội suy hiển thị và ping thật từ bản Render trước. Các ghi chú phiên bản cũ trong docs chỉ là lịch sử.

## Kiểm chứng

Xem `VALIDATION.txt`. Chạy lại: Node 24 → `npm ci` → `npm test`. Không có token Cloudflare, khóa triển khai hay node_modules trong gói.
