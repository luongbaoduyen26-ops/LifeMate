# LifeMate 🌿

Website tiếng Việt để ghi nhận đời sống, theo dõi thói quen và xem báo cáo tuần. HTML/CSS/JavaScript thuần, không cần build. Supabase cung cấp email/password login và database riêng theo từng tài khoản.

## Bắt đầu

Xem **[Hướng dẫn kết nối Supabase từng bước](SUPABASE_SETUP.md)**. Tạo project, chạy `supabase/schema.sql`, cấu hình URL xác nhận email và điền Project URL + Publishable key công khai vào `config.js`. Không bao giờ đưa service_role/Secret key hoặc mật khẩu database lên frontend.

Chạy từ thư mục dự án:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Hoặc triển khai các tệp tĩnh trên GitHub Pages. Đăng nhập và xác nhận email cần HTTP/HTTPS cùng Redirect URL đúng; không dùng mở file trực tiếp cho quy trình cloud. Khi chưa cấu hình Supabase, trang hướng dẫn kết nối và chế độ xem thử xuất hiện. Xem thử chỉ giữ dữ liệu trong bộ nhớ, không lưu.

## Tính năng

- Tổng quan, điểm cân bằng, điều chỉnh nước nhanh, checklist và biểu đồ 7 ngày.
- Ghi nhận ngủ, nước, vận động, dinh dưỡng, tâm trạng, năng lượng và nhật ký.
- Tạo/lọc/xóa thói quen, lịch hoàn thành, chuỗi hiện tại và kỷ lục.
- Báo cáo 7 ngày, radar, mức độ đều đặn, huy hiệu, mục tiêu đề xuất và in/PDF.
- Trợ lý quy tắc ngoại tuyến; tùy chọn Gemini 2.5 Flash với API key cá nhân giữ trong phiên tab.
- Đăng ký, xác nhận email, đăng nhập, quên mật khẩu và đăng xuất.
- Lưu cloud theo tài khoản, phát hiện ghi đè giữa thiết bị, thông báo chưa lưu khi lỗi; xuất/nhập JSON và chuyển dữ liệu LocalStorage cũ có xác nhận.
- Giao diện sáng/tối và responsive. Google Fonts tùy chọn, có phông hệ thống dự phòng.

## Dữ liệu

Ghi nhận và thói quen lưu trong bảng `public.lifemate_data` trên Supabase; mỗi tài khoản có một JSON document với revision. RLS chỉ cho đọc hàng của mình; ghi qua RPC lấy `auth.uid()` và so khớp revision. Không tự động trộn dữ liệu hay realtime: tải lại từ đám mây trong Cài đặt khi chuyển thiết bị. Nếu xung đột, xuất bản nháp trước khi tải lại.

Dữ liệu cá nhân mới không ghi vào LocalStorage. Phiên đăng nhập nằm ở SessionStorage của tab; có thể cần đăng nhập lại sau khi đóng tab. LocalStorage còn dùng cho lựa chọn giao diện và đọc dữ liệu phiên bản cũ để di chuyển. Không tự gửi dữ liệu cũ/mẫu lên cloud. Khi lỗi mạng, bản nháp chỉ còn trong bộ nhớ tab cho đến khi lưu lại hoặc xuất JSON. Chủ project Supabase có quyền quản trị dữ liệu; chưa có mã hóa đầu cuối.

Gemini nhận hội thoại gần đây và số liệu/nhật ký 7 ngày khi người dùng chủ động bật bằng khóa riêng. Khóa không nằm trong JSON sao lưu. Dùng khóa cá nhân có giới hạn; website nhiều người dùng với khóa chung cần backend bảo vệ khóa.

## Điểm và giới hạn

Điểm là trung bình năm thành phần: ngủ/8h, nước/2L, vận động/30 phút, tâm trạng và dinh dưỡng; mỗi thành phần tối đa 100. Chỉ là chỉ số tham khảo, không phải thước đo y tế. Calo ước tính 5 kcal/phút. Quan sát tương quan không chứng minh quan hệ nguyên nhân. Trợ lý không thay thế chẩn đoán/điều trị chuyên môn.

## Kiểm tra

```sh
node --check app.js
node --check cloud.js
node --check account.js
node --test tests/cloud.test.cjs
```

Kiểm thử đăng nhập, dữ liệu hai tài khoản và hai thiết bị thật theo mục 5 trong hướng dẫn Supabase sau khi kết nối project. Không coi mock API là xác minh kết nối Supabase thật.
