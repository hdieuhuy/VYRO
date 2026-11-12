# VYRO

**Lướt theo nhịp của bạn.**

Chrome extension giúp tự chuyển YouTube Shorts, TikTok và Facebook Reels, skip bằng phím tắt và xem video trong cửa sổ Picture in Picture có controls riêng.

> Phiên bản hiện tại: **1.6.0**. Tải ZIP cài đặt ở nút bên dưới; xem [ghi chú bản 1.6.0](https://github.com/hdieuhuy/VYRO/releases/tag/v1.6.0) để biết các thay đổi. Facebook Reels đang ở giai đoạn beta.

[![Latest release](https://img.shields.io/github/v/release/hdieuhuy/VYRO?label=version)](https://github.com/hdieuhuy/VYRO/releases/latest)
[![Checks](https://github.com/hdieuhuy/VYRO/actions/workflows/ci.yml/badge.svg)](https://github.com/hdieuhuy/VYRO/actions/workflows/ci.yml)

**[⬇ Tải bản mới nhất — vyro.zip](https://github.com/hdieuhuy/VYRO/releases/latest/download/vyro.zip)** · **[Tất cả phiên bản](https://github.com/hdieuhuy/VYRO/releases)** · **[Changelog](CHANGELOG.md)**

> Để nhận thông báo phiên bản mới trên GitHub: Watch → Custom → Releases.

## Tính năng

- **Auto Next:** tự chuyển video YouTube Shorts/TikTok/Facebook Reels khi kết thúc; bật/tắt riêng từng nền tảng.
- **Skip ngay:** chuyển clip trước khi xem hết bằng nút hoặc phím tắt.
- **Phím tùy chỉnh:** ghi tổ hợp mới trực tiếp từ popup, có khôi phục mặc định.
- **PiP cho video YouTube thường:** mở player chính trong cửa sổ nổi gốc Chrome bằng nút PiP YouTube; giữ player ở tab nguồn.
- **PiP riêng:** cửa sổ nổi với phát/tạm dừng, âm thanh, skip, tự chuyển, tua video và về tab.
- **Controls khi hover:** hiện khi đưa chuột vào PiP, ẩn khi rời chuột; hỗ trợ focus bàn phím.
- **Khung hình vừa video:** giữ tỷ lệ, căn giữa và sửa lại khi player nguồn thay đổi style/kích thước.
- **Ghi nhớ cài đặt:** bật/tắt tự chuyển và phím cục bộ được lưu trên máy.
- **Logo trạng thái:** màu đỏ khi bật tự chuyển, màu xám khi tắt, theo nền tảng của tab.
- **Âm thanh trong PiP:** giữ lựa chọn tắt/bật tiếng qua các clip trong phiên PiP.

## Nền tảng hỗ trợ

| Nền tảng | Trạng thái |
|---|---|
| YouTube Shorts trên Chrome desktop | Đã có |
| Video YouTube thường `/watch?v=...` | PiP gốc Chrome từ 1.6.0 |
| TikTok desktop | Beta — đã triển khai và kiểm tra tự động; chưa xác nhận trực tiếp trên Chrome |
| Facebook Reels desktop | Beta 1.5.0 — đã triển khai và kiểm tra tự động; cần test trên Facebook thật |

Xem [roadmap và kế hoạch thiết kế](docs/ROADMAP.md). Giao diện hiện tại chưa phải bản thiết kế VYRO 2.0.

## Cài đặt

Yêu cầu Chrome desktop **116 trở lên** để dùng Document PiP. Đây là bản cài thủ công; chưa có bản Chrome Web Store trong repo này.

1. Tải **[vyro.zip](https://github.com/hdieuhuy/VYRO/releases/latest/download/vyro.zip)** và giải nén vào thư mục cố định.
2. Mở `chrome://extensions` trong Chrome.
3. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
4. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
5. Chọn thư mục `vyro` chứa trực tiếp `manifest.json`.
6. Tải lại các tab YouTube/TikTok/Facebook đang mở và ghim VYRO trên thanh công cụ.

Nếu cài từ mã nguồn thay vì ZIP, chọn thư mục **`extension/`**, không chọn thư mục gốc của repo.

## Hướng dẫn sử dụng

### Tự chuyển video

Mở một YouTube Short và phát video. Trong popup VYRO, bật **Tự chuyển video**. Extension chuyển sang clip tiếp theo khi clip kết thúc hoặc vừa phát lại từ đầu vòng lặp.

Tắt tự chuyển vẫn dùng được skip thủ công và PiP. Khi bạn tạm dừng giữa clip, chế độ tự chuyển không tự bỏ qua clip đó.

### Skip bằng phím

| Phạm vi | Windows | macOS |
|---|---|---|
| Trang Shorts/TikTok/Facebook Reels hoặc PiP riêng đang có focus | `Win + /` | `⌘ + /` |
| Lệnh cấp Chrome — phím đề xuất | `Ctrl + Shift + 9` | `⌘ + Shift + 9` |

Đổi phím cục bộ: bấm logo VYRO → **Đổi phím** → giữ Ctrl, Alt hoặc Win/⌘ và nhấn một phím khác. Cài đặt tự lưu; Esc hoặc Tab hủy thao tác ghi phím.

Đổi phím cấp Chrome: bấm **Đổi phím PiP trong Chrome**, hoặc mở `chrome://extensions/shortcuts`. Tìm **Skip Short đang phát, kể cả trong PiP** và chọn **Global / Toàn cục** nếu muốn dùng khi cửa sổ khác có focus. Chrome có thể không gán phím mặc định nếu tổ hợp bị trùng.

Phím cục bộ không kích hoạt trong ô tìm kiếm/bình luận. Tổ hợp bị hệ điều hành hoặc Chrome giữ riêng có thể không dùng được. Phím cục bộ và phím cấp Chrome được quản lý độc lập.

### Picture in Picture riêng

1. Trên trang Shorts, video TikTok hoặc Facebook Reels, bấm nút đỏ **PiP riêng ↗** ở góc dưới bên phải.
2. Đưa chuột vào cửa sổ nổi để thấy controls.
3. Dùng các icon phát/tạm dừng, âm thanh, skip, tự chuyển và về tab. Rê lên từng icon để xem nhãn.
4. Bấm Skip hoặc tổ hợp cục bộ khi PiP có focus để chuyển ngay sang clip mới.
5. Đóng PiP hoặc bấm **Về tab** để trả video về tab nguồn.

Giữ tab nguồn mở khi dùng PiP. Viền đen có thể xuất hiện khi tỷ lệ video khác cửa sổ; đây là cách hiển thị toàn bộ hình và giữ đúng tỷ lệ.

### PiP cho video YouTube thường (từ 1.6.0)

1. Đóng PiP cũ, cập nhật đầy đủ file bản 1.6.0, Reload extension và tải lại tab YouTube.
2. Mở một video thường có URL `https://www.youtube.com/watch?v=...`, chờ video tải hoặc bấm phát.
3. Bấm nút đỏ **PiP YouTube ↗** ở góc dưới bên phải trang. Video mở trong cửa sổ Picture in Picture gốc Chrome, giống kiểu sử dụng extension PiP của Google.
4. Chuyển tab hoặc sang ứng dụng khác để tiếp tục xem; dùng controls Chrome để phát/tạm dừng, đóng hoặc về tab. Giữ tab nguồn mở.
5. Bấm **Đóng PiP YouTube** trên trang hoặc nút đóng của cửa sổ nổi để thoát.

PiP video thường dùng `HTMLVideoElement.requestPictureInPicture()`, không di chuyển hoặc sửa khung hình player YouTube. Giao diện controls do Chrome quản lý. Nút mở cần thao tác click trực tiếp; không tự bật PiP khi vào trang. Công tắc tự chuyển và phím Skip Shorts không chuyển video thường. Các player preview ở trang chủ/kết quả tìm kiếm không được chọn. PiP riêng có controls tùy chỉnh vẫn dùng cho Shorts/TikTok/Reels.

Tài liệu API: [Chrome Picture in Picture](https://developer.chrome.com/blog/watch-video-using-picture-in-picture). Môi trường phát triển đã kiểm tra tự động, chưa kiểm chứng trực tiếp trên Chrome thật.

### TikTok (từ 1.4.0)

1. Cập nhật đầy đủ file extension và Reload trong `chrome://extensions`. Chrome có thể yêu cầu xác nhận quyền chạy trên TikTok vừa được thêm.
2. Tải lại tab TikTok. Dùng feed **For You/Following/Friends**, hoặc mở một video để URL có dạng `/@user/video/<id>`.
3. Bấm logo VYRO: popup tự chọn TikTok khi liên lạc được với tab; bạn cũng có thể chọn **TikTok** trong mục nền tảng.
4. Bật/tắt **Tự chuyển video** để điều khiển riêng TikTok. Cài đặt này không thay đổi công tắc YouTube.
5. Để dùng đầy đủ controls, bấm **PiP riêng ↗** trên trang. Trong PiP: Skip, phát/tạm dừng, tắt/bật tiếng, tua và công tắc tự chuyển; hover để hiện controls.
6. Skip thủ công bằng phím hoặc nút vẫn hoạt động khi tắt tự chuyển. Phím đã tùy chỉnh dùng chung cho hai nền tảng.

**Phạm vi beta:** video HTML5 trên TikTok desktop, feed `/`, `/foryou`, `/following`, `/friends` và trang video. Không tự điều khiển livestream, bài ảnh, trang hồ sơ hay video preview ở lưới Explore/search. Nếu ở Explore, bấm mở video trước. Không thao tác đăng nhập hoặc CAPTCHA thay người dùng.

TikTok có thể thay đổi DOM/player. Bản này chưa được kiểm chứng trực tiếp trong Chrome do công cụ local browser bị tắt ở môi trường phát triển; không coi kiểm tra mô phỏng là bằng chứng tương thích mọi giao diện TikTok. Nếu gặp lỗi, gửi URL, phiên bản và thao tác tái hiện.

### Facebook Reels (beta từ 1.5.0)

1. Cập nhật mã nguồn mới vào thư mục extension đang dùng, đóng PiP cũ rồi Reload VYRO tại `chrome://extensions`.
2. Cho phép extension truy cập Facebook nếu Chrome yêu cầu, sau đó tải lại tab Facebook.
3. Mở [Facebook Reels](https://www.facebook.com/reels/) và phát một Reel. Hỗ trợ đường dẫn `/reel/<id>/`, `/reels/`, `/reels/<id>` và `/watch/reels/`.
4. Mở popup: cần thấy **Phiên bản 1.6.0**, **Tab đã kết nối** và nền tảng **Facebook Reels**. Công tắc tự chuyển của Facebook độc lập với YouTube/TikTok.
5. Video hết hoặc phát lặp từ đầu sẽ chuyển tiếp. Tắt công tắc để dừng tự chuyển; vẫn dùng được Skip thủ công.
6. Bấm **PiP riêng ↗** để dùng cùng controls với YouTube: phát/tạm dừng, tắt/bật tiếng, Skip, tự chuyển, tua và về tab. Controls ẩn khi không hover/focus, video căn giữa và giữ tỷ lệ.
7. Skip bằng **Win/⌘ + /**, tổ hợp đã tùy chỉnh hoặc phím cấp Chrome. Click vào PiP riêng để phím cục bộ nhận focus; phím không can thiệp ô nhập bình luận.

**Từ bản 1.6.0:** tự bỏ qua Reel có nhãn “Được tài trợ”/“Sponsored” (và nhãn quảng cáo tương đương tiếng Anh/Việt), ngay cả khi tắt tự chuyển clip thường. Chỉ kiểm tra nhãn trong Reel đang xem; bỏ qua nhãn ẩn và nội dung/bình luận nhắc tới quảng cáo. Khi dùng PiP riêng, tạm dừng quảng cáo, giữ cửa sổ và hiện thông báo chờ rồi phát tiếp clip thường với lựa chọn mute cũ. Điều hướng có cooldown, tối đa 8 lần thử trên cùng một mục; có thể bấm Skip để thử lại nếu bị kẹt. Cần test trên Facebook thật để xác nhận các bố cục/nhãn khác nhau.

**Bản 1.6.0** bổ sung nhãn chữ thuần `span/div` dưới nút “Mua ngay”/“Shop now”. Khi video nằm trong PiP, kiểm tra cả phần thông tin bên cạnh wrapper ở tab nguồn; phần giữ chỗ được tính như một player để không quét sang Reel khác. Nhãn chữ thuần cần có CTA quảng cáo đi kèm, không coi nút “Mua ngay” đơn lẻ là quảng cáo.

Điều hướng ưu tiên nút next trong trình xem Reels (nhãn tiếng Anh/Việt), sau đó thử Reel kế tiếp hoặc cuộn luồng khi nút không hoạt động. Khi chuyển player trong PiP, tiếp tục phát nếu clip trước đang phát/đã kết thúc và giữ lựa chọn mute. Dừng clip cũ để tránh hai nguồn âm thanh.

**Giới hạn beta:** Chrome desktop, player HTML5; không hỗ trợ Facebook mobile, News Feed thông thường, Stories, Watch tổng quát hoặc LIVE. Không xử lý đăng nhập/CAPTCHA thay người dùng. Chưa kiểm chứng trực tiếp với tài khoản Facebook thật vì công cụ local browser của môi trường hiện tại bị tắt; bố cục Facebook khác có thể cần cập nhật selector. Bản 1.5.0 đã được người dùng test và xác nhận cho phép phát hành. Tải ZIP tại nút đầu README.

Để nghiệm thu: thử 10 Reel liên tiếp ngoài PiP và trong PiP; thử tắt auto rồi skip bằng nút/phím; thử pause, mute qua lần đổi clip, tua, resize, về tab; xác nhận News Feed/Stories không hiện nút PiP VYRO.

## Cập nhật lên phiên bản mới

1. Đóng PiP cũ.
2. Tải ZIP mới từ nút **Tải bản mới nhất** ở đầu README.
3. Giải nén và thay các file trong thư mục VYRO bạn đang dùng, giữ nguyên đường dẫn thư mục.
4. Tại `chrome://extensions`, bấm **Reload** trên thẻ VYRO.
5. Tải lại tab YouTube/TikTok/Facebook rồi mở PiP lại.

**Cài từ ZIP không tự cập nhật qua Chrome.** Chỉ tải ZIP mới chưa thay đổi mã đang chạy trong tab/PiP cũ. Nếu dùng repo git, `git pull` rồi thực hiện Reload và tải lại tab nguồn.

## Khắc phục sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Video không chuyển | Kiểm tra đang ở `/shorts/...`, đã bật tự chuyển và nút tiếp theo của YouTube còn hoạt động; tải lại tab |
| PiP vẫn dùng giao diện cũ | Đóng PiP, Reload extension, tải lại YouTube, mở PiP mới |
| Video bị phóng/cắt | Kiểm tra phiên bản extension và tải lại tab; nếu còn lỗi, gửi URL clip, phiên bản Chrome/extension và mô tả thao tác tái hiện |
| Phím không nhận trong PiP extension khác | Thử PiP riêng của VYRO; phím cục bộ chỉ nhận trong trang/PiP riêng |
| Phím cấp Chrome không nhận | Kiểm tra tổ hợp được gán và phạm vi Global tại `chrome://extensions/shortcuts` |
| TikTok không có nút PiP | Tải lại tab, kiểm tra bản 1.4.0+, mở trang video thay vì lưới Explore/hồ sơ/LIVE và kiểm tra quyền truy cập TikTok |
| Facebook không hoạt động | Kiểm tra bản 1.5.0, quyền truy cập Facebook, Reload extension và tab; mở trình xem `/reel/<id>/` hoặc `/reels/` rồi phát một clip |

YouTube/TikTok/Facebook có thể thay đổi cấu trúc trang khiến việc nhận diện player hoặc chuyển clip cần cập nhật. PiP tương thích với cửa sổ video chuẩn của Chrome và PiP riêng; không bảo đảm mọi extension PiP khác. VYRO không chặn yêu cầu mạng hoặc xóa quảng cáo; từ bản 1.6.0 có thể chuyển qua Reel được tài trợ khi nhận diện được nhãn.

## Quyền và dữ liệu

- Quyền `storage`: lưu cài đặt trên máy.
- Content script chạy trên `https://www.youtube.com/*`, `https://youtube.com/*`, `https://www.tiktok.com/*`, `https://tiktok.com/*`, `https://www.facebook.com/*` và `https://facebook.com/*` để hỗ trợ điều hướng trong trang mà không tải lại. Chỉ xử lý Facebook trong các đường dẫn Reels được hỗ trợ; không xin quyền trên mọi website.
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
