# Bộ Nhớ Dự Án Frontend (NexCampus-FE Memory)

Chỉ lưu các quyết định kiến trúc và UI/UX đã được xác nhận, có hiệu lực lâu dài cho toàn bộ phiên làm việc của Frontend.

---

## 1. Quyết định UI/UX đã xác nhận

- **2026-07-31 — Căn chỉnh Icon + Heading (Icon & Heading Alignment)**:
  - **TUYỆT ĐỐI KHÔNG** đặt `flex items-center gap-2` trực tiếp lên thẻ heading `<h1>`/`<h2>`/`<h3>` vì heading là block element, khiến icon bị lệch hàng hoặc vỡ layout.
  - **Pattern chuẩn**: Bọc icon và heading trong một thẻ `<div>` riêng:
    ```tsx
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 shrink-0 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    ```
  - Luôn thêm `shrink-0` vào icon để icon không bao giờ bị méo/thu nhỏ khi tiêu đề dài.

- **2026-07-31 — Ô Search Input Padding & Đồng bộ Filter**:
  - Khi ô Search đặt cạnh các dropdown filter (như Status filter), **KHÔNG** dùng icon kính lúp kèm padding sâu `pl-11` vì sẽ làm placeholder bị thụt vào quá sâu lệch hàng với text của dropdown.
  - **Pattern chuẩn**: Bỏ icon kính lúp, áp dụng padding đồng bộ `px-5 py-3` để placeholder thẳng hàng tuyệt đối với văn bản của `FilterSelect`.

- **2026-08-08 — Giao diện Khóa công việc đã hoàn thành**:
  - Khi assignment ở trạng thái `DONE`, giao diện tự động ẩn hoặc vô hiệu hóa (`disabled`) các nút chỉnh sửa task, nút đổi phân công, thêm/xóa attachment.
  - Hiển thị tooltip hoặc badge: *"Công việc đã hoàn thành, không thể sửa đổi."*

- **2026-08-08 — Luồng nộp bài và báo bị chặn (Intern UI)**:
  - Nút "Bắt đầu làm" chỉ hiện khi task ở `TODO`.
  - Nút "Nộp bài" và "Báo bị chặn" chỉ kích hoạt khi task ở `IN_PROGRESS`.
  - Khi bị từ chối duyệt (task quay về `TODO`), nút "Nộp bài" phải bị khóa, bắt buộc Intern bấm "Bắt đầu làm" trước khi có thể nộp lại.

- **2026-08-02 — Đánh giá tuần (Intern View)**:
  - Thực tập sinh không có quyền tự chấm điểm hoặc chỉnh sửa 12 tiêu chí.
  - Giao diện của Intern chỉ hiển thị điểm số, nhận xét và nút **"Đã xem đánh giá"**. Khi bấm, nút chuyển thành nhãn xanh *"Đã xác nhận xem lúc [thời gian]"*.

- **2026-09-16 — Chuẩn hóa Trạng Thái Thành Phần & UI/UX Checklist**:
  - Mọi interactive component (Button, Card, Input...) bắt buộc có đủ 6 trạng thái: Normal, Hover, Focus-visible, Active/Pressed, Disabled, Loading.
  - Mọi Table phải có xử lý text overflow (`truncate` + tooltip), chiều rộng cột cố định/co giãn, cuộn ngang/chuyển card list trên mobile, sticky header/column, phân trang và empty state.
  - Dropdown/Select phải có `max-h-60 overflow-y-auto`, searchable khi danh sách dài, flip placement khi chạm đáy màn hình.
  - Form validation: Viền đỏ + icon cảnh báo + thông báo lỗi, placeholder tương phản rõ với value, dấu sao đỏ `*` bắt buộc, nút ẩn/hiện mật khẩu.
  - Chi tiết quy chuẩn được quy định tại `.agents/rules/ui-ux-checklist.md`.

- **2026-09-17 — Tối ưu Chiều rộng Sidebar Bên Phải (Borderless Right Sidebar / Panel)**:
  - **Quy tắc**: Toàn bộ các thành phần sidebar bên phải (Right Sidebar, panel chi tiết bên phải, cột hành động/thông tin phụ) **tuyệt đối không sử dụng viền bao quanh (outer border / border bao ngoài container)** nhằm tối đa hóa diện tích và chiều rộng hiển thị nội dung.
  - **Pattern chuẩn**: Thiết kế bố cục liền mạch (borderless / seamless layout), không bọc bên ngoài bằng các khung viền hộp (`border`, `border-white/10`, `border-slate-200`) gây lãng phí không gian hiển thị; ưu tiên dùng khoảng cách tự nhiên (`gap-6`), padding hợp lý hoặc nền mờ tinh tế để phân chia khu vực.

  - **Đa ngôn ngữ & Quy chuẩn Placeholder cho Dropdown ("Tất cả" / "All")**: 
    * Mọi dropdown bộ lọc (`FilterSelect`) chỉ cần hiển thị duy nhất **"Tất cả"** (đối với tiếng Việt) hoặc **"All"** (đối với tiếng Anh) làm placeholder / option mặc định khi chưa chọn.
    * **Tuyệt đối KHÔNG nối thêm tên trường** (như *"Tất cả phòng ban"*, *"Tất cả vị trí"*, *"Tất cả trạng thái"*, *"Tất cả vai trò"*...) vì nhãn (`label`) phía trên ô đã thể hiện rõ ngữ cảnh trường dữ liệu.
    * **Tinh giản nhãn bộ lọc (Concise Filter Labels)**: Nhãn (`label`) của các ô lọc phải thật ngắn gọn, súc tích, loại bỏ các từ dư thừa như *"Trạng thái"*, *"được gán"* (ví dụ: dùng *"Lời mời"*, *"Đơn"*, *"Phòng ban"*, *"Vị trí"* thay vì *"Trạng thái lời mời"*, *"Trạng thái đơn"*...).
    * `FilterSelect` tự động phân giải: `placeholder ?? (locale === "vi" ? "Tất cả" : "All")`. Khi gọi `FilterSelect`, không cần truyền prop `placeholder` phức tạp trừ trường hợp đặc biệt.

- **2026-09-18 — Hiệu Ứng Hover & Bố Cục Mobile Thẻ Thống Kê (Stat Cards Micro-interactions & Mobile Grid)**:
  - **Hiệu ứng Micro-interaction**: Toàn bộ thẻ thống kê sử dụng `<MetalCard>` (tại `/admin/admin-team`, `/admin/leaders`, `/admin/interns`, `/admin/onboarding`, `MeetingStats`, `InternTaskStats`...) bắt buộc có hiệu ứng tương tác vi mô đồng bộ khi hover. Hộp chứa Icon BẮT BUỘC có các lớp: `transition-all duration-500 group-hover:rotate-6 group-hover:scale-110`. Khi hover thẻ, icon xoay nhẹ 6 độ và phóng to 1.1x kết hợp dải sáng kim loại quét qua (`group-hover:left-[130%]`) của `MetalCard`.
  - **Bố cục Mobile (Tối thiểu 2 thẻ / hàng & Xử lý số lượng thẻ lẻ)**:
    * Trên màn hình di động (`< md`), lưới thống kê **BẮT BUỘC hiển thị tối thiểu 2 thẻ trên một hàng** (`grid grid-cols-2 gap-3 sm:gap-4 md:...`). Tuyệt đối KHÔNG để `grid` mặc định rơi về 1 cột đơn dọc làm chiếm chiều dài trang.
    * **Xử lý số lượng lẻ (`cards.length % 2 !== 0`)**: Nếu tổng số thẻ là số lẻ (ví dụ 3, 5, 7 thẻ), **thẻ đầu tiên BẮT BUỘC chiếm toàn bộ hàng đầu tiên trên giao diện mobile (`col-span-2 md:col-span-1`)** để làm thẻ Headline KPI chủ đạo. Các thẻ còn lại tự động ghép thành từng cặp 2 thẻ / hàng đều đặn, không để lại khoảng trống khuyết lẻ ở hàng cuối.
  - **Responsive Sizing chuẩn cho Thẻ Thống kê 2 cột mobile**:
    * Padding thẻ: `p-4 sm:p-5 lg:p-6`
    * Kích thước số: `text-2xl sm:text-4xl lg:text-5xl font-bold leading-none`
    * Khung chứa Icon: `h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl sm:rounded-2xl` kèm `shrink-0`
    * Icon SVG: `h-5 w-5 sm:h-6 sm:w-6`
    * Tiêu đề: `text-[11px] sm:text-xs font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted truncate`
    * Thanh kẻ ngang: `mt-3 sm:mt-4 h-[2px] w-10 sm:w-16 rounded-full`

- **2026-09-18 — Quy Chuẩn Phân Trang Đồng Bộ Cho Bảng Dữ Liệu (Standardized Table Pagination)**:
  - **Đồng bộ URL (URL-first State)**: Tham số `page` và `limit` bắt buộc đồng bộ hai chiều với URL search query (`?page=1&limit=10`) qua `useSearchParams()` và `router.push()`. Khi người dùng gõ tìm kiếm hoặc đổi filter, bắt buộc tự động reset về `page=1`.
  - **Vị trí Footer `<Table.Footer>`**: Toàn bộ bảng dữ liệu đặt cụm điều khiển phân trang bên trong `<Table.Footer>`.
  - **Điều kiện hiển thị `{meta && meta.totalPages > 1 && (`**: Tự động ẩn thanh footer khi dữ liệu chỉ có 1 trang (`meta.totalPages <= 1`, tức số dòng ≤ limit mặc định 10) để giữ giao diện bảng tinh gọn; tự động xuất hiện khi dữ liệu sang trang thứ 2 trở lên.
  - **Hiển thị thông tin & Nút bấm chuẩn**:
    * Bên trái: Chuỗi định dạng `next-intl` động: `t("...pagination", { page: meta.page, totalPages: meta.totalPages, total: meta.total })` (*"Trang X / Y (Tổng Z nhân sự/bản ghi)"*). Tuyệt đối không hardcode text.
    * Bên phải: Nút `ChevronLeft` (`disabled={meta.page <= 1}`) và `ChevronRight` (`disabled={meta.page >= meta.totalPages}`) kèm style Cyberpunk viền `border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground disabled:opacity-30`.

- **2026-09-18 — Nút Làm Mới Dữ Liệu Bảng (Standardized Table Reload Button - `Table.ReloadButton`)**:
  - **Mục đích**: Cung cấp nút làm mới dữ liệu cục bộ cho toàn bộ bảng dữ liệu mà **tuyệt đối KHÔNG tải lại toàn trang (không F5, không `window.location.reload()`)**, bảo toàn nguyên vẹn URL search params, trạng thái mở modal và phiên làm việc.
  - **Cơ chế hoạt động**: Sử dụng trực tiếp hàm `refetch()` và cờ `isFetching` từ hook TanStack Query (e.g., `useApplicationInvites`, `useLeaders`, `useUsers`, `useInterns`, `useDepartments`, `useRegulations`, `useActivityLogs`, `useTasks`, `useWeeklyEvaluations`).
  - **Thành phần dùng chung**: `<Table.ReloadButton onReload={refetch} isReloading={isFetching} />` (tích hợp sẵn trong compound component `<Table>`: `Table.ReloadButton`).
  - **Vị trí chuẩn hóa**: Đặt tại ô tiêu đề cột cuối cùng của `<Table.Header>` (cột thao tác / Actions column header ở góc trên bên phải của bảng).
    * Lý do: Vị trí góc trên cùng bên phải là chuẩn UX quen thuộc nhất, thẳng hàng tự nhiên với các icon thao tác của từng dòng bên dưới, luôn hiển thị cố định khi cuộn bảng nhờ sticky header (`sticky top-0`), không chiếm dụng diện tích của thanh công cụ/filter phía trên.
  - **Giao diện & Trạng thái**:
    * Kích thước nhỏ gọn `h-7 w-7`, bo góc `rounded-lg`, hiệu ứng hover phát sáng cyan `hover:bg-white/5 hover:text-cyan-400`, micro-interaction nhấn `active:scale-90`.
    * Icon `RotateCw` tự động xoay tròn liên tục khi dữ liệu đang được tải ngầm (`animate-spin text-cyan-400` khi `isReloading={true}`), đồng thời tự động vô hiệu hóa (`disabled`) để chống spam request.
    * Tích hợp tooltip và `aria-label` tự động theo ngôn ngữ: *"Làm mới dữ liệu"* (vi) / *"Refresh data"* (en).

- **2026-09-19 — Chuẩn Hóa Giao Diện Chọn Ngày Tháng (DatePicker & DateRangePicker Standard)**:
  - **Cấm Tuyệt Đối `<input type="date">` Native**: Không bao giờ sử dụng thẻ native `<input type="date">` thô sơ của trình duyệt. Native input gây vỡ giao diện hệ thống theme tối, phụ thuộc vào từng hệ điều hành khác nhau, và không hỗ trợ trải nghiệm Cyberpunk Glassmorphism.
  - **Component Chuẩn Dùng Chung**: Bắt buộc sử dụng `DatePicker` (cho chọn 1 ngày) hoặc `DateRangePicker` (cho chọn khoảng ngày) từ `@/components/ui/DatePicker`.
  - **Tiêu Chuẩn Thiết Kế & Trải Nghiệm Người Dùng (UI/UX Checklist)**:
    * **Cyberpunk Glassmorphism**: Nền popover tối `bg-[#0c1322]/95 backdrop-blur-2xl border border-white/10 ring-1 ring-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7)]`.
    * **Portal & Tự Động Định Vị**: Luôn gắn bằng `createPortal(..., document.body)` chống bị cắt vỡ bởi container có `overflow-hidden`. Tự động phát hiện đáy màn hình để lật ngược lên trên (`flip`) và căn lề phải (`align="right"`).
    * **Đóng Phím Tắt & Click Ngoài**: Tự động đóng khi nhấn phím `Escape` hoặc click bên ngoài popover (`mousedown`).
    * **Lưới Lịch 7 Ngày Trực Quan**: Tiêu đề tháng năm kèm nút chuyển tháng mượt mà, hàng thứ trong tuần đa ngôn ngữ (`T2..CN` / `Mo..Su`), đánh dấu chấm phát sáng cyan cho ngày hôm nay (Today).
    * **Khoảng Ngày & Hiệu Ứng Hover Range Preview**:
      - Chọn ngày bắt đầu: Bo tròn trái `rounded-l-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_14px_rgba(6,182,212,0.4)]`.
      - Chọn ngày kết thúc: Bo tròn phải `rounded-r-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-[0_0_14px_rgba(6,182,212,0.4)]`.
      - Khoảng giữa: `bg-cyan-500/20 text-cyan-200 border-y border-cyan-500/20`.
      - Hover Range Preview: Khi đã chọn ngày bắt đầu, việc rê chuột qua các ngày khác sẽ kích hoạt dải preview viền đứt nét cyan mềm mại (`bg-cyan-500/10 border-dashed`) trước khi click chốt.
    * **Phím Tắt Nhanh (Presets)**: Tích hợp sẵn hàng nút chọn nhanh: *Hôm nay*, *7 ngày qua*, *30 ngày qua*, *Tuần này*, *Tháng này*.
    * **Đồng Bộ Dữ Liệu Hai Chiều**:
      - Hiển thị trên giao diện người dùng theo định dạng dễ đọc: `DD/MM/YYYY` (hoặc `DD/MM/YYYY – DD/MM/YYYY`).
      - Lưu trữ và gửi API/URL Search Params theo chuẩn ISO `YYYY-MM-DD` (`createdFrom`, `createdTo`, `deadline`...).
      - Luôn reset về `page=1` khi thay đổi ngày lọc.

- **2026-09-19 — Chuẩn Hóa Responsive Cho Dropdown & Popover Trên Mobile (Chống Tràn Mép & Tràn Đáy)**:
  - **Vấn đề đã khắc phục**:
    1. Menu thông báo (`NotificationDropdown`) ban đầu dùng `absolute right-0 w-80`. Do icon chuông nằm trước link Profile (không ở sát mép phải màn hình), menu 320px bị đẩy lùi sang trái vượt qua mép màn hình điện thoại (overflow left).
    2. Popover chọn ngày (`DatePicker`, `DateRangePicker`) có chiều rộng cố định 340px và chiều cao 420px, khi mở trên màn hình điện thoại nhỏ bị tràn ra mép phải/trái và tràn qua đáy màn hình (làm mất cụm nút Áp dụng/Đặt lại).
  - **Giải pháp chuẩn hóa đã kiểm chứng**:
    * **`NotificationDropdown`**:
      - Trên mobile (`< sm`): Áp dụng `fixed left-3 right-3 top-[76px] max-w-[calc(100vw-24px)]`. Menu trải đều cân đối toàn màn hình với lề an toàn 12px hai bên, chiều cao kẹp `max-h-[calc(100dvh-88px)] flex flex-col`.
      - Trên desktop (`sm:`): Giữ nguyên `sm:absolute sm:top-full sm:left-auto sm:right-0 sm:w-96 sm:mt-3`.
      - Hỗ trợ nút `X` đóng nhanh trên mobile header và phím `Escape`.
    * **`DatePicker` & `DateRangePicker`**:
      - Chiều rộng linh hoạt: `popoverWidth = isMobile ? Math.min(340, window.innerWidth - 20) : 340`.
      - Căn giữa trên mobile: `left = Math.max(10, Math.round((window.innerWidth - popoverWidth) / 2))`.
      - Chiều cao & lật thông minh: Khi không đủ chỗ ở dưới hoặc trên, tự động kẹp `top = Math.max(10, window.innerHeight - popoverHeight - 10)` và bật `max-h-[calc(100dvh-20px)] overflow-y-auto`.
      - Hàng phím tắt presets: Chuyển sang cuộn ngang `overflow-x-auto no-scrollbar` thay vì `flex-wrap` nhiều hàng, tiết kiệm tối đa chiều cao hiển thị.

- **2026-09-20 — Chuẩn Hóa Thanh Cuộn Đồng Bộ Cho Toàn Bộ Dropdown, Popover & Select (Unified Dropdown Scrollbars)**:
  - **Vấn đề**: Các dropdown (`SortSelect`, `FilterSelect`, `DatePicker`, `Select`, `InlineAssignCell`) trước đây thiếu định nghĩa class CSS hoặc dùng class không tồn tại (`scrollbar-dropdown`), dẫn đến trình duyệt hiển thị thanh cuộn mặc định của hệ điều hành (to bản, vuông xám, có mũi tên) làm phá vỡ ngôn ngữ thiết kế Cyberpunk Glassmorphism.
  - **Quy chuẩn bắt buộc**:
    * Mọi khu vực cuộn trong Dropdown, Popover, Select, DatePicker, Menu hành động phải sử dụng class `.scrollbar-dropdown` (hoặc `.custom-scrollbar`).
    * Cả hai class đã được chuẩn hóa trong `globals.css`:
      ```css
      .scrollbar-dropdown, .custom-scrollbar {
        scrollbar-width: thin !important;
        scrollbar-color: rgba(255, 255, 255, 0.15) transparent !important;
      }
      .scrollbar-dropdown::-webkit-scrollbar, .custom-scrollbar::-webkit-scrollbar {
        width: 5px !important;
        height: 5px !important;
      }
      .scrollbar-dropdown::-webkit-scrollbar-track, .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent !important;
      }
      .scrollbar-dropdown::-webkit-scrollbar-thumb, .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12) !important;
        border-radius: 9999px !important;
        transition: background-color 0.2s ease !important;
      }
      .scrollbar-dropdown::-webkit-scrollbar-thumb:hover, .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 211, 238, 0.35) !important; /* cyan neon glow */
      }
      ```
    * Đặc điểm: Siêu mỏng 5px, track trong suốt, thanh trượt bo tròn viên thuốc trắng mờ và phát sáng cyan neon khi hover, hỗ trợ cả WebKit (Chrome, Edge, Safari) và chuẩn W3C/Firefox (`scrollbar-width`, `scrollbar-color`).

---

## 2. Quyết định Kỹ thuật & Luồng Dữ Liệu

- **2026-07-28 — Cơ chế Xác thực & Refresh Token**:
  - Access token được lưu trong bộ nhớ RAM (`in-memory`), không lưu vào `localStorage` để chống tấn công XSS.
  - Refresh token lưu trong `HTTP-only cookie`.
  - Axios interceptor khi bắt mã lỗi `401 Unauthorized` sử dụng chung một `refreshPromise` duy nhất để tránh gửi nhiều request refresh đồng thời khi nhiều API chạy song song.

- **2026-08-02 — Xử lý Ngày tháng & Múi giờ**:
  - Toàn bộ date picker, hiển thị lịch và kiểm tra hạn chót tuân thủ múi giờ chuẩn `Asia/Ho_Chi_Minh` (UTC+7).
  - Ngày bắt đầu thực tập (`startDate`) trên form onboarding không được chọn ngày trong quá khứ và không được rơi vào thứ Bảy hoặc Chủ nhật.

- **2026-09-14 — Trải nghiệm AI Client-side (Human-in-the-loop)**:
  - Mọi kết quả từ AI (gợi ý đánh giá 12 tiêu chí, đề xuất phân công task) chỉ được điền vào form ở dạng xem trước (Draft).
  - Leader bắt buộc phải có quyền chỉnh sửa và chủ động bấm nút "Lưu" thì mới gửi request cập nhật vào database.
  - Khi AI service lỗi (timeout/502), hiển thị toast thông báo nhẹ nhàng và cho phép tiếp tục thao tác thủ công, không làm crash giao diện.

- **2026-09-16 — Đa Ngôn Ngữ (i18n) & Chuyển Đổi Theme (Light / Dark / System)**:
  - **i18n**: Hỗ trợ 2 ngôn ngữ `vi` (mặc định) và `en` qua `next-intl`. Dùng `useLocaleSwitcher()` để đổi `document.documentElement.lang` và URL qua `history.replaceState` không reload trang. Font tiếng Việt riêng (`--font-heading-vi`, `--font-body-vi`) để đảm bảo hiển thị chuẩn dấu thanh. Tuyệt đối không hardcode text tiếng Việt/Anh trực tiếp trong code.
  - **Theme**: 3 chế độ `light`, `dark`, `system`. Class `.dark` trên thẻ `<html>`, lưu lựa chọn trong `localStorage` key `nexcampus-theme`. Khi chọn `system` phải lắng nghe media query `(prefers-color-scheme: dark)`. Bắt buộc có script inline chống nhấp nháy FOUC trong `<head>`. Sử dụng semantic CSS tokens (`bg-background`, `text-foreground`, `border-border`) thay vì hardcode mã màu.

- **2026-09-17 — Kiến trúc Đa Ngôn Ngữ Feature-Based (i18n)**:
  - Xóa bỏ hoàn toàn việc chia thư mục i18n theo Role (`admin/`, `leader/`, `intern/`).
  - Dữ liệu dịch thuật được tổ chức theo Mô-đun/Tính năng chuẩn hóa (`messages/${locale}/*.json`): `roles.json`, `departments.json`, `tasks.json`, `task-groups.json`, `meetings.json`, `daily-reports.json`, `weekly-evaluations.json`, `users.json`, `onboarding.json`, `emails.json`, `regulations.json`, `dashboards.json`, `activity-logs.json`, `profile.json`, `settings.json`.
  - Bộ nạp `loadLocaleMessages()` trong `i18n/load-messages.ts` hợp nhất tự động và bảo lưu tương thích ngược 100% với các namespace portal cũ.

- **2026-09-17 — Loại Bỏ 3 Roles Cố Định & Triển Khai Dynamic RBAC Toàn Diện**:
  - **Portal & Dashboard Resolution**: Xóa bỏ hoàn toàn việc tính toán URL dashboard theo tên role (`/${role}/dashboard`). Sử dụng hàm chuẩn hóa `getPortalName(role)` và `getDashboardPath(role)` tại `lib/portal.ts`. Các vai trò ngoài `LEADER` và `INTERN` (như `ADMIN`, `HR_MANAGER`, `COORDINATOR`...) tự động ánh xạ an toàn vào portal `/admin/*`.
  - **Kiểm soát Truy cập Tuyến đường (ProtectedRoute)**: Nâng cấp `ProtectedRoute` hỗ trợ thuộc tính `portal` (`"admin" | "leader" | "intern"`) và `requiredPermissions?: string[]`. Tài khoản Superadmin (`ADMIN`) luôn sở hữu toàn quyền bypass.
  - **Hook Phân Quyền UI (useRBAC)**: Cung cấp `{ user, role, permissions, isAdmin, portal, can, canAny, canAll }` tại `hooks/rbac/useRBAC.ts` để kiểm tra phân quyền hạt nhân trên mọi component.
  - **Hiển thị Menu Động theo Permissions**: `AdminSidebar` tự động lọc và chỉ hiển thị các menu tương ứng với permissions thực tế của người dùng, ngoại trừ `ADMIN` hệ thống luôn xem được 100% menu.
  - **Quản Trị Nhân Sự & Form Động**: `AdminTeamFilter` & `AdminTeamTable` tích hợp bộ lọc vai trò động qua `useRoles()`. `CreateUserForm` nạp danh sách vai trò thực tế từ backend thay vì hardcode 2 options.

- **2026-09-18 — Tách Biệt Nhân Sự Ban Quản Trị & Tập Trung Hóa Gán Vai Trò (Role Assignment Centralization)**:
  - **Phân hệ `/admin/admin-team`**: Chỉ quản lý đội ngũ Ban Quản Trị (những vai trò quản trị hệ thống). Không hiển thị nhân sự `LEADER` và `INTERN` tại đây. Luôn tự động gắn `excludeRoles="LEADER,INTERN"` vào query params và truy vấn thống kê.
  - **Bỏ cột vai trò & Bỏ lọc vai trò ở `/admin/admin-team`**: Vì trang này chỉ dành cho Ban Quản Trị, cột vai trò và bộ lọc vai trò bị loại bỏ để bảng thoáng rộng và tập trung.
  - **Tập trung hóa đổi vai trò về `/admin/roles`**: Thao tác gán vai trò người dùng được quy tụ 100% về trang `/admin/roles` qua modal `RoleUsersModal` mở từ cột/nút "Thành viên" của từng vai trò. Xóa bỏ nút "Đổi vai trò" phân tán ở từng hàng `AdminTeamRow`.

- **2026-09-19 — Chuẩn Hóa Menu Thao Tác Bảng (Table 3-Dots Action Menu / `MoreVertical`)**:
  - **Portal & Z-Index Chống Clipping**: Menu thao tác 3 chấm trong bảng bắt buộc gắn qua `createPortal(..., document.body)` kèm `zIndex: 9999` để chống bị cắt xén (`clipping`) bởi container bảng có `overflow-hidden` hoặc `overflow-x-auto`.
  - **Lật Vị Trí Thông Minh (`flip placement`) & Kẹp Chiều Cao**: Tự động so sánh `spaceBelow` và `spaceAbove`. Nếu `spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow`, menu tự động mở ngược lên trên (`openUpward`). Chiều cao menu kẹp trong viewport thực tế (`maxHeight: Math.min(260, Math.max(100, space - 16))`) kèm `overflowY: "auto"` chống mất hút dưới đáy màn hình.
  - **Chống Tràn Mép Ngang**: Căn lề ngang kẹp an toàn `left = Math.max(8, Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8))` chống tràn mép phải màn hình khi người dùng cuộn ngang bảng hoặc dùng điện thoại.
  - **Tính Tọa Độ Đồng Bộ**: Gọi `updateMenuPosition()` ngay khi click trước khi set `menuOpen(true)` để tránh menu bị chớp ở vị trí static `{}` tại frame render đầu tiên.
  - **Phím Tắt & Cảm Ứng**: Đóng menu ngay khi bấm `Escape` (trả focus về nút trigger) hoặc chạm ngoài (`mousedown`, `touchstart`), tự động đóng khi nút trigger cuộn ra ngoài màn hình.
  - **Bảo Đảm Menu Không Bao Giờ Rỗng**: Bổ sung đầy đủ các action cho toàn bộ trạng thái dữ liệu (kể cả trạng thái mặc định như `UNUSED` của Prisma) và luôn có fallback "Xem chi tiết" để menu không bao giờ bị rỗng.

- **2026-09-19 — Đồng Bộ Chiều Cao Các Ô Cùng Hàng Trong Form (Uniform Field Height Across Rows)**:
  - **Quy tắc bắt biến**: Mọi ô nhập liệu (`Input`, `Select`, `DatePicker`, radio card buttons...) khi nằm trên cùng một hàng ngang (`grid-cols-2`, `grid-cols-3`...) **BẮT BUỘC PHẢI CÓ CHIỀU CAO BẰNG NHAU TUYỆT ĐỐI**. Tuyệt đối không để ô cao ô thấp làm mất cân đối hàng lối giao diện.
  - **Kích thước chuẩn hóa**:
    * Chiều cao ô field / button trigger: `h-[42px] sm:h-[46px]` (padding `px-4 py-2.5 sm:py-3 text-sm rounded-xl`).
    * Nhãn label: Đồng bộ dùng class `text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1` kèm dấu sao đỏ `*` nếu bắt buộc (`required`). Tuyệt đối không chèn thêm icon riêng lẻ vào dòng nhãn làm sai lệch chiều cao dòng.
    * Khoảng cách giữa nhãn và ô nhập: Đồng bộ `gap-1.5`.
    * Thông báo lỗi: Đồng bộ `text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn` kèm icon `<AlertCircle className="w-3.5 h-3.5 shrink-0" />`.

- **2026-09-20 — Quy Chuẩn Tinh Gọn Cho Thẻ Bộ Lọc (Clean & Minimalist Filter Card Layout)**:
  - **Tuyệt đối KHÔNG đặt tiêu đề hay nút Làm mới dữ liệu (Reload Button) bên trong thẻ bộ lọc (`MetalCard` Filter)**: Thẻ bộ lọc không được tự ý thêm các thanh tiêu đề (như *"Phòng ban & Trạng thái"*) hay nút reload bên trong card lọc làm cồng kềnh, phân tán giao diện.
  - **Bố cục chuẩn**: Thẻ bộ lọc chỉ chứa trực tiếp lưới các ô điều khiển (Search Input, `FilterSelect`...). Nút Làm mới dữ liệu chuẩn (`Table.ReloadButton`) nếu có bảng dữ liệu thì đặt tại header cột thao tác của Table; không đặt tùy tiện vào card filter.
  - **Nút Đặt lại bộ lọc (`RotateCcw`)**: Chỉ xuất hiện tại đường viền chân thẻ card (`border-t border-border/40 pt-3`) khi có ít nhất 1 filter/search đang hoạt động (`hasFilters`), giữ cho giao diện mặc định luôn thoáng đãng và tinh gọn.

- **2026-09-20 — Chuẩn Hóa Tương Thích Dữ Liệu Phân Trang Backend v2 (Task Group Response Normalization)**:
  - **Vấn đề**: Backend v2 trả về cấu trúc phân trang `{ success: true, data: { data: [...], meta: {...} } }`, trong khi Frontend types hoặc các component kế thừa kỳ vọng `data` là mảng phẳng `TaskGroup[]`. Nếu lấy trực tiếp `data?.data`, giá trị nhận được là object chứa `data` và `meta`, dẫn đến lỗi runtime `TypeError: taskGroups.filter is not a function`.
  - **Quy chuẩn xử lý 2 tầng**:
    * *Tầng Service (`services/*.service.ts`)*: Luôn kiểm tra và normalize dữ liệu trước khi trả về: nếu phát hiện `payload.data.data` là mảng thì unwrap về `{ success, data: payload.data.data, meta: payload.data.meta }`.
    * *Tầng Entity & Helper (`types/*.ts`)*: Cung cấp hàm trích xuất an toàn (ví dụ: `extractTaskGroups(data)`), kiểm tra `Array.isArray(data)` và `Array.isArray(data.data)` để không bao giờ bị crash giao diện dù backend trả về dạng nào.

- **2026-09-20 — Chuẩn Hóa Giao Diện Modal (Modal Header, Stepper, Scroll & Window Sizing)**:
  - **Header Chuẩn Hóa (Rule 44 Compliant)**:
    * Luôn sử dụng sticky header bọc trong flex container riêng biệt: `sticky top-0 z-20 bg-[#0c1222]/95 backdrop-blur-xl pb-4 pt-1 -mt-1 border-b border-white/10 pr-10 sm:pr-12`.
    * **Khoảng đệm phải `pr-10 sm:pr-12`**: Bắt buộc có để ngăn tiêu đề, badge hoặc nội dung modal va chạm/che khuất nút đóng tuyệt đối `HiXMark` ở góc trên cùng bên phải (`absolute right-3 top-3 sm:right-4 sm:top-4 z-30`).
    * **Khung chứa Icon + Heading**: Bọc trong `<div className="flex items-center gap-3 min-w-0">`. Khung icon bo góc chuẩn `h-11 w-11 shrink-0 items-center justify-center rounded-2xl` kèm viền và shadow phát sáng đặc trưng theo ngữ cảnh (cyan cho task, purple cho task group, emerald cho import).
  - **Thanh Tiến Trình (Stepper Indicator) Responsive Mobile**:
    * Stepper tròn: `h-9 w-9 sm:h-10 sm:w-10 rounded-full font-bold`.
    * Đường nối giữa các bước: Responsive linh hoạt `mx-1 sm:mx-3 mb-6 sm:mb-8 h-px w-8 sm:w-14 md:w-20` (hoàn thành: `bg-emerald-500/40`, chưa tới: `bg-white/10`).
    * Mô tả phụ: Ẩn trên thiết bị di động nhỏ (`hidden sm:block`) để bảo đảm stepper không bị bẻ hàng hay tràn layout.
  - **Kích Thước Cửa Sổ Modal (`size="sm" | "md" | "lg" | "xl"`)**:
    * Form đơn giản, ít trường (như `TaskGroupCreateModal`): Sử dụng `size="sm"` (`max-w-[min(96vw,36rem)]`).
    * Form nhiều bước, có lưới chia 3 cột hoặc xem trước bảng dữ liệu nhiều cột (như `TaskCreateModal`, `TaskImportModal`): Bắt buộc sử dụng `size="lg"` (`max-w-[min(98vw,72rem)]`) để các trường kế hoạch và bảng preview hiển thị thoáng đãng, không bị co cụm chật chội.
  - **Tránh Xung Đột Cuộn & Chiều Cao Cố Định**:
    * Thành phần `Modal.Window` đã tích hợp sẵn container cuộn: `<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">`.
    * Các modal con bên trong **tuyệt đối không bọc thêm các lớp có `style={{ maxHeight: 'calc(100vh - ...)' }}` hoặc `overflow-hidden` ở root** gây ra hiện tượng 2 thanh cuộn lồng nhau (dual scrollbars) hoặc làm cắt cụt popover của `Select` / `DatePicker`.
    * Các bảng dữ liệu nhiều cột trong modal preview phải được bọc trong `<div className="overflow-x-auto scrollbar-dropdown rounded-2xl border border-white/10 bg-card/40">`.

- **2026-09-20 — Bảng Dữ Liệu Không Bọc Lồng Trong MetalCard (Loại Bỏ Viền Ngoài Của Table - Theo Chuẩn /leader/department)**:
  - **Vấn đề**: Việc bọc component `<Table>` bên trong thẻ `<MetalCard>` (ví dụ: `<MetalCard><div className="p-4 sm:p-6"><Table ... /></div></MetalCard>`) tạo ra hiện tượng viền kép ngoài (double outer border box). Điều này gây lãng phí padding 2 bên, làm thu hẹp diện tích hiển thị của các cột dữ liệu và tạo cảm giác nặng nề, bí bách.
  - **Quy chuẩn bắt buộc**:
    * Bản thân compound component `<Table>` đã được tích hợp sẵn container hoàn chỉnh với bo góc `rounded-3xl`, viền `border border-border`, bóng đổ `shadow-glass` / `backdrop-blur-xl` và cơ chế cuộn ngang responsive `overflow-x-auto`.
    * **Tuyệt đối KHÔNG bọc thêm thẻ `<MetalCard>` bên ngoài `<Table>`**. Bảng dữ liệu bắt buộc được render trực tiếp trên layout trang (tham khảo mẫu chuẩn hóa tại `/leader/department` và `/leader/weekly-evaluation`).
    * Tùy biến nền và đổ bóng kim loại trực tiếp qua prop `className` của `<Table>`:
      ```tsx
      <Table
        columns={COLUMNS}
        className="bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)] shadow-[0_12px_40px_rgba(0,0,0,.45)] hover:shadow-[0_20px_50px_rgba(21,174,245,.15)] transition-shadow duration-500"
      >
      ```
    * Cột dữ liệu trên bảng nên sử dụng định dạng `minmax(...)` (ví dụ: `minmax(240px, 2.5fr) minmax(120px, 1.2fr)...`) để vừa đảm bảo tỷ lệ co giãn linh hoạt trên desktop, vừa kích hoạt cuộn ngang mượt mà trên mobile mà không làm co cụm chữ.

- **2026-09-20 — Kiến Trúc Xuất Báo Cáo PDF Phía Client (Client-Side PDF Generation qua jspdf + html2canvas)**:
  - **Lý do & Quyết định**: Thay thế giải pháp Headless Chromium (Puppeteer trên server Backend) bằng cơ chế render tài liệu trực tiếp trên trình duyệt Client thông qua `html2canvas` và `jspdf`.
  - **Lợi ích**:
    1. **Tối ưu hạ tầng deploy Render**: Backend không cần cài đặt gói Chromium (~300MB), triệt tiêu 100% rủi ro tràn bộ nhớ OOM Killer (exit code 137) trên gói Free / Starter 512MB RAM.
    2. **Tốc độ phản hồi tức thì**: Báo cáo PDF được kết xuất và tải về máy trong vòng < 500ms thay vì phải chờ HTTP upload/presigned URL vòng qua server.
    3. **Chuẩn mực Unicode tiếng Việt**: Trình duyệt render font native sắc nét 100%, không bị vỡ dấu thanh hay lệch ký tự tiếng Việt.
  - **Các thành phần triển khai**:
    * Mẫu in ấn chuẩn A4: `components/pdf/WeeklyEvaluationReportTemplate.tsx` (chiều rộng cố định 794px, nền trắng, typography rõ ràng, đầy đủ 12 tiêu chí, điểm số, nhận xét và chữ ký).
    * Custom Hook: `hooks/pdf-export/useClientExportWeeklyEvaluation.ts` (quản lý việc mount template off-screen, chụp canvas scale 2x và xuất PDF A4 tự động).
    * Nút xuất: `WeeklyEvaluationExportButton.tsx` (tích hợp trạng thái loading và toast thông báo chuẩn mực).

- **2026-09-23 — Chuẩn Hóa Thứ Tự Nút Điều Khiển & Quy Chuẩn Đa Ngôn Ngữ Trang Độc Lập**:
  - **Thứ tự nút Sáng/Tối và Ngôn ngữ**:
    * **QUY TẮC BẮT BUỘC**: Nút chỉnh Sáng/Tối (`<ThemeToggle />`) BẮT BUỘC ĐỨNG TRƯỚC (bên trái), nút chuyển đổi Ngôn ngữ (`<LanguageToggle />`) BẮT BUỘC ĐỨNG SAU (bên phải).
    * Áp dụng trên 100% các thanh action bar: Header chính (`components/layout/Header.tsx`), trang 404 (`app/not-found.tsx`), Auth layout (`app/(auth)/layout.tsx`), Onboarding layout (`app/(onboarding)/layout.tsx`), Error page (`app/error.tsx`).
  - **Quy chuẩn Đa ngôn ngữ (i18n) cho Auth, 404, Error**:
    * Tuyệt đối không hardcode text tiếng Anh hay tiếng Việt trên các trang độc lập. Phải dùng `useTranslations(...)` đầy đủ.
    * Luôn duy trì tính toàn vẹn 2 chiều giữa `messages/vi/*.json` và `messages/en/*.json` (các namespace `auth`, `notFound`, `error` nằm trong `common.json`).
    * Trang 404 tách Client Component `NotFoundContent.tsx` để khi click nút cờ thì văn bản trang đổi tức thì trong 0ms.
    * Trong `LocaleProvider.tsx`, hàm `setLocale` phải gọi `router.refresh()` kèm lưu cookie `NEXT_LOCALE` / `locale` để đồng bộ Server Components.

- **2026-09-26 — Chế Độ Xem Bảng Nhóm & Góc Nhìn Task Hỗ Trợ (Squad Project Board & Support Task Architecture)**:
  - **Kiến trúc điều hướng chế độ xem (View Switcher)**:
    - Tại `/intern/task`, `InternTaskHeader` cung cấp bộ chuyển đổi trực quan giữa `[ 👤 Công việc của tôi ]` (My Tasks) và `[ 👥 Bảng dự án nhóm ]` (Squad Project Board) thông qua URL query parameter `?view=my|team`.
    - Server Component `page.tsx` bọc Client Component `InternTaskContent` bên trong `Suspense` giúp chuyển đổi tức thì không gây giật lag.
  - **Phân tách trách nhiệm cá nhân & vai trò Hỗ trợ (Support Task Filter & Indicators)**:
    - Bổ sung bộ lọc vai trò nhanh: `[ Tất cả ]`, `[ 👤 Phụ trách chính ]`, `[ 🤝 Hỗ trợ đồng đội (Support) ]` đồng bộ với URL param `?role=ALL|OWNER|SUPPORT`.
    - Thẻ/Dòng công việc mà TTS đóng vai trò trợ lực được gắn badge `[ Trợ Lực ]` (màu tím Indigo/Purple glow đặc trưng) kèm chú thích `Hỗ trợ: {tên PIC chính}` trên cả giao diện Desktop Table và Mobile Cards.
  - **Bảng Dự Án Nhóm (Squad Board) — Kanban Mode**:
    - Trực quan hóa tiến trình công việc của cả nhóm (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `BLOCKED`).
    - Hỗ trợ kéo thả tự nhiên bằng HTML5 Drag-and-Drop (không phụ thuộc thư viện ngoài nặng nề). TTS chỉ có quyền kéo thả công việc của chính mình; công việc của đồng đội hiển thị chế độ xem an toàn (Read-only) chống sửa nhầm.
    - Kéo từ `TODO` sang `IN_PROGRESS` tự động kích hoạt API `startTask` với kiểm tra điều kiện tiên quyết.
  - **Sơ Đồ Phụ Thuộc (Dependency Graph DAG)**:
    - Tính toán tầng phân cấp (topological levels) tự động dựa trên mối quan hệ `dependsOn` / `dependencies`.
    - Vẽ đường kết nối Bezier SVG thời gian thực: đường nét liền xanh lá phát sáng (Cyberpunk glow) nếu điều kiện tiên quyết đã xong (`DONE`), hoặc đường nét đứt vàng cam nếu đang chờ điều kiện.
    - Thẻ công việc của chính người đang đăng nhập được viền neon cyan phát sáng nổi bật để định vị ngay vị trí trong dây chuyền dự án.
  - **Đồng Bộ Giao Diện Sáng / Tối (Light & Dark Theme Parity)**:
    - Nút chuyển đổi chế độ xem `[ Công Việc Của Tôi ]` / `[ Bảng Dự Án Nhóm ]` và nút chuyển Kanban / Graph sử dụng container `border border-border/80 bg-slate-100/90 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none`.
    - Toàn bộ các cột Kanban, thẻ công việc, thẻ KPI Mini, nhãn vai trò, bảng sơ đồ DAG có biến thể màu sắc rõ ràng cho Light Mode (`bg-card`, `bg-surface-elevated`, `text-*-700|800`, `border-*-200|300`) kết hợp song song với hiệu ứng Cyberpunk neon glow trong Dark Mode qua prefix `dark:`.

- **2026-10-05 — Chuẩn Hóa Thành Phần Tải Tệp Tin FileUpload (`components/ui/FileUpload.tsx`)**:
  - **Mục đích**: Tách biệt hoàn toàn logic và giao diện tải file thành UI Component dùng chung độc lập, phục vụ cho trang Onboarding, nộp báo cáo thực tập, đính kèm tài liệu task, minh chứng nghỉ phép...
  - **Đặc điểm nổi bật**:
    * **Thanh tiến trình phần trăm thực (Realtime Progress Bar)**: Gradient Cyan-to-Blue rực rỡ (`bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600`), hiệu ứng phát sáng `shadow-[0_0_12px_rgba(21,174,245,0.6)]`, hiển thị số phần trăm to rõ (`text-primary-light font-bold tabular-nums`) kèm thông điệp trạng thái tải.
    * **Vùng kéo thả trực quan (Drag & Drop Zone)**: Viền đứt nét Cyberpunk, tự động đổi viền phát sáng cyan và co giãn tinh tế khi kéo file vào vùng thả (`isDragging`).
    * **Quản lý danh sách file (Multi-file Management)**: Hiển thị icon theo loại file (PDF, Word, Excel, Archive, Image), tên file, dung lượng định dạng gọn gàng (`KB`/`MB`), nút xóa từng file (`X`) có phản hồi xúc giác.
    * **Giới hạn & Kiểm tra thông minh**: Hỗ trợ cấu hình `maxFiles`, `maxSizeMB`, `accept`, `allowedExtensions`, tự động validate định dạng và dung lượng trước khi kích hoạt hàm upload.
  - **Sử dụng mẫu**:
    ```tsx
    import FileUpload from "@/components/ui/FileUpload";

    <FileUpload
      label="Tài liệu đính kèm"
      required
      maxFiles={3}
      maxSizeMB={10}
      accept=".pdf,.doc,.docx"
      allowedExtensions={[".pdf", ".doc", ".docx"]}
      files={files}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      uploadStatusText={uploadStatusText}
      onFilesSelected={handleUploadFiles}
      onFileRemove={handleRemoveFile}
    />
    ```

- **2026-10-07 — Đồng Bộ Chế Độ Xem Bảng / Kanban / Sơ Đồ Phụ Thuộc Cho Quản Lý (Leader Task View Modes)**:
  - **Mục đích**: Đồng bộ trải nghiệm xem công việc giữa Leader và Intern, cho phép Leader quan sát luồng tiến độ Sprint theo 5 cột trạng thái và phát hiện điểm nghẽn dự án qua sơ đồ quan hệ phụ thuộc Topological (DAG).
  - **Thành phần tích hợp (`app/(dashboard)/leader/tasks/`)**:
    * `LeaderTaskViewModeToggle`: Cụm 3 nút chuyển chế độ xem: `[ Dạng Bảng ]` / `[ Bảng Kanban ]` / `[ Sơ Đồ Phụ Thuộc ]`, đồng bộ hai chiều với URL search query (`?view=table|kanban|graph`).
    * `LeaderKanbanBoard`: 5 cột trạng thái chuẩn (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `BLOCKED`) với huy hiệu độ ưu tiên, hạn ngạch, mã task font-mono, trạng thái khóa điều kiện tiên quyết (`Lock` / `Unlock`), deadline quá hạn, cùng các nút thao tác nhanh trực tiếp trên card: Duyệt bài (`TaskReviewModal`), Gỡ chặn (`unblockTask`), Duyệt gia hạn (`TaskExtensionReviewModal`), Phân công AI (`onOpenAiAssign`).
    * `LeaderDependencyGraph`: Sơ đồ các tầng giai đoạn (Phases) kết nối bằng đường cong SVG Bezier tự động điều chỉnh tọa độ, thể hiện rõ đường xanh liền cho điều kiện đã hoàn thành và đường cam đứt nét cho điều kiện đang chờ.
    * `TaskViewModal`: Cho phép Leader bấm vào bất kỳ thẻ task nào trên Kanban hoặc Sơ đồ phụ thuộc để mở nhanh toàn bộ thông tin chi tiết nhiệm vụ mà không cần rời trang.
  - **Giới hạn số lượng (Query Limit)**: Khi ở chế độ Kanban hoặc Sơ đồ phụ thuộc, hệ thống tự động tăng `limit` lên 100 để hiển thị trọn vẹn toàn bộ công việc của nhóm/sprint thay vì bị cắt vụn ở mức 10 dòng của Table view.

