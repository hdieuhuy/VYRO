# VYRO

**Lướt theo nhịp của bạn.**

Chrome extension giúp tự chuyển YouTube Shorts, skip bằng phím tắt và xem video trong cửa sổ Picture in Picture có controls riêng.

[![Latest release](https://img.shields.io/github/v/release/hdieuhuy/VYRO?label=version)](https://github.com/hdieuhuy/VYRO/releases/latest)
[![Checks](https://github.com/hdieuhuy/VYRO/actions/workflows/ci.yml/badge.svg)](https://github.com/hdieuhuy/VYRO/actions/workflows/ci.yml)

**[⬇ Tải bản mới nhất — vyro.zip](https://github.com/hdieuhuy/VYRO/releases/latest/download/vyro.zip)** · **[Tất cả phiên bản](https://github.com/hdieuhuy/VYRO/releases)** · **[Changelog](CHANGELOG.md)**

> Link tải hoạt động sau khi GitHub Release đầu tiên đã được tạo thành công. Để nhận thông báo phiên bản mới trên GitHub: Watch → Custom → Releases.

## Tính năng

- **Auto Next:** tự chuyển sang Short tiếp theo khi video kết thúc.
- **Skip ngay:** chuyển clip trước khi xem hết bằng nút hoặc phím tắt.
- **Phím tùy chỉnh:** ghi tổ hợp mới trực tiếp từ popup, có khôi phục mặc định.
- **PiP riêng:** cửa sổ nổi với phát/tạm dừng, âm thanh, skip, tự chuyển, tua video và về tab.
- **Controls khi hover:** hiện khi đưa chuột vào PiP, ẩn khi rời chuột; hỗ trợ focus bàn phím.
- **Khung hình vừa video:** giữ tỷ lệ, căn giữa và sửa lại khi player nguồn thay đổi style/kích thước.
- **Ghi nhớ cài đặt:** bật/tắt tự chuyển và phím cục bộ được lưu trên máy.
- **Logo trạng thái:** màu đỏ khi bật tự chuyển, màu xám khi tắt.

## Nền tảng hỗ trợ

| Nền tảng | Trạng thái |
|---|---|
| YouTube Shorts trên Chrome desktop | Đã có |
| TikTok | Trong kế hoạch |
| Facebook Reels | Trong kế hoạch |

Xem [roadmap và kế hoạch thiết kế](docs/ROADMAP.md). Giao diện hiện tại chưa phải bản thiết kế VYRO 2.0.

## Cài đặt

Yêu cầu Chrome desktop **116 trở lên** để dùng Document PiP. Đây là bản cài thủ công; chưa có bản Chrome Web Store trong repo này.

1. Tải **[vyro.zip](https://github.com/hdieuhuy/VYRO/releases/latest/download/vyro.zip)** và giải nén vào thư mục cố định.
2. Mở `chrome://extensions` trong Chrome.
3. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
4. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
5. Chọn thư mục `vyro` chứa trực tiếp `manifest.json`.
6. Tải lại các tab YouTube đang mở và ghim VYRO trên thanh công cụ.

Nếu cài từ mã nguồn thay vì ZIP, chọn thư mục **`extension/`**, không chọn thư mục gốc của repo.

## Hướng dẫn sử dụng

### Tự chuyển video

Mở một YouTube Short và phát video. Trong popup VYRO, bật **Tự chuyển video**. Extension chuyển sang clip tiếp theo khi clip kết thúc hoặc vừa phát lại từ đầu vòng lặp.

Tắt tự chuyển vẫn dùng được skip thủ công và PiP. Khi bạn tạm dừng giữa clip, chế độ tự chuyển không tự bỏ qua clip đó.

### Skip bằng phím

| Phạm vi | Windows | macOS |
|---|---|---|
| Trang Shorts hoặc PiP riêng đang có focus | `Win + /` | `⌘ + /` |
| Lệnh cấp Chrome — phím đề xuất | `Ctrl + Shift + 9` | `⌘ + Shift + 9` |

Đổi phím cục bộ: bấm logo VYRO → **Đổi phím** → giữ Ctrl, Alt hoặc Win/⌘ và nhấn một phím khác. Cài đặt tự lưu; Esc hoặc Tab hủy thao tác ghi phím.

Đổi phím cấp Chrome: bấm **Đổi phím PiP trong Chrome**, hoặc mở `chrome://extensions/shortcuts`. Tìm **Skip Short đang phát, kể cả trong PiP** và chọn **Global / Toàn cục** nếu muốn dùng khi cửa sổ khác có focus. Chrome có thể không gán phím mặc định nếu tổ hợp bị trùng.

Phím cục bộ không kích hoạt trong ô tìm kiếm/bình luận. Tổ hợp bị hệ điều hành hoặc Chrome giữ riêng có thể không dùng được. Phím cục bộ và phím cấp Chrome được quản lý độc lập.

### Picture in Picture riêng

1. Trên trang Shorts, bấm nút đỏ **PiP riêng ↗** ở góc dưới bên phải.
2. Đưa chuột vào cửa sổ nổi để thấy controls.
3. Dùng các icon phát/tạm dừng, âm thanh, skip, tự chuyển và về tab. Rê lên từng icon để xem nhãn.
4. Bấm Skip hoặc tổ hợp cục bộ khi PiP có focus để chuyển ngay sang clip mới.
5. Đóng PiP hoặc bấm **Về tab** để trả video về trang YouTube.

Giữ tab nguồn mở khi dùng PiP. Viền đen có thể xuất hiện khi tỷ lệ video khác cửa sổ; đây là cách hiển thị toàn bộ hình và giữ đúng tỷ lệ.

## Cập nhật lên phiên bản mới

1. Đóng PiP cũ.
2. Tải ZIP mới từ nút **Tải bản mới nhất** ở đầu README.
3. Giải nén và thay các file trong thư mục VYRO bạn đang dùng, giữ nguyên đường dẫn thư mục.
4. Tại `chrome://extensions`, bấm **Reload** trên thẻ VYRO.
5. Tải lại tab YouTube rồi mở PiP lại.

**Cài từ ZIP không tự cập nhật qua Chrome.** Chỉ tải ZIP mới chưa thay đổi mã đang chạy trong tab/PiP cũ. Nếu dùng repo git, `git pull` rồi thực hiện Reload và tải lại YouTube.

## Khắc phục sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Video không chuyển | Kiểm tra đang ở `/shorts/...`, đã bật tự chuyển và nút tiếp theo của YouTube còn hoạt động; tải lại tab |
| PiP vẫn dùng giao diện cũ | Đóng PiP, Reload extension, tải lại YouTube, mở PiP mới |
| Video bị phóng/cắt | Kiểm tra phiên bản extension và tải lại tab; nếu còn lỗi, gửi URL clip, phiên bản Chrome/extension và mô tả thao tác tái hiện |
| Phím không nhận trong PiP extension khác | Thử PiP riêng của VYRO; phím cục bộ chỉ nhận trong trang/PiP riêng |
| Phím cấp Chrome không nhận | Kiểm tra tổ hợp được gán và phạm vi Global tại `chrome://extensions/shortcuts` |
| TikTok/Facebook không hoạt động | Hai nền tảng này chưa được triển khai |

YouTube có thể thay đổi cấu trúc trang khiến việc nhận diện player hoặc chuyển clip cần cập nhật. PiP tương thích với cửa sổ video chuẩn của Chrome và PiP riêng; không bảo đảm mọi extension PiP khác. VYRO không có chức năng chặn quảng cáo.

## Quyền và dữ liệu

- Quyền `storage`: lưu cài đặt trên máy.
- Content script chỉ chạy trên `https://www.youtube.com/*` và `https://youtube.com/*` để hỗ trợ điều hướng vào Shorts mà không tải lại trang.
- Không cần tài khoản VYRO, không có backend, không gửi dữ liệu xem video tới máy chủ, không tải/lưu video.

## Phát triển và phát hành

```bash
git clone git@github.com:hdieuhuy/VYRO.git
cd VYRO
node --test tests/*.test.cjs
python3 scripts/package.py
```

Node.js 24 và Python 3.10+ là môi trường kiểm tra/đóng gói đề xuất; không cần npm install. Extension chạy trực tiếp từ thư mục `extension/`.

Sau khi chạy đóng gói:

- `dist/vyro.zip`: tên cố định cho link tải bản mới nhất.
- `dist/vyro-<version>.zip`: file theo từng phiên bản.
- `dist/SHA256SUMS.txt`: mã kiểm tra file tải.
- `dist/release-notes.md`: phần changelog tương ứng.

Để ra phiên bản mới, xem **[hướng dẫn phát hành](docs/RELEASING.md)**. Workflow kiểm tra mỗi push/PR; workflow release chạy khi push tag `vX.Y.Z` và tự đính kèm ZIP vào GitHub Releases.

## Changelog

Xem **[CHANGELOG.md](CHANGELOG.md)** cho lịch sử đầy đủ. Mỗi GitHub Release cũng có ghi chú thay đổi riêng.

## Báo lỗi

Tạo [GitHub Issue](https://github.com/hdieuhuy/VYRO/issues) kèm phiên bản VYRO, phiên bản Chrome, hệ điều hành, URL clip nếu có thể chia sẻ và các bước tái hiện.
