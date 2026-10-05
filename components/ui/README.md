# Hệ Thống UI Components Chuẩn Hóa — NexCampus Frontend

Hệ thống thành phần giao diện nền tảng được chuẩn hóa theo quy chuẩn tại [AGENTS.md](file:///d:/NodeJS/NexCampus/NexCampus-FE/AGENTS.md) và [ui-ux-checklist.md](file:///d:/NodeJS/NexCampus/NexCampus-FE/.agents/rules/ui-ux-checklist.md).

---

## 🌟 1. Danh Mục Thành Phần Đã Chuẩn Hóa (Standardized Components)

| Thành Phần | Tệp Nguồn | Mô Tả & Tính Năng Nổi Bật | 6 Trạng Thái UI/UX |
| :--- | :--- | :--- | :---: |
| **Button** | [`Button.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Button.tsx) | Đa biến thể: `primary`, `secondary`, `glass`, `outline`, `ghost`, `danger`, `metal-silver`, `metal-blue`, `chrome-glow`. Kích thước: `icon` (`h-10 w-10`), `sm`, `md`, `lg`. Hỗ trợ spinner và `loadingText`. | ✅ Đầy đủ |
| **Input** | [`Input.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Input.tsx) | Ô nhập liệu biểu mẫu chuẩn. Tự động hiển thị viền đỏ + icon `AlertCircle` khi có `error`. Tích hợp nút toggle ẩn/hiện mật khẩu khi `type="password"`. Nhãn bắt buộc `*`, `leftIcon`, `rightIcon`, `helperText`. | ✅ Đầy đủ |
| **Textarea** | [`Textarea.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Textarea.tsx) | Vùng nhập văn bản nhiều dòng. Tích hợp thanh cuộn `custom-scrollbar`, hiển thị thông báo lỗi và nhãn bắt buộc `*`. | ✅ Đầy đủ |
| **Card** | [`Card.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Card.tsx) | Thẻ chứa nội dung phong cách Glassmorphism (`bg-card border-border backdrop-blur-xl`). Cung cấp sub-components: `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`. | ✅ Đầy đủ |
| **MetalCard** | [`MetalCard.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/MetalCard.tsx) | Thẻ card kim loại ánh gương đặc trưng NexCampus dành riêng cho các khối dữ liệu trọng tâm / highlight. | ✅ Đầy đủ |
| **Modal** | [`Modal.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Modal.tsx) | Hộp thoại pop-up hỗ trợ cả Compound API (`Modal.Open`, `Modal.Window`) và Direct Props (`isOpen`, `onClose`, `title`). Tích hợp đóng bằng phím `Escape`, khóa cuộn trang nền (`overflow: hidden`), nút đóng chuẩn 6 trạng thái. | ✅ Đầy đủ |
| **Table** | [`Table.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Table.tsx) | Bảng dữ liệu dạng Compound (`Header`, `Row`, `Body`, `Footer`). Hỗ trợ cố định tiêu đề (`sticky top-0`), thanh cuộn ngang mượt mà, empty state đa ngôn ngữ không hardcode, và spinner khi `isLoading={true}`. | ✅ Đầy đủ |
| **Pagination** | [`Pagination.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Pagination.tsx) | Phân trang thông minh với dấu ba chấm (`...`), nút Prev/Next tự động vô hiệu hóa tại biên, hiển thị tổng số dòng, kích thước chuẩn `h-9 w-9`. | ✅ Đầy đủ |
| **Select** | [`Select.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Select.tsx) | Menu thả xuống độc lập cho form. Giới hạn `max-h-60`, thanh cuộn `custom-scrollbar`, tự động tích hợp ô tìm kiếm khi danh sách dài (`searchable`), đóng khi click ngoài hoặc bấm `Escape`. | ✅ Đầy đủ |
| **FileUpload** | [`FileUpload.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/FileUpload.tsx) | Bộ tải tệp tin hiện đại Glassmorphism. Kéo thả file trực quan, thanh tiến trình % gradient Cyan-Blue thời gian thực, quản lý danh sách file đã tải kèm dung lượng và nút xóa từng file, hỗ trợ giới hạn số lượng (`maxFiles`) và dung lượng tối đa (`maxSizeMB`). | ✅ Đầy đủ |
| **DatePicker** | [`DatePicker.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/DatePicker.tsx) | Bộ chọn ngày (`DatePicker`) & khoảng ngày (`DateRangePicker`) Cyberpunk Glassmorphism. Popover portal ra `document.body` tự lật `flip`, lưới lịch 7 ngày, highlight dải ngày, hiệu ứng hover range preview, phím tắt nhanh (presets), định dạng `DD/MM/YYYY`, đồng bộ API `YYYY-MM-DD`. | ✅ Đầy đủ |
| **TimePicker** | [`TimePicker.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/TimePicker.tsx) | Bộ chọn giờ Cyberpunk Glassmorphism độc lập (`HH:mm`, 24h). Popover portal ra `document.body` tự lật `flip`, 2 cột trượt Giờ (00-23) và Phút (00-59 theo step), tự động scroll, thanh cuộn `scrollbar-dropdown`, thanh phím tắt chọn nhanh (08:00, 09:00, 12:00, 13:30, 17:30, 21:00...) và nút "Bây giờ". | ✅ Đầy đủ |
| **DateTimePicker** | [`DateTimePicker.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/DateTimePicker.tsx) | Bộ chọn ngày và giờ tích hợp liền mạch (`YYYY-MM-DDTHH:mm`). Hiển thị `DD/MM/YYYY HH:mm` (vi) hoặc `MM/DD/YYYY HH:mm` (en). Bố cục linh hoạt: Desktop hiển thị song song Side-by-side (Lịch 7 ngày + 2 cột Giờ/Phút); Mobile chuyển sang tab switch `[ 📅 Ngày ]` và `[ ⏰ Giờ ]` chống tràn viền. Presets nhanh (Bây giờ, +1h, Hôm nay 18:00, Hôm nay 23:59, Ngày mai 09:00...). | ✅ Đầy đủ |
| **FilterSelect** | [`FilterSelect.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/FilterSelect.tsx) | Dropdown chọn bộ lọc gắn trực tiếp với URL query parameters. | ✅ Đầy đủ |
| **InlineSelect** | [`InlineSelect.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/InlineSelect.tsx) | Dropdown chỉnh sửa nhanh trạng thái trực tiếp trên từng hàng của Table. | ✅ Đầy đủ |
| **SortSelect** | [`SortSelect.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/SortSelect.tsx) | Dropdown chọn chiều và tiêu chí sắp xếp. | ✅ Đầy đủ |
| **Badge** | [`Badge.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Badge.tsx) | Huy hiệu nhãn trạng thái (`success`, `primary`, `warning`, `danger`, `info`, `purple`). Kèm hàm helper `getStatusBadgeVariant()` ánh xạ tự động mã trạng thái task (`TODO`, `DONE`, `BLOCKED`...). | ✅ Đầy đủ |
| **Skeleton** | [`Skeleton.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Skeleton.tsx) | Hệ thống placeholder tải dạng sóng (Shimmer/Pulse). Cung cấp các biến thể: `Skeleton.Text`, `Skeleton.Avatar`, `Skeleton.Button`, `Skeleton.Card`, `Skeleton.Table`, `Skeleton.Dashboard`. Chống layout shift (CLS). | ✅ Đầy đủ |
| **Spinner** | [`Spinner.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/Spinner.tsx) | Icon quay tròn báo hiệu trạng thái tải thao tác nhanh (nút submit form, đổi trạng thái tức thời). | ✅ Đầy đủ |
| **FullPageLoading** | [`FullPageLoading.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/FullPageLoading.tsx) | Màn hình tải toàn trang kèm hiệu ứng mờ nền (dành cho logout/xác thực tài khoản). | ✅ Đầy đủ |
| **RichTextEditor** | [`RichTextEditor.tsx`](file:///d:/NodeJS/NexCampus/NexCampus-FE/components/ui/RichTextEditor.tsx) | Bộ soạn thảo văn bản phong phú (ReactQuill). | ✅ Đầy đủ |

---

## 📌 2. Ghi Chú Các Thành Phần Chưa Có & Lộ Trình Đề Xuất (Pending / Recommended)

Dưới đây là danh sách các thành phần hiện chưa có component độc lập trong `components/ui/`, đang được xử lý tạm thời bằng HTML native hoặc inline CSS:

1. **Tooltip (`Tooltip.tsx`)**:
   - *Hiện trạng*: Đang sử dụng thuộc tính native `title="..."` của trình duyệt.
   - *Đề xuất*: Bổ sung component Tooltip nổi mờ trên nền tảng Floating UI / Radix để hiển thị giải thích chi tiết cho các nút bị khóa (`disabled`) hoặc văn bản bị rút gọn (`truncate`).

2. **Tabs (`Tabs.tsx`)**:
   - *Hiện trạng*: Các trang quản trị (Admin Settings, Policy, Stats) đang tự quản lý state `[activeTab, setActiveTab]` riêng lẻ với các nút bấm thủ công.
   - *Đề xuất*: Xây dựng bộ `Tabs`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content` đồng nhất hiệu ứng trượt highlight.

3. **Checkbox & Radio (`Checkbox.tsx`, `Radio.tsx`)**:
   - *Hiện trạng*: Đang dùng thẻ native `<input type="checkbox" />` kèm `accent-primary-main`.
   - *Đề xuất*: Đóng gói component Checkbox và Radio có viền kính mờ, icon dấu tích/chấm tròn mạ bạc hoặc xanh Cyan chuẩn Glassmorphism.

4. **Toast / Notification Banner (`Toast.tsx`)**:
   - *Hiện trạng*: Đang dùng `react-hot-toast` / `sonner` gọi trực tiếp trong logic hook.
   - *Đề xuất*: Tạo wrapper cấu hình toast mặc định mang phong cách nền tối bo góc đồng nhất với hệ thống card.

---

## 🎯 3. Quy Chuẩn Tải Giao Diện: Skeleton vs Spinner (Loading Rules)

Theo quy chuẩn [AGENTS.md](file:///d:/NodeJS/NexCampus/NexCampus-FE/AGENTS.md) và [ui-ux-checklist.md](file:///d:/NodeJS/NexCampus/NexCampus-FE/.agents/rules/ui-ux-checklist.md):

1. **Khi nào BẮT BUỘC dùng Skeleton (`Skeleton.tsx`)**:
   - **Tải trang lần đầu / Điều hướng trang (`loading.tsx`, `Suspense fallback`)**: Sử dụng `<Skeleton.Dashboard />` hoặc `<Skeleton.Card />` để giữ nguyên khung layout, triệt tiêu hiện tượng giật vỡ layout (Cumulative Layout Shift - CLS).
   - **Bảng dữ liệu (`Table.tsx`)**: Sử dụng `<Table.Body isLoading={isPending} skeletonRows={5} />` để sinh các hàng placeholder có cùng cấu trúc cột với dữ liệu thật.
   - **Khối thông tin người dùng / Thẻ thống kê**: Sử dụng `<Skeleton.Avatar />`, `<Skeleton.Text />` và `<Skeleton.Card />`.
   - **Gợi ý AI đang tính toán (`ai/`)**: Dùng `Skeleton` dạng sóng Shimmer tại các ô dự kiến điền kết quả đánh giá / phân công theo rubric AI UX.

2. **Khi nào dùng Spinner (`Spinner.tsx`)**:
   - **Thao tác hành động tức thời (Mutations)**: Nút bấm bấm "Lưu", "Gửi duyệt", "Nộp bài", "Đăng xuất" (`Button isLoading={true} />`).
   - **Tải ngầm cục bộ**: Làm mới dữ liệu một ô đơn lẻ (refresh nhỏ) mà không thay đổi cấu trúc bảng.

---

## 🎨 4. Quy Tắc Sử Dụng Chung (Design System Guidelines)

- **Semantic Tokens**: Luôn dùng `bg-card`, `border-border`, `text-foreground`, `text-muted`, `bg-primary-main`, `text-primary-light`, `border-danger`. Tuyệt đối không hardcode mã hex trực tiếp.
- **Icon + Heading**: Luôn bọc trong `<div className="flex items-center gap-2">` kèm `shrink-0` cho icon, không đặt `flex` trực tiếp lên thẻ heading.
- **Font tiếng Việt**: Các khối hiển thị văn bản tiếng Việt dài tuân thủ cấu hình font riêng tại `globals.css` (`--font-body-vi`).
