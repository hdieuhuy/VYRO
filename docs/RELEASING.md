# Phát hành VYRO

## Chuẩn bị

1. Tăng `version` trong `extension/manifest.json` theo định dạng `X.Y.Z`.
2. Chuyển các thay đổi cần phát hành từ `[Unreleased]` sang `## [X.Y.Z] - YYYY-MM-DD` trong CHANGELOG.
3. Chạy kiểm tra, đóng gói và thử trên Chrome thật. Kiểm tra cả video mới, player tái sử dụng, PiP, phím tắt, Fit và đóng/mở cửa sổ.

```bash
node --test tests/*.test.cjs
python3 scripts/package.py
```

Workflow sẽ từ chối nếu tag không trùng manifest hoặc không có mục changelog tương ứng.

## Push mã và tạo Release

Ví dụ bản đầu trong repository:

```bash
git add .
git commit -m "Release VYRO 1.3.3"
git push origin main
git tag -a v1.3.3 -m "VYRO 1.3.3"
git push origin v1.3.3
```

Với các lần tiếp theo thay `1.3.3` bằng phiên bản mới. Chỉ tạo tag sau khi mã đã được kiểm tra và nằm trên nhánh chính. Không tái sử dụng/di chuyển tag đã phát hành.

GitHub Actions `Release` sẽ chạy tests, tạo ZIP và publish GitHub Release từ tag, kèm ghi chú CHANGELOG và SHA-256. Repository cần bật Actions; workflow đã khai báo quyền `contents: write` chỉ cho job phát hành. Nếu tổ chức chặn quyền ghi từ Actions, owner cần điều chỉnh chính sách thích hợp.

## Tải xuống

- [Bản mới nhất](https://github.com/hdieuhuy/VYRO/releases/latest/download/vyro.zip)
- [Danh sách Releases](https://github.com/hdieuhuy/VYRO/releases)

Asset `vyro.zip` có tên giống nhau ở mọi release nên nút download trong README không cần sửa mỗi lần tăng phiên bản. File `vyro-X.Y.Z.zip` cho biết chính xác phiên bản đã tải.

ZIP chỉ chứa extension và hướng dẫn ngắn. Không dùng hai file Source code do GitHub tự tạo làm đường cài đặt chính; nếu tải source, phải chọn thư mục `extension/` khi Load unpacked.

## Kiểm tra sau phát hành

1. Mở Actions và xác nhận job Release thành công.
2. Mở Releases, kiểm tra version, ghi chú và đủ file ZIP/SHA256SUMS.
3. Thử link tải bản mới nhất trong README.
4. Giải nén ZIP, Load unpacked và kiểm tra version trong Chrome.

Cài unpacked không tự cập nhật. Người dùng cần thay file, Reload extension, tải lại tab nguồn và mở lại PiP.
