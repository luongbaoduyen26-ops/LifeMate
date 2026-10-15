# LifeMate — bản PostgreSQL tự quản lý

Nhánh chuyển đổi độc lập `migration/vibe-postgres`: frontend tiếng Việt và backend Node.js/Express/PostgreSQL. Không gọi Supabase, không chứa database password trong frontend. Website chính trên `main` chưa đổi.

**Đọc [hướng dẫn chuyển đổi](VIBE_MIGRATION.md)** trước khi triển khai hoặc xóa dữ liệu cũ. Bản này cần Node.js/Docker, không chạy chỉ bằng GitHub Pages hay Python static server.

## Chạy

Node.js 22 hoặc 24 và PostgreSQL 16:

```sh
npm ci
```

Đặt `DATABASE_URL` (hoặc `POSTGRES_URL`), `APP_ORIGIN`, `NODE_ENV`, `PORT` trong môi trường server. Xem `.env.example` (server không tự nạp tệp .env; host cần inject biến). Chạy:

```sh
npm start
```

Database tự tạo các bảng riêng `lm_users`, `lm_sessions`, `lm_data`, `lm_auth_limits`. Không dùng schema auth của Supabase. Health check `/api/health`.

## Tài khoản và dữ liệu

Đăng ký email/mật khẩu (email làm tên đăng nhập, chưa xác minh qua email). Lưu mã khôi phục một lần; mã dùng thay cho email khi quên mật khẩu. Có thể tạo mã mới trong Cài đặt với mật khẩu hiện tại. Cookie phiên HttpOnly/Secure tối đa 7 ngày; mật khẩu băm scrypt. Nhật ký/thói quen chỉ lưu trong database và bộ nhớ tab, không lưu mới vào LocalStorage. LocalStorage chỉ giữ lựa chọn theme và đọc bản cũ để chuyển có xác nhận.

Mỗi tài khoản cũ cần tạo tài khoản mới rồi nhập JSON đã xuất từ website cũ. Chưa có nhập hàng loạt Supabase Auth, chưa giữ user IDs hoặc xác minh email cũ. Không xóa Supabase trước khi chuyển xong dữ liệu và thử khôi phục backup.

## Chức năng

Tổng quan, ghi nhận hằng ngày, thói quen, điểm cân bằng, báo cáo 7 ngày/in PDF, sáng/tối, nhập/xuất JSON. Trợ lý quy tắc ngoại tuyến; Gemini tùy chọn vẫn dùng khóa cá nhân trong phiên tab và gửi hội thoại/nhật ký 7 ngày đến Google khi bật.

Điểm cân bằng và calo là ước tính tham khảo, không phải thước đo y tế; trợ lý không thay thế chuyên gia. Chủ database có quyền quản trị, chưa có mã hóa đầu cuối. Thay đổi lỗi mạng chỉ nằm trong bộ nhớ tab cho đến khi lưu lại hoặc xuất JSON.

## Kiểm thử

```sh
npm test
```

Xem `VIBE_MIGRATION.md` để kiểm tra migration, backup/restore và những giới hạn triển khai.
