# Kết nối LifeMate với Supabase

Chỉ chủ website làm các bước 1–4 một lần. Sau đó mỗi người chỉ cần đăng ký và đăng nhập trên LifeMate.

## 1. Tạo project

1. Mở https://supabase.com/dashboard và đăng nhập (có thể dùng GitHub).
2. Bấm **New project**, chọn hoặc tạo organization cá nhân.
3. Đặt tên **LifeMate**, tạo mật khẩu database mạnh và lưu riêng. Không gửi mật khẩu này lên GitHub hay chat.
4. Chọn region **Singapore** nếu phù hợp, rồi **Create new project**. Chọn gói Free nếu nhu cầu phù hợp; xem hạn mức trong Dashboard.
5. Chờ project sẵn sàng.

## 2. Tạo nơi lưu dữ liệu riêng cho từng tài khoản

1. Trong project, mở **SQL Editor → New query**.
2. Mở tệp [supabase/schema.sql](supabase/schema.sql) trong kho GitHub, bấm nút sao chép toàn bộ nội dung.
3. Dán vào SQL Editor và bấm **Run**. Kết quả thành công thường là “Success. No rows returned”. Có thể chạy lại cùng tệp.

Bảng `lifemate_data` dùng Row Level Security: mỗi người chỉ đọc dữ liệu của chính mình. Các lần ghi qua hàm `save_lifemate_data`, lấy ID từ phiên đăng nhập và kiểm tra phiên bản trước khi ghi. Không tắt RLS hoặc tạo policy cho mọi người đọc dữ liệu.

## 3. Cho phép email xác nhận quay về website

1. Vào **Authentication → URL Configuration**.
2. Đặt **Site URL** thành `https://luongbaoduyen26-ops.github.io/LifeMate/`.
3. Thêm chính URL đó vào **Redirect URLs** và lưu. Thêm `http://localhost:8000/` nếu phát triển trên máy cá nhân; không cần cho người dùng website.
4. Trong **Authentication → Sign In / Providers → Email** (tên mục có thể khác theo giao diện), bật email/password và giữ **Confirm email** để xác nhận email đăng ký.
5. Khi dùng thật với nhiều người, cấu hình SMTP riêng theo hướng dẫn Supabase. Dịch vụ email thử mặc định có giới hạn số lượng và người nhận, có thể chưa gửi được tới tất cả địa chỉ.

## 4. Nối website với project

1. Tìm **Project URL** trong hộp **Connect** hoặc **Project Settings → Data API**.
2. Tìm **Publishable key** (`sb_publishable_...`) trong **Project Settings → API Keys**. Dự án cũ có thể dùng **anon/public key**.
3. Trong GitHub, mở `config.js` → biểu tượng bút chì **Edit this file**.
4. Điền hai giá trị vào đúng hai chuỗi rỗng và giữ nguyên dấu nháy:

```js
window.LIFEMATE_CONFIG = {
  supabaseUrl: 'https://MA-PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_KHOA-CONG-KHAI'
};
```

5. Bấm **Commit changes** vào `main`. Đợi tác vụ GitHub Pages trong **Actions** có dấu tích xanh, rồi tải lại website.

Project URL và Publishable/anon key là cấu hình công khai dành cho frontend; quyền dữ liệu được bảo vệ bằng RLS và phiên đăng nhập. **Không dùng Secret key, service_role key, database password, access token hay connection string trong config.js hoặc chat.** Code từ chối Secret key và JWT có role khác anon.

Nếu nhờ Codex nối giúp, chỉ gửi Project URL và Publishable key công khai. Không cần tạo hoặc gửi khóa quản trị.

## 5. Dùng và kiểm tra

1. Mở website → **Tạo tài khoản mới** → nhập email và mật khẩu ít nhất 8 ký tự.
2. Mở email xác nhận. Nếu chưa có thư, kiểm tra thư rác và cài đặt gửi email Supabase.
3. Đăng nhập → ghi nhận một ngày → bấm Lưu. Đợi thông báo **Đã lưu lên đám mây**.
4. Đăng nhập cùng tài khoản trên điện thoại. Dữ liệu đã lưu phải xuất hiện.
5. Cài đặt → **Tải lại từ đám mây** để lấy thay đổi từ thiết bị khác. Hiện chưa có realtime; nếu hai thiết bị cùng sửa, lần lưu cũ hơn sẽ bị từ chối để tránh ghi đè. Xuất JSON bản nháp, tải lại rồi nhập/ghi nhận lại nếu cần.
6. Tạo một tài khoản thứ hai: tài khoản này phải trống, không thấy dữ liệu tài khoản thứ nhất.

## Dữ liệu cũ

Trên đúng trình duyệt và địa chỉ website từng sử dụng, đăng nhập → **Cài đặt → Dữ liệu cũ trên trình duyệt**:

- **Xuất JSON dữ liệu cũ** để sao lưu trước.
- **Chuyển dữ liệu cũ lên tài khoản** để thay thế dữ liệu tài khoản bằng bản cũ (có hộp xác nhận; không trộn tự động).
- Kiểm tra dữ liệu trên thiết bị thứ hai. Sau đó có thể **Xóa bản cũ trên thiết bị**.

LifeMate không tự gửi dữ liệu cũ lên một tài khoản mới đăng nhập. Dữ liệu mẫu cũng không tự đưa lên cloud.

## Khi có lỗi

- **Chưa tạo cơ sở dữ liệu:** chạy toàn bộ `supabase/schema.sql`.
- **Không có quyền:** kiểm tra URL, Publishable key, RLS và phiên đăng nhập. Không sửa bằng cách tắt RLS.
- **Không có email xác nhận/khôi phục:** kiểm tra Supabase Auth logs, giới hạn email mặc định, SMTP và URL redirect.
- **Chưa lưu / mất mạng:** giữ tab mở, thử lưu lại. Có thể xuất JSON bản nháp. Nếu lần trước thực tế đã ghi nhưng phản hồi bị mất, kiểm tra bản trên cloud bằng thiết bị khác trước khi bỏ bản nháp.
- **Thay đổi trên thiết bị khác:** xuất JSON, tải lại từ cloud; website không tự ghi đè dữ liệu mới hơn.

## Giới hạn hiện tại

Dữ liệu cá nhân được lưu trong database Supabase của chủ project, không mã hóa đầu cuối; chủ project có quyền quản trị. Không lưu nhật ký/thói quen mới vào LocalStorage; chúng ở trong bộ nhớ tab khi dùng, và trên cloud sau khi lưu thành công. SessionStorage giữ phiên đăng nhập và khóa Gemini tùy chọn trong tab. LocalStorage chỉ còn dùng cho lựa chọn giao diện và bản dữ liệu cũ chưa chủ động xóa.

Không có cơ chế ghi nhận ngoại tuyến bền vững: thay đổi chưa lưu có thể mất nếu đóng tab. Luôn chờ xác nhận lưu. Đăng xuất xóa dữ liệu khỏi giao diện/bộ nhớ ứng dụng và phiên của tab; không xóa bản sao lưu JSON đã tải xuống. Xóa dữ liệu trong Cài đặt giữ nguyên tài khoản đăng nhập, không phải chức năng xóa tài khoản Supabase.
