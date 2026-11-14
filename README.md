# Saga Fight 6.22.4 — Cài đặt đồ họa cho GitHub/Render

Gói cập nhật dành cho bản Render 6.22.3 đang có. Tích hợp mục Đồ họa từ Site Build 6.18 vào game online mới nhất, giữ rollback hai chiều, ưu tiên DIRECT, thanh ping gọn và nội suy hiển thị. Đây là bản vá, không phải bộ cài mới.

## Cập nhật

1. Giải nén `Saga_Fight_6_22_4_Graphics_Settings.zip`.
2. Ghi đè toàn bộ file trong gói vào đúng đường dẫn ở thư mục gốc repository GitHub đang nối với Render. Giữ các file/asset khác đang có. Không tạo thêm thư mục lồng chứa toàn bộ project.
3. Commit lên nhánh đang deploy.
4. Render → Manual Deploy → Deploy latest commit. Giữ Build Command `npm ci`, Start Command `npm start`, Node 24. Chờ Live.
5. Hai máy tải lại game. Phải thấy BUILD 6.22.4; `/healthz` phải hiện `6.22.4-graphics1`.
6. Vào Cài đặt → Đồ họa. Chọn Tự động / Cao / Cân bằng / Thấp và giới hạn 60 / 30 FPS. Lựa chọn áp dụng ngay, tự lưu trên từng thiết bị. Hai người không cần chọn giống nhau.

Mức Thấp giảm độ phân giải canvas; 30 FPS giảm số lần vẽ hình. Nhân vật, hiệu ứng chiêu, hitbox, sát thương, cooldown, input, mô phỏng 120 Hz và networking được giữ. Đổi lại mức thấp bớt nét, 30 FPS bớt mượt hơn 60 FPS. Chế độ Tự động điều chỉnh độ phân giải theo tải vẽ và giới hạn FPS được chọn. Tùy chọn đồ họa không làm giảm ping mạng.

## Các file chạy game trong gói

- server.mjs, package.json, package-lock.json
- web/index.html, web/game.js, web/style.css
- web/online.js, web/rollback-core.js (đồng bộ dấu phiên bản của các module)

Không thay giao thức online: vẫn protocol 85. Không đổi scripts/relay.mjs hoặc thêm phụ thuộc chạy game. Mã nguồn/tài liệu kiểm thử cũng nằm trong gói.

## Kiểm chứng

144 kiểm thử đạt trên Node 24.22.1. Đã kiểm tra hồ sơ đồ họa giảm số pixel, giới hạn 30/60 chỉ đổi số lần vẽ, tự lưu/khôi phục và trường hợp localStorage hỏng/bị chặn; hai client online thực thi khung hình ở mức Thấp+30 và Cao+60 vẫn đồng bộ qua relay WS local với DIRECT mô phỏng. Chưa đo FPS/nhiệt độ trên điện thoại thật; không cam kết hết lag hoặc giảm ping. Chi tiết: docs/graphics-render-6.22.4.md.
