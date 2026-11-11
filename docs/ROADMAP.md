> Cập nhật 1.5.0 local: đã triển khai adapter Facebook Reels, controls PiP, auto-next và phím tắt; chưa nghiệm thu trên Facebook thật. Các giai đoạn/điều kiện bên dưới là kế hoạch, không phải bằng chứng đã đạt. Xem README và CHANGELOG để biết phạm vi bản hiện tại.

# VYRO — kế hoạch thiết kế và mở rộng extension

Ngày lập: 11/11/2026. Trạng thái: đề xuất để phát triển; chưa đổi tên, giao diện hoặc quyền của extension đang cài.

## 1. Định hướng sản phẩm

**Tên làm việc đề xuất: VYRO.** Slogan: **Lướt theo nhịp của bạn.**

Một bộ điều khiển video ngắn trên Chrome desktop: tự chuyển video, skip bằng phím và xem trong PiP có controls riêng. YouTube Shorts, TikTok và Facebook Reels dùng cùng cách điều khiển, nhưng mỗi nền tảng có phần tích hợp riêng.

Người dùng chính: người vừa làm việc vừa xem video, thích cửa sổ nổi và thao tác bằng bàn phím.

Định vị: công cụ nhỏ, phản hồi nhanh, kiểm soát rõ ràng. Phong cách đã chọn: **tối, gọn, mạnh — kiểu công cụ cao cấp**.

## 2. Các tên để cân nhắc

| Tên | Cảm giác | Đánh đổi |
|---|---|---|
| **VYRO** | Ngắn, cá tính, hợp biểu tượng toolbar | Cần slogan giải thích chức năng |
| **ReelPilot** | Người điều khiển luồng video | Dễ liên tưởng chủ yếu tới Reels |
| **FlowSkip** | Thao tác liên tục, tên rõ chức năng | Ít nhấn mạnh PiP |
| **ClipDrift** | Thư giãn, xem trong cửa sổ nổi | Cảm giác thiên giải trí |
| **Nextora** | Chuyển tiếp, phù hợp mở rộng | Chức năng không rõ nếu đứng riêng |
| **FramePilot** | Kiểm soát player và khung hình | Dài hơn khi làm wordmark |

Đây là ý tưởng tên, chưa kiểm tra quyền nhãn hiệu, tên miền hay khả năng dùng trên Chrome Web Store. Trước khi phát hành: tra cứu tên trùng, chọn tên cuối, rồi mới tạo bộ nhận diện và metadata cửa hàng.

## 3. Hiện trạng và việc cần giải quyết

Bản nền hiện tại là 1.3.2, Manifest V3, JavaScript/CSS thuần, không có bước build. Có popup bật/tắt, phím cục bộ tùy chỉnh, lệnh cấp Chrome, PiP riêng, controls dạng icon hiện khi hover và cơ chế căn khung. Mã chỉ tích hợp YouTube. Bộ kiểm tra hiện có 23 ca; không thay thế kiểm tra với trang thật.

Các vấn đề thiết kế:

- Popup chứa nhiều đoạn hướng dẫn, phải đọc nhiều mới biết thao tác chính.
- Chưa thể hiện rõ đang điều khiển tab nào, video nào và phiên bản đang được tab đó sử dụng.
- Công tắc bật/tắt tự chuyển và khả năng skip thủ công dễ bị hiểu nhầm là cùng trạng thái.
- Hai loại phím tắt có phạm vi khác nhau nhưng chưa giải thích đủ trực quan.
- Chưa có màn hình cài đặt riêng cho từng nền tảng.

Các vấn đề kỹ thuật cần xử lý trước khi mở rộng:

- Xác minh khung video sau chuyển clip và sau khi YouTube ghi lại style.
- Đồng bộ đúng tab nguồn, PiP và video đang được trang kích hoạt.
- Xác nhận chuyển clip thành công trước khi thử lại, có giới hạn số lần thử.
- Phát hiện content script cũ sau khi extension cập nhật để hướng dẫn tải lại đúng tab.
- Dọn timer, observer, listeners và khôi phục video khi đóng PiP hoặc rời trang.

## 4. Hướng giao diện

Giữ điểm nhấn mint đang có trong PiP, mở rộng thành hệ màu chung. Đề xuất nền #111315, bề mặt #1B1F23, chữ #F4F6F8, chữ phụ #A7B0B8, điểm nhấn #7DE4BC. Dùng đỏ cho lỗi và hành động cần chú ý. Màu phải được kiểm tra độ tương phản trước khi chốt.

Font hệ thống, cỡ chữ nội dung 13–14 px; nhãn phụ 11–12 px. Một bộ icon SVG nét nhất quán. Không cần thêm framework chỉ để đổi diện mạo.

Năm phương án bố cục cần so sánh ở vòng mockup:

| Phương án | Trọng tâm | Cấu trúc |
|---|---|---|
| A — Command Deck | Thao tác chính rõ nhất | Trạng thái nguồn → Mở PiP → Tự chuyển → Phím skip |
| B — Platform Hub | Quản lý ba nền tảng | Nền tảng đang dùng + danh sách kết nối/quyền từng nền tảng |
| C — Mini Remote | Tối thiểu thao tác | PiP, Skip và công tắc; mọi cấu hình chuyển sang trang cài đặt |
| D — Context Panel | Chỉ hiện phần cần thiết | Màn hình đổi theo tab hỗ trợ, tab chưa cấp quyền, PiP đang mở |
| E — Studio | Nhận diện thương hiệu mạnh | Wordmark nổi bật, khu vực player lớn, tùy chỉnh nhiều hơn |

**Đề xuất:** dùng A cho bố cục chính và D cho các trạng thái. B phù hợp trang cài đặt nền tảng. Tất cả mockup dùng cùng dữ liệu mẫu để so sánh công bằng; chưa chọn thiết kế cuối trước khi xem mockup.

### Popup mới

Kích thước mục tiêu khoảng 360 px ngang, ưu tiên không cuộn ở trạng thái bình thường.

Thứ tự nội dung:

1. Wordmark VYRO, trạng thái và nút cài đặt.
2. Nguồn đang điều khiển: YouTube Shorts / TikTok / Facebook Reels; tiêu đề video rút gọn.
3. Hành động chính: **Mở PiP** hoặc **Đến PiP** nếu cửa sổ đã mở.
4. Hành động phụ: **Skip**, công tắc **Tự chuyển khi hết video**.
5. Phím skip hiện tại và lối vào chỉnh sửa.
6. Phiên bản; cảnh báo tải lại tab nếu script cũ, chỉ hiện khi cần.

Các trạng thái bắt buộc: đang tải; đang phát; tạm dừng; tự chuyển tắt; PiP đang mở; chưa có video; chưa hỗ trợ trang; chưa có quyền nền tảng; cần tải lại tab; không chuyển được clip.

Không dùng một chấm xanh để đại diện mọi trạng thái. Ví dụ: “Tự chuyển: Tắt” nhưng “Skip và PiP vẫn dùng được”.

### Trang cài đặt

- Chung: giao diện, ngôn ngữ Việt/Anh, hành vi khi video kết thúc.
- Nền tảng: bật/tắt và cấp quyền riêng cho từng website.
- PiP: Fit/Fill, căn lại, ẩn controls, kích thước khởi tạo.
- Phím tắt: phím cục bộ trong trang/PiP riêng và phím toàn cục của Chrome trình bày thành hai nhóm có ví dụ phạm vi hoạt động.
- Chẩn đoán: phiên bản extension/script, trạng thái adapter, khôi phục cài đặt và xuất báo cáo theo thao tác người dùng.

### PiP

- Mặc định **Fit**: thấy toàn bộ hình và giữ đúng tỷ lệ; chấp nhận viền đen nếu tỷ lệ cửa sổ khác video.
- **Fill** là lựa chọn chủ động, có mô tả rõ sẽ cắt một phần hình để lấp đầy cửa sổ.
- Tự căn sau đổi video, metadata và thay đổi kích thước; nút “Căn lại” để xử lý thủ công khi cần.
- Controls chỉ hiện khi hover hoặc điều hướng bằng bàn phím, đúng yêu cầu đã chốt.
- Hàng chính: phát/tạm dừng, âm thanh, Skip, tự chuyển, về tab. Fit/Fill và tùy chọn ít dùng đặt trong menu phụ khi thiếu chỗ.
- Trạng thái tự chuyển có màu và nhãn; icon có tooltip và tên trợ năng.

Document PiP cho phép nội dung HTML và controls tùy chỉnh. Cửa sổ phụ gắn với trang mở nó; việc mở cần thao tác người dùng, và website không được tự đặt vị trí cửa sổ. Vì vậy kế hoạch không hứa tự mở hoặc tự di chuyển PiP tùy ý. Nguồn: https://developer.chrome.com/docs/web-platform/document-picture-in-picture

## 5. Phạm vi mở rộng nền tảng

| Nền tảng | Phạm vi đầu tiên | Để sau |
|---|---|---|
| YouTube | Trang Shorts desktop và chuyển từ trang chủ vào Shorts | Video dài, livestream |
| TikTok | Trang xem video và một luồng dọc được chọn sau khảo sát | LIVE, mọi dạng feed, tất cả player nhúng |
| Facebook | Trang/trình xem Reels desktop được xác nhận sau khảo sát | Watch/video dài, Stories, bài đăng video thông thường |

Tính năng mục tiêu chung: tìm đúng video đang xem, phát/tạm dừng, mute, skip, tự chuyển khi kết thúc, PiP nếu được kiểm chứng, phím cục bộ và phím cấp Chrome.

Mỗi adapter công bố khả năng riêng; giao diện chỉ hiển thị tính năng thực sự đã kiểm chứng trên trang đó. Nếu PiP chưa ổn trên TikTok/Facebook, có thể phát hành beta với auto-next và shortcut trước, không đánh dấu PiP đã hỗ trợ.

TikTok có Embed Player với cơ chế điều khiển player nhúng, nhưng đó là tài liệu cho player nhúng. Không suy ra từ đó rằng extension điều khiển được feed TikTok bằng cùng API. Kế hoạch tích hợp feed phải khảo sát trực tiếp trên tiktok.com. Nguồn: https://developers.tiktok.com/docs/en/embed-player

Facebook Reels đã có adapter beta local từ 1.5.0 nhưng chưa khảo sát/kiểm chứng trực tiếp bằng tài khoản Facebook thật. Khả năng điều hướng, nhận diện video và di chuyển video vào PiP là việc cần chứng minh trong giai đoạn thử nghiệm.

## 6. Kiến trúc đề xuất

Giữ Manifest V3; tách logic hiện tại thành các phần:

```text
background/       Lệnh Chrome, chọn tab nguồn, trạng thái phiên
core/             Phiên xem, tự chuyển, settings, phím tắt
platforms/
  youtube.js      Nhận diện và điều hướng Shorts
  tiktok.js       Nhận diện và điều hướng TikTok
  facebook.js     Nhận diện và điều hướng Reels
pip/              Cửa sổ nổi, gắn/trả video, Fit/Fill, controls
ui/               Popup và trang cài đặt
shared/           Message schema, icon, design tokens
tests/            Logic chung và từng nền tảng
```

Các thao tác chung của adapter: phát hiện trang hỗ trợ, lấy video hiện hành và ID nếu có, lấy nút/luồng điều hướng, chuyển video, kiểm tra đã đổi video, quan sát thay đổi, trả capability và dọn dẹp.

Core không chứa selector của YouTube, TikTok hay Facebook. Adapter không tự sửa giao diện popup.

Trạng thái phiên cần có: tabId, platform, videoIdentity, playerElement, playing/paused/transitioning, PiP owner, thời điểm chuyển cuối và số lần thử. Sau một yêu cầu next, chỉ ghi nhận thành công khi video/nguồn thực sự thay đổi; khóa yêu cầu trùng trong lúc chuyển và báo lỗi có thể phục hồi nếu hết số lần thử.

Settings có schemaVersion và migration. Lưu riêng lựa chọn mặc định, override theo nền tảng, Fit/Fill, phím cục bộ. Khi nâng cấp giữ lại công tắc và phím người dùng đang dùng. Phím native tiếp tục do Chrome quản lý; không hứa đổi tùy ý bằng code popup. Nguồn: https://developer.chrome.com/docs/extensions/reference/api/commands

## 7. Quyền và dữ liệu

Xin quyền TikTok/Facebook khi người dùng bật hỗ trợ nền tảng đó; dùng optional host permissions và đăng ký content script phù hợp, không khai báo sẵn mọi host trong static matches rồi vẫn hiển thị như chưa xin quyền. Chrome hỗ trợ cơ chế quyền tùy chọn theo host: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

Bản đầu không cần backend hoặc tài khoản VYRO. Không tải hoặc lưu video. Cấu hình lưu trên máy. Báo cáo lỗi chỉ xuất khi người dùng chọn; nội dung mặc định là phiên bản, trạng thái và lỗi kỹ thuật, có bản xem trước để loại bỏ dữ liệu không muốn chia sẻ.

## 8. Lộ trình thực hiện

Ước lượng sơ bộ cho một lập trình viên, chưa bao gồm thời gian chờ phản hồi và duyệt cửa hàng. Không phải cam kết lịch; cập nhật sau thử nghiệm TikTok/Facebook.

| Giai đoạn | Khối lượng | Đầu ra | Điều kiện hoàn thành |
|---|---:|---|---|
| 1 — Ổn định nền | 2–3 ngày | YouTube/PiP, xác nhận next, cảnh báo script cũ | Thử liên tiếp ít nhất 20 clip, không crop ngoài ý muốn, không chuyển trùng |
| 2 — Nhận diện và UI | 3–4 ngày | Tên làm việc, 5 mockup, popup + cài đặt sau khi chọn hướng | Thao tác chính rõ, đủ trạng thái, controls không che thường trực |
| 3 — Tách kiến trúc | 3–4 ngày | Core/adapter, settings migration, capability | YouTube không hồi quy; settings cũ giữ được |
| 4 — TikTok beta | 4–6 ngày | Khảo sát → thử player/PiP → adapter → kiểm tra | Đạt các luồng desktop đã công bố; khả năng chưa đạt được gắn nhãn rõ |
| 5 — Facebook beta | 5–7 ngày | Khảo sát viewer/feed → adapter → kiểm tra | Không tác động nhầm video trong trang; đóng PiP trả player đúng vị trí |
| 6 — Hoàn thiện 2.0 | 3–5 ngày | Kiểm tra chéo, onboarding, ZIP, tài liệu và gói cửa hàng | Hoàn tất ma trận nghiệm thu; sẵn sàng gửi duyệt khi chủ sản phẩm yêu cầu |

Tổng khoảng **20–29 ngày công**, tương đương **4–6 tuần làm việc**. Nếu một nền tảng ngăn hoặc làm hỏng player khi đưa vào Document PiP, phải thay đổi phạm vi hoặc giải pháp trước khi ước lượng tiếp phần PiP của nền tảng đó.

## 9. Ma trận nghiệm thu

- Nền tảng: YouTube, TikTok, Facebook trong phạm vi đã chọn.
- Hệ điều hành: Windows và macOS; không suy ra Win + / hoạt động vì Cmd + / đã đạt trên Mac.
- Video: dọc, ngang, vuông; clip ngắn/dài; tải chậm; đổi độ phân giải; player tái sử dụng.
- Điều hướng: tự hết video, Skip nút, Skip phím, lướt tay, quay lại trang, đóng/mở PiP.
- Trạng thái: phát, pause, mute, seek gần cuối, tự chuyển tắt, tab ẩn, tab nguồn đóng, nhiều tab cùng có video.
- Khung hình: so tỷ lệ video gốc với vùng hiển thị; Fit không cắt; resize không đẩy video về góc; style bị trang ghi lại vẫn được xử lý.
- Controls: hover hiện/rời chuột ẩn; Tab hiển thị focus; tooltip và trạng thái icon đúng; giao diện cửa sổ nhỏ không tràn nút.
- An toàn thao tác: phím cục bộ không can thiệp ô nhập/bình luận; không điều khiển tab không liên quan; không tự xử lý đăng nhập, CAPTCHA hay thông báo quyền của website.
- Hiệu năng: không quét toàn bộ DOM liên tục không cần thiết; không tăng observer/listener sau mỗi clip; kiểm tra phiên xem ít nhất 30 phút trên từng nền tảng.
- Nâng cấp: popup báo đúng phiên bản script; migration giữ cấu hình; gỡ quyền nền tảng dừng được tích hợp.

Các ngưỡng ở trên là tiêu chí cần đạt, không phải kết quả đã đo được của phiên bản tương lai.

## 10. Ưu tiên

**P0:** khung hình đúng; chọn đúng video/tab; next có xác nhận; dọn vòng đời PiP; thông báo script cũ.

**P1:** thương hiệu/giao diện, settings theo nền tảng, TikTok và Facebook trong phạm vi hẹp đã kiểm chứng.

**P2:** tốc độ phát, hẹn giờ dừng, lưu preset điều khiển, xuất/nhập cấu hình. Chỉ thêm sau khi thao tác cốt lõi ổn định.

Đầu ra tiếp theo được đề xuất là 5 mockup popup theo hướng tối và một bản PiP minh họa hover/Fit/Fill. Chưa triển khai giao diện hoặc thêm quyền nền tảng trong công việc lập kế hoạch này.
