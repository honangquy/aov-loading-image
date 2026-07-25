<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" width="80" alt="Next.js Logo" />
  
  # AOV Loading Match Changer (Web UI)
  
  **Giao diện Web chuẩn SaaS cấp doanh nghiệp để tự động hóa xử lý ảnh AOV.**

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
</div>

<br />

> **AOV Loading Match Changer** là giao diện web tối ưu hiệu suất, sẵn sàng cho môi trường doanh nghiệp (enterprise-ready), được thiết kế để tự động hóa quy trình qua mặt hệ thống bảo mật của Garena và cập nhật tài nguyên media trong game. Được xây dựng dựa trên các tiêu chuẩn web hiện đại và tuân thủ chặt chẽ một hệ thống thiết kế cao cấp.

## Tính năng nổi bật

- **Kiến trúc Hiệu năng cao:** Được phát triển bằng Next.js 15 App Router và React 19 giúp render và quản lý state tức thì.
- **Giao diện (UI/UX) Cao cấp (Anthropic Design System):** 
  - Sử dụng phông chữ hình học độc quyền **Space Grotesk** mang lại tính thẩm mỹ sắc sảo, đậm chất kỹ thuật.
  - Các biến màu (semantic tokens) được tuyển chọn kỹ lưỡng trên nền **Tinted Dark Navy**.
  - Hiệu ứng Lưới SVG và Ánh sáng mờ (Ambient Glow) chìm vào hình nền tương đương với các nền tảng SaaS hàng đầu (Vercel, Linear).
- **Thực thi Bảo mật:** Đọc và phân tích mã thông báo HAR (HTTP Archive) an toàn ngay trên máy. Không truyền tải các tiêu đề xác thực nhạy cảm cho bất kỳ bên thứ ba trái phép nào.
- **Console Thời gian thực:** Tích hợp Terminal hiển thị kết quả trực tiếp với tính năng tô màu cú pháp (syntax highlighting) để giám sát tiến trình (Khi chạy Brutal Mode).

## Công nghệ sử dụng

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Thư viện:** [React 19](https://react.dev/)
- **CSS:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Biểu tượng (Icons):** [Lucide React](https://lucide.dev/)
- **Phông chữ:** Space Grotesk & Inter (thông qua `next/font/google`)

## Hướng dẫn cài đặt

### Yêu cầu hệ thống

Cần cài đặt sẵn Node.js 18.17+ hoặc mới hơn.

### Cài đặt

1. Clone kho lưu trữ này và di chuyển vào thư mục `web`.
   ```bash
   cd web
   ```

2. Cài đặt các gói phụ thuộc (sử dụng npm, yarn, pnpm, hoặc bun):
   ```bash
   npm install
   # hoặc
   yarn install
   # hoặc
   pnpm install
   ```

3. Chạy máy chủ phát triển (Development server):
   ```bash
   npm run dev
   ```

4. Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt để xem kết quả.

## Hướng dẫn sử dụng

Quy trình thao tác trên Giao diện Web được thiết kế tự động và trực quan:

1. **Bước 1: Xác thực hệ thống**
   - Dán chuỗi Token `msdk-itopencodeparam` hoặc Link sự kiện vào ô nhập liệu.
   - Hoặc trực tiếp kéo thả tệp tin dạng `.har` đã được thu thập (capture) từ trong game.
2. **Bước 2: Tải lên Media**
   - Bấm vào khu vực tải lên hoặc kéo thả hàng loạt hình ảnh (JPG, PNG) hoặc Video (MP4) bạn muốn thay đổi làm màn hình chờ.
   - Các tệp sẽ hiển thị ở dạng thẻ (card) xem trước (preview).
3. **Bước 3: Thiết lập quyền chia sẻ**
   - Cấu hình trạng thái "Công khai" (Public) hoặc "Riêng tư" (Private) cho danh sách ảnh của bạn thông qua nút gạt.
4. **Bước 4: Kích hoạt hệ thống**
   - Bấm nút "Kích hoạt hệ thống" để bắt đầu xử lý ảnh (giữ nguyên độ nét gốc), sanitize, và tải lên máy chủ thông qua quy trình Brutal Mode mạnh mẽ.

## Triết lý và Nguyên tắc Thiết kế

Giao diện (UI) tuân thủ nghiêm ngặt phong cách **Warm Editorial Dark Mode** được ghi chú trong `DESIGN.md`.

- **Màu sắc:** Không dùng màu đen thuần (`#000`). Hệ thống sử dụng màu Xanh Đen Ám (Tinted Dark Navy - `#181715`) và Xanh Đen Nổi (Elevated Navy - `#252320`).
- **Điểm nhấn:** Màu Coral rực rỡ (`#cc785c`) và màu Accent Teal (`#14b8a6`) dành cho các nút kêu gọi hành động (CTA) và thông tin quan trọng.
- **Viền:** Đường viền siêu mảnh (hairlines - `#3d3d3a`) và hạn chế hiệu ứng đổ bóng quá mức trên bề mặt tối.
- **Phông chữ:** Space Grotesk dành cho các Tiêu đề (Extrabold), Inter cho đoạn văn bản (Body text). Hạn chế sử dụng in đậm ở các văn bản thường, trừ khi cần nhấn mạnh dữ liệu cực kỳ quan trọng.

## Bảo mật & Tuân thủ

Giao diện web này được thiết kế để thực thi và tự động hóa cục bộ (internal execution).
- Các Token (vd: `msdk-itopencodeparam`) được lưu trữ tại máy (local) hoặc chỉ được gửi trực tiếp đến máy chủ xử lý đã liên kết.
- Tệp HAR được tải lên qua giao diện kéo-thả được phân tích và xử lý an toàn hoàn toàn ở phía máy khách (client-side).

## Bản quyền

Phần mềm Độc quyền. Đã đăng ký Bản quyền. 
Được thiết kế và lập trình riêng cho quy trình tự động hóa chuẩn doanh nghiệp.
