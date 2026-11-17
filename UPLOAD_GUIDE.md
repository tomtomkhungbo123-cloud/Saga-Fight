# Cập nhật Saga Fight trên Render

Bản chuẩn bị: 6.36.0-auth2, gameplay 6.36.0, giao thức 94, tài khoản Supabase tương ứng bản test Site Version 79.

Render chạy `server.mjs` và phục vụ giao diện từ `web/`. File `game.js`, `index.html`, `online.js` ở thư mục gốc không được dùng để phục vụ game.

Giữ nguyên cấu trúc thư mục khi cập nhật. Không kéo tất cả file từ nhiều thư mục vào một lần upload ở gốc GitHub: các file trùng tên như `base.js`, `combat.js`, `visual.js` sẽ bị mất đường dẫn nhân vật.

Sau khi commit, kiểm tra Render đang deploy đúng nhánh `main` và đúng commit. Build Command: `npm ci && npm run build`. Start Command: `npm start`. Nếu Auto-Deploy tắt, chọn Deploy latest commit.

Sau deploy, `/healthz` phải có `frontendBuild: 6.36.0`, `gameBuild: 6.36.0` và gameSha256 tương ứng file `web/game.js`. Trang chính phải hiện BUILD 6.36.0. Kiểm tra phiên bản không chỉ dựa trên số ghi cứng ở server.

Tài khoản: cấu hình SUPABASE_URL và SUPABASE_PUBLISHABLE_KEY trong Render Environment theo docs/auth-and-deployment.md. Không commit secret key hoặc service_role key.
