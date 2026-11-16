# Saga Fight 6.25.6 — Aether cho GitHub / Render

Gói cập nhật dưới 100 file cho repository Saga Fight hiện có. Nguồn game chính: Site phiên bản 63, commit 09b7736804ec8ae2eb0c97d18516a6022160c3a0 (Build 6.25.5). Bản xuất Render là 6.25.6 để phân biệt với bản Site, giữ netcode rollback / DIRECT / STUN và hai map từ bản Render 6.24.4.

## Cập nhật

1. Giải nén `Saga_Fight_6_25_6_Aether_GitHub_Update.zip`.
2. Ở GỐC repository `Saga-Fight`, chọn Add file → Upload files. Kéo toàn bộ NỘI DUNG bên trong thư mục giải nén vào ô upload, bao gồm các thư mục web, worker, scripts, tests, docs và các file ở gốc. Không upload nguyên ZIP hoặc thêm thư mục bao ngoài.
3. Giữ nguyên ảnh/âm thanh cũ. Đây là gói cập nhật cho repository đang có game, không phải gói cài lên repository trắng. Các thư mục mới `web/aether/` và `web/sfx/aether/` phải được tải lên đầy đủ.
4. Commit changes. Render giữ Build Command `npm ci`, Start Command `npm start`; Root Directory để trống nếu package.json ở gốc. Chờ Auto-Deploy, hoặc Manual Deploy → Deploy latest commit → Live.
5. Cả hai máy tải lại, xác nhận BUILD 6.25.6. `/healthz` có clientBuild 6.25.6 và protocol 90. Rời phòng cũ, tạo phòng mới; không trộn hai phiên bản. Nếu còn bản cũ, tải lại bỏ cache/xóa dữ liệu trang.

## Nội dung

- Aether là chiến binh thứ bảy, dùng được ở PvE, PvP, Sandbox và Online. Thông số/kỹ năng theo bản game chính hiện tại: 1500 HP, Q sáu tinh thể, W giam cầm, E du hành dạng lỏng, R mưa tinh thể và bay lơ lửng. Không dùng thông số lab hay các mô tả nhân vật cũ trong hội thoại.
- Giữ bản sửa màu mirror của Aether, vùng va chạm tinh thể R khi mục tiêu trên không và năm cue âm thanh mới trong bộ trộn chung.
- Cảnh kết liễu Aether phủ kín khung đấu trường, giữ HUD. Melanta dùng đúng tỉ lệ ở nhiều kích thước màn hình. Các chỉnh sửa này lấy từ bản Site mới nhất.
- Snapshot rollback ở hai phía bao gồm trạng thái Aether, tinh thể/vùng chiêu, seed, người kết liễu, thời gian và âm thanh đã xác nhận; camera/VFX cache giữ ngoài trạng thái chiến đấu. Round mới xóa người kết liễu Aether và tạo lại HP/kỹ năng.
- Giữ Rừng tiên linh, camera Hang đá lãng quên, Fairi, lựa chọn đồ họa, ping thật và cân nhịp chủ phòng/người tham gia.

## Kết nối

Chủ phòng chọn map và chế độ kết nối. `Chung Wi-Fi · Chỉ DIRECT` không chuyển gameplay sang server nếu DIRECT mất. `Tự động · DIRECT ưu tiên, server dự phòng` cho phép WebSocket dự phòng. Có STUN công khai để tìm đường kết nối; không dùng TURN/token. Server vẫn cần cho trang/phòng/signaling/khôi phục. Router hoặc trình duyệt có thể hạn chế DIRECT dù cùng Wi-Fi.

## Kiểm tra

Node 24 → npm ci → npm test. Xem VALIDATION.txt cho phạm vi xác minh. Chưa kiểm tra trên hai thiết bị Wi-Fi vật lý của bạn; chưa deploy GitHub/Render thay bạn. Không bảo đảm loại bỏ mọi trễ mạng hoặc tụt FPS phần cứng.
