# Changelog

## [Unreleased]

- Thiết kế popup VYRO theo hướng tối, gọn, mạnh.
- Tách adapter và thử nghiệm TikTok/Facebook Reels; chưa nằm trong bản hiện tại.

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
