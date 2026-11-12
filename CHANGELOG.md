# Changelog

## [Unreleased]

- Thiết kế popup VYRO theo hướng tối, gọn, mạnh.
- Tiếp tục nghiệm thu Facebook Reels beta trên trình duyệt thật.

## [1.6.1] - 2026-11-12

### Fixed
- Nhận diện nhãn quảng cáo độc lập trong Facebook Reels, không yêu cầu nút CTA thuộc danh sách Mua ngay/Shop now.
- Tự skip cả khi nút có nội dung Xem chi tiết, Đánh giá, nội dung bất kỳ, bị ẩn hoặc chưa có nút.
- Giữ kiểm tra đúng Reel, nhãn hiển thị và loại trừ caption/bình luận/tiêu đề; không suy ra quảng cáo từ CTA đơn lẻ.

### Validation
- 99 kiểm tra tự động đạt, gồm skip quảng cáo khi auto tắt và PiP mở, các CTA khác nhau và không có CTA.
- Môi trường phát triển chưa kiểm chứng trực tiếp trên Facebook thật. Phát hành ZIP theo phiên bản, ZIP tên cố định và mã SHA-256 qua GitHub Release.

## [1.6.0] - 2026-11-12

### Added
- PiP gốc Chrome cho video YouTube thường tại `/watch?v=...`, mở/đóng qua nút PiP YouTube trên trang.
- Chọn video thuộc player chính, bỏ qua preview/gợi ý; giữ nguyên phần tử video và style trong tab nguồn.
- Popup phân biệt PiP gốc Chrome của video thường với PiP riêng của Shorts/Reels, giải thích công tắc auto chỉ áp dụng cho Shorts.
- Tự bỏ qua Facebook Reel được tài trợ/Sponsored, kể cả khi tắt tự chuyển clip thường; giữ PiP và lựa chọn mute khi tiếp tục clip thường.

### Fixed
- Nhận diện nhãn quảng cáo bằng chữ thuần dưới CTA Mua ngay/Shop now và metadata ở tab nguồn khi video đang trong PiP.
- Tính phần giữ chỗ PiP như một player để vùng kiểm tra quảng cáo không tràn sang Reel khác; bỏ qua caption/bình luận và nhãn ẩn.
- Điều hướng quảng cáo có cooldown và tối đa 8 lần thử mỗi mục, tránh chuyển trùng; Skip thủ công cho phép thử lại.

### Behavior / validation
- PiP YouTube thường mở bằng thao tác click; hiển thị lỗi khi metadata/API chưa sẵn sàng, chặn mở trùng và khôi phục thuộc tính disablepictureinpicture sau khi đóng/lỗi.
- Không tự phát video đang tạm dừng; phím/lệnh Skip Shorts không điều hướng video thường.
- 97 kiểm tra tự động đạt. Môi trường phát triển chưa kiểm chứng trực tiếp các thay đổi mới trên Chrome/Facebook thật.
- GitHub Release kèm `vyro.zip`, `vyro-1.6.0.zip` và SHA-256. Bao gồm các bản sửa local 1.5.1/1.5.2 chưa phát hành riêng.

## [1.5.0] - 2026-11-11

### Added
- Adapter Facebook Reels desktop cho `/reel/<id>/`, `/reels/`, `/reels/<id>` và `/watch/reels/`.
- Auto-next khi hết clip hoặc bắt đầu vòng lặp; Skip bằng controls, tổ hợp tùy chỉnh dùng chung và lệnh cấp Chrome.
- PiP riêng dùng chung với YouTube: phát/tạm dừng, mute, Skip, bật/tắt auto, tua, về tab; controls theo hover/focus và khung hình giữ tỷ lệ.
- Cài đặt `enabledFacebook` độc lập, popup nhận diện tab Facebook, hiển thị trạng thái kết nối và icon theo công tắc Facebook.
- Content script cho `facebook.com`/`www.facebook.com`, không điều khiển News Feed thông thường hoặc Stories.

### Behavior / validation
- Điều hướng ưu tiên nút next tiếng Anh/Việt trong viewer rồi thử cuộn qua card/luồng; chọn video chính, bỏ qua player tải trước ngoài màn hình.
- Đổi clip trong PiP tiếp tục phiên đang phát, giữ mute và dừng player cũ để tránh tiếng chạy nền.
- 74 kiểm tra tự động đạt, gồm kiểm tra hồi quy và Facebook Reels. Người dùng đã test bản 1.5.0 và xác nhận cho phép phát hành; công cụ local browser của môi trường phát triển vẫn bị tắt.
- Phát hành ZIP theo phiên bản, ZIP tên cố định `vyro.zip` và mã SHA-256 qua GitHub Release.

## [1.4.0] - 2026-11-11

### Added
- Tích hợp TikTok desktop: skip bằng nút/phím, tự chuyển sau kết thúc hoặc vòng lặp.
- Dùng PiP riêng chung với YouTube: phát/tạm dừng, tắt/bật tiếng, tua, skip, tự chuyển và về tab.
- Công tắc tự chuyển riêng cho TikTok, được popup tự chọn khi đang mở tab TikTok; có thể đổi nền tảng trong popup.
- Logo/tooltip theo trạng thái tự chuyển của từng tab YouTube/TikTok.
- Content script trên `www.tiktok.com` và `tiktok.com`.
- Kiểm tra cho nhận diện video, điều hướng dự phòng, cài đặt độc lập và các controls PiP.

### Fixed
- Dùng vị trí phần tử giữ chỗ ở tab nguồn để không chuyển PiP sang video tải trước khi clip hiện tại còn hiển thị.
- Giữ lựa chọn mute trong phiên PiP qua các clip tiếp theo.

### Validation / scope
- Hỗ trợ mã cho feed `/`, `/foryou`, `/following`, `/friends` và trang `/@user/video/<id>`; không chạy trên LIVE, hồ sơ, lưới Explore/search hoặc bài ảnh.
- TikTok là bản beta: kiểm tra tự động đã thực hiện; chưa thử trực tiếp trên TikTok trong Chrome vì local browser đang bị tắt trong Work settings.
- Facebook Reels chưa được triển khai.

## [1.3.3] - 2026-11-11

### Added
- Repository VYRO với README giới thiệu, cài đặt, sử dụng, cập nhật và download.
- Đóng gói ZIP có tên ổn định và ZIP theo phiên bản, kèm SHA-256.
- CI kiểm tra và GitHub Actions tạo Release khi push tag phiên bản.
- CHANGELOG, hướng dẫn phát hành và tài liệu roadmap.

### Changed
- Đổi tên hiển thị extension thành **VYRO — Shorts Auto Next & PiP**.
- Giữ giao diện và hành vi player hiện tại; thiết kế VYRO 2.0 vẫn thuộc roadmap.

## [1.3.2] - 2026-11-11

### Fixed
- Căn video giữa PiP với chế độ giữ tỷ lệ, sửa vị trí/phép biến đổi do player nguồn ghi lại.
- Căn lại khi đổi video, tải metadata hoặc thay đổi kích thước.
- Dọn observer/listeners và khôi phục style khi trả video về trang.

## [1.3.1] - 2026-11-11

### Changed
- Controls PiP thành lớp phủ, hiện khi hover hoặc focus bàn phím.
- Chuyển các nút sang icon SVG với tooltip và nhãn trợ năng.
- Video dùng toàn bộ vùng nội dung của PiP.

## [1.3.0] - 2026-11-11

### Added
- PiP riêng với skip, phát/tạm dừng, âm thanh, tua video, tự chuyển và về tab.
- Lệnh cấp Chrome, tìm tab đang sở hữu PiP để gửi lệnh skip.

## [1.2.0] - 2026-11-11

### Added
- Skip thủ công bằng Win/⌘ + / và tổ hợp tùy chỉnh trong popup.
- Khôi phục phím mặc định; bỏ qua ô nhập, IME và phím giữ.

## [1.1.0] - 2026-11-11

### Fixed
- Giữ phát lặp, thử cách chuyển dự phòng khi bấm nút tiếp theo không có tác dụng.
- Mở rộng nhận diện nút điều hướng ngoài phần tử `ytd-shorts`.

### Added
- Logo đỏ khi bật tự chuyển, xám khi tắt.

## [1.0.0] - 2026-11-11

### Added
- Manifest V3, tự chuyển YouTube Shorts và popup bật/tắt.
- Lưu cài đặt trên máy.

Các mục 1.0.0–1.3.2 ghi lại các bản làm trước khi đưa mã lên GitHub; không khẳng định có tag hoặc Release GitHub tương ứng. Mục changelog mô tả thay đổi mã, không thay thế kiểm chứng đầy đủ trên mọi hệ điều hành.
