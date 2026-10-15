# LifeMate 🌿

Website tiếng Việt giúp ghi nhận đời sống, theo dõi thói quen và xem lại tiến độ cá nhân. HTML, CSS và JavaScript thuần; không cần build hay cài dependencies.

## Chạy

Mở `index.html` trong trình duyệt, hoặc chạy từ thư mục dự án:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Sử dụng máy chủ HTTP để có nguồn lưu trữ trình duyệt ổn định. Không cần tài khoản hay cơ sở dữ liệu. Google Fonts là tùy chọn; khi ngoại tuyến, giao diện dùng phông hệ thống.

## Chức năng

- Tổng quan với điểm cân bằng 0–100, điều chỉnh nước nhanh, checklist thói quen và biểu đồ 7 ngày.
- Ghi nhận giấc ngủ, chất lượng ngủ, nước, vận động, dinh dưỡng, tâm trạng, năng lượng và nhật ký. Điểm được tính trực tiếp, bấm Lưu để ghi nhận.
- Tạo, lọc, hoàn thành và xóa thói quen; lịch 7 ngày, chuỗi hiện tại và kỷ lục. Chuỗi hiện tại cho phép hôm nay chưa hoàn thành nếu hôm qua đã hoàn thành.
- Trợ lý dùng quy tắc ngoại tuyến; phân tích dữ liệu thực tế, không phải mô hình AI trong chế độ này. Kết nối Gemini 2.5 Flash tùy chọn ở Cài đặt, với khóa riêng của người dùng. Lỗi kết nối sẽ chuyển sang gợi ý ngoại tuyến.
- Báo cáo 7 ngày liên tiếp tính đến hôm nay: radar, thanh tỷ lệ thói quen, huy hiệu, mục tiêu ưu tiên và in/lưu PDF qua hộp thoại trình duyệt.
- Giao diện sáng/tối, responsive, sao lưu và khôi phục JSON có kiểm tra cấu trúc.

## Dữ liệu và giới hạn

Lần đầu mở nạp dữ liệu mẫu 7 ngày, có nhãn trên tổng quan. Cài đặt → Xóa dữ liệu & bắt đầu lại để bỏ mẫu. Dữ liệu nằm ở LocalStorage của trình duyệt/nguồn trang, không đồng bộ giữa thiết bị. Xuất JSON để sao lưu. Chưa có xác thực hay backend.

Khóa Gemini chỉ nằm trong SessionStorage của tab, không bao gồm trong tệp sao lưu. Khi dùng Gemini, lịch sử hội thoại gần nhất và ghi nhận 7 ngày (có nhật ký) được gửi tới `generativelanguage.googleapis.com`. Không dùng khóa máy chủ dùng chung trên website công khai; triển khai nhiều người dùng cần backend bảo vệ khóa, xác thực và hạn mức. Mô hình có thể yêu cầu quyền truy cập/hạn mức tài khoản Google phù hợp.

Điểm cân bằng là trung bình năm thành phần: ngủ (mục tiêu 8 giờ), nước (2 lít), vận động (30 phút), tâm trạng và dinh dưỡng; mỗi thành phần tối đa 100. Đây là chỉ số tham khảo do ứng dụng tính, không phải thước đo y tế. Tương quan hiển thị chỉ là quan sát, không chứng minh nguyên nhân. Calo là ước tính đơn giản 5 kcal/phút.

Ứng dụng chỉ hỗ trợ lối sống, không thay thế tư vấn, chẩn đoán hay điều trị y tế. Gemini trực tiếp cần Internet và API key hợp lệ; chế độ ngoại tuyến không cần hai điều này.
