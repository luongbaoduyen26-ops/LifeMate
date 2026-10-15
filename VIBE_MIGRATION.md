# Chuyển LifeMate sang PostgreSQL riêng

Nhánh `migration/vibe-postgres` là bản thử nghiệm chuyển khỏi Supabase. `main` và website chính chưa đổi. Bản này chạy Node.js, không còn gọi Supabase API và không thể triển khai như website HTML tĩnh/GitHub Pages.

## Đã chuẩn bị trong code

- Backend Node.js (22 hoặc 24), `npm start`, lắng nghe `0.0.0.0:$PORT` (mặc định 3000).
- Dockerfile cho host có hỗ trợ Docker. Không cần dùng cả Docker và npm cùng lúc.
- PostgreSQL, dùng `DATABASE_URL` hoặc `POSTGRES_URL`; tự tạo các bảng `lm_users`, `lm_sessions`, `lm_data`, `lm_auth_limits`. Không xóa dữ liệu hay bảng cũ.
- Mật khẩu băm scrypt, phiên đăng nhập trong cookie HttpOnly/Secure/SameSite, kiểm tra nguồn yêu cầu ghi và giới hạn thử đăng nhập trong database.
- Dữ liệu riêng từng tài khoản, phát hiện xung đột revision giữa thiết bị, nhập/xuất JSON.
- Khôi phục mật khẩu bằng mã ngẫu nhiên hiển thị sau đăng ký. Không dùng email, không xác minh quyền sở hữu email. Lưu mã riêng; có thể tạo mã mới trong Cài đặt sau khi nhập mật khẩu hiện tại. Nếu quên cả mật khẩu và mã thì không tự khôi phục được.

Khả năng Vibe Host nhận diện Node.js/Dockerfile vẫn cần xác minh bằng triển khai thử. Việc host có PostgreSQL hoặc MCP không chứng minh rằng họ chạy được mọi backend.

## Trước khi chuyển

1. Đổi mật khẩu PostgreSQL đã lộ trong ảnh trước đó. Kiểm tra hai biến tự sinh của Vibe Host đã cập nhật theo mật khẩu mới; không chụp/chép giá trị ra chat, không đưa vào GitHub.
2. Trên website đang dùng Supabase, từng tài khoản xuất **Cài đặt → Xuất JSON**. Kiểm tra file có `version`, `records`, `habits`. Giữ riêng; file có nhật ký cá nhân.
3. Giữ project Supabase và bản website cũ hoạt động. Không tắt Supabase khi chưa chuyển đủ dữ liệu người dùng.

## Cấu hình bản Node.js trên host

Ưu tiên tạo bản thử ở địa chỉ riêng, trỏ nguồn tới nhánh `migration/vibe-postgres`, không thay website chính ngay. Xác minh host hỗ trợ backend Node.js hoặc Dockerfile; nếu triển khai thất bại, xem nhật ký để phân biệt lỗi nhận diện runtime và lỗi kết nối database. Không tạo thêm database hoặc dịch vụ có phí mà chưa xem chi phí.

Thiết lập biến môi trường ở khu vực bảo mật của host:

| Tên | Giá trị |
| --- | --- |
| `DATABASE_URL` hoặc `POSTGRES_URL` | Chuỗi nội bộ do Vibe Host cung cấp; chỉ đặt ở server |
| `APP_ORIGIN` | Địa chỉ HTTPS chính xác của bản triển khai, **không có dấu `/` cuối**; ví dụ `https://lifemate.vibe.tinhgon.xyz` khi chuyển chính thức |
| `NODE_ENV` | `production` |
| `PORT` | Theo yêu cầu host, mặc định ứng dụng là `3000` |
| `DATABASE_SSL` | `true` nếu endpoint PostgreSQL hỗ trợ TLS; dùng CA được tin cậy. Với mạng database nội bộ, theo hướng dẫn của host; không tắt xác minh chứng chỉ để xử lý lỗi TLS |
| `DATABASE_CA_FILE` | Đường dẫn CA tin cậy nếu provider yêu cầu; không cần khi dùng CA hệ thống |

Chuỗi nội bộ phải có host database và cổng hợp lệ (thường là 5432), không dùng chuỗi host ngoài trống/cổng 0 như có thể thấy ở trang thông tin kết nối. Không đặt chuỗi kết nối trong `config.js`. Nếu URL có tham số SSL, dùng cấu hình `DATABASE_SSL`/`DATABASE_CA_FILE` tương ứng và bỏ các tham số SSL khỏi URL để tránh ghi đè xác minh. Bản server từ chối `sslmode/sslcert/sslkey/sslrootcert` trong URL.

Lệnh cài: `npm ci --omit=dev`; lệnh chạy: `npm start`. Nếu host dùng Docker, Dockerfile đã thực hiện các bước này. Không chạy Python static server cho bản này.

Health check: `/api/health` phải trả `{"ok":true,"storage":"postgresql"}`. Trang đăng nhập chạy được chỉ là bước đầu, vẫn cần kiểm tra ghi/đọc.

## Chuyển dữ liệu và tài khoản

1. Tạo tài khoản mới trên backend mới, lưu mã khôi phục. Tài khoản/mật khẩu Supabase không tự chuyển; không sao chép hash Supabase sang scrypt.
2. Đăng nhập tài khoản mới → Cài đặt → nhập tệp JSON đã xuất. Nhập sẽ thay thế dữ liệu tài khoản đó, có hộp xác nhận.
3. Tải lại và đăng nhập bằng thiết bị thứ hai: nhật ký, thói quen, lịch hoàn thành phải đúng. Kiểm tra cả tài khoản khác không thấy dữ liệu của bạn.
4. Với nhiều người dùng, mỗi người tự tạo tài khoản và nhập dữ liệu của mình; chủ website không giả mạo email để chiếm tài khoản cũ. Nếu cần giữ chính xác user ID, email đã xác minh hoặc nhập toàn bộ người dùng, cần quy trình migration quản trị riêng trước khi triển khai bản này.
5. Khi chuyển chính thức, tạm ngừng ghi trên bản cũ, xuất bản JSON cuối cùng rồi nhập bản cuối lên backend mới. Tránh tiếp tục ghi dữ liệu ở cả hai hệ thống.

## Xác minh sao lưu Vibe Host

Gắn website/database ở trang quản lý chỉ là metadata, không đủ chứng minh backup bao gồm PostgreSQL.

1. Kiểm tra mục Sao lưu của Vibe Host: đúng website và database mới được chọn.
2. Tạo một bản sao lưu chứa mã nguồn và PostgreSQL theo tính năng host cung cấp.
3. Khôi phục vào môi trường thử riêng; kiểm tra có bảng người dùng/dữ liệu, đăng nhập lại, nhật ký và thói quen còn nguyên. Không ghi đè database đang dùng để thử khôi phục.
4. Xác minh biến môi trường/chuỗi kết nối được khôi phục hoặc nhập lại an toàn. Phiên cũ trong bản dump có thể còn tồn tại đến khi hết hạn; nên vô hiệu hóa phiên cũ khi khôi phục hoặc đổi môi trường bằng cách đăng xuất/biện pháp quản trị phù hợp.
5. Chỉ ngừng Supabase sau khi dữ liệu mọi tài khoản, đăng nhập, backend mới và khôi phục đều đã được kiểm chứng. Giữ bản xuất cuối riêng theo thời gian lưu trữ phù hợp.

## Phát triển và kiểm thử

```sh
npm ci
npm test
```

Bộ kiểm thử dùng PostgreSQL WASM (PGlite), gọi HTTP thật tới Express, kiểm tra đăng nhập, cookie, quyền dữ liệu, xung đột, khôi phục, CSRF và dữ liệu không hợp lệ. Đó không phải kiểm thử triển khai Vibe Host.

Chạy local với PostgreSQL riêng: đặt `DATABASE_URL`, `APP_ORIGIN=http://127.0.0.1:3000`, `NODE_ENV=development`; chạy `npm start`. Không dùng chế độ development trên host công khai vì cookie không có Secure ở chế độ này.

Giới hạn: giới hạn đăng nhập theo IP dùng địa chỉ socket thực, không tin X-Forwarded-For; nếu host đặt reverse proxy, nhiều người có thể chung hạn mức. Cần cấu hình tin cậy proxy cụ thể trước khi mở rộng. Email là tên đăng nhập chưa xác minh; chưa có SMTP, MFA hoặc quản trị tài khoản. Mã khôi phục phải giữ ngoài bản sao JSON dữ liệu. Những giới hạn này cần được chủ website chấp nhận trước khi chuyển người dùng thật.
