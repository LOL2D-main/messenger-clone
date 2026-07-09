# Messenger Clone

Ứng dụng chat đầy đủ tính năng được xây dựng bằng React, TypeScript và Firebase, cung cấp khả năng nhắn tin thời gian thực với giao diện hiện đại.

## 🎨 Tính Năng

- **Nhắn tin Thời gian Thực** - Gửi tin nhắn tức thì sử dụng Firebase
- **Xác thực Người dùng** - Đăng nhập và đăng ký an toàn với Firebase Authentication
- **Các Thành phần UI Phong phú** - Giao diện hiện đại được xây dựng bằng Radix UI và Tailwind CSS
- **Hỗ trợ Emoji** - Bộ chọn emoji để gửi tin nhắn biểu cảm
- **Ảnh đại diện Người dùng** - Hình ảnh hồ sơ với hiển thị avatar
- **Thiết kế Responsive** - Hoạt động liền mạch trên máy tính để bàn và thiết bị di động
- **An toàn Kiểu dữ liệu** - Viết hoàn toàn bằng TypeScript để độ tin cậy cao hơn
- **Tích hợp AI** - Tích hợp Google GenAI để nâng cao tính năng

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **Framework**: React 19
- **Ngôn ngữ**: TypeScript 5.8
- **Công cụ Build**: Vite 6
- **Styling**: Tailwind CSS 4 với Tailwind Merge
- **Thành phần UI**: Radix UI (Avatar, Dialog, Dropdown, Popover, Tooltip, Slot)
- **Animations**: Motion
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Cơ sở dữ liệu**: Firebase (Firestore)
- **Xác thực**: Firebase Authentication

### Dịch vụ Bên ngoài
- **Cơ sở dữ liệu Đám mây**: Firebase
- **AI**: Google Generative AI
- **Admin SDK**: Firebase Admin SDK

### Công cụ Phát triển
- **Kiểm tra Kiểu**: TypeScript
- **Bundler**: esbuild
- **Tiện ích**: UUID, date-fns, dotenv

## 📋 Yêu cầu Trước tiên

Trước khi bắt đầu, hãy đảm bảo bạn có:
- Node.js (phiên bản 18 trở lên)
- npm hoặc yarn
- Thông tin xác thực dự án Firebase
- Khóa API Google Generative AI

## 🚀 Bắt Đầu

### Cài đặt

1. Clone repository:
```bash
git clone https://github.com/LOL2D-main/messenger-clone.git
cd messenger-clone
```

2. Cài đặt các phụ thuộc:
```bash
npm install
```

3. Cấu hình biến môi trường:
Tạo file `.env` trong thư mục gốc với thông tin xác thực Firebase và Google AI của bạn:
```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
GOOGLE_GENAI_API_KEY=your_genai_key_here
```

### Phát triển

Khởi động máy chủ phát triển:
```bash
npm run dev
```

Ứng dụng sẽ khởi động tại `http://localhost:5173` theo mặc định.

### Build

Build cho production:
```bash
npm run build
```

Điều này sẽ:
1. Build ứng dụng React với Vite
2. Bundle server với esbuild
3. Tạo output được tối ưu hóa trong thư mục `dist`

### Khởi động Server Production

```bash
npm run start
```

### Xem trước Build

Xem trước build production cục bộ:
```bash
npm run preview
```

### Lint

Kiểm tra lỗi TypeScript:
```bash
npm run lint
```

### Dọn dẹp

Loại bỏ các tạo tác build:
```bash
npm run clean
```

## 📂 Cấu Trúc Dự Án

```
messenger-clone/
├── src/
│   ├── components/       # Các thành phần React
│   ├── pages/            # Các trang React
│   ├── services/         # Dịch vụ Firebase và API
│   ├── hooks/            # Các hook React tùy chỉnh
│   ├── types/            # Định nghĩa kiểu TypeScript
│   ├── utils/            # Các hàm tiện ích
│   ├── App.tsx           # Thành phần App chính
│   └── main.tsx          # Điểm vào React
├── server.ts             # Cấu hình Express server
├── package.json          # Các phụ thuộc dự án
├── tailwind.config.ts    # Cấu hình Tailwind CSS
├── tsconfig.json         # Tùy chọn trình biên dịch TypeScript
└── vite.config.ts        # Cấu hình Vite
```

## 🔧 Tệp Cấu Hình

- **`vite.config.ts`** - Cấu hình Vite bundler với plugin React
- **`tailwind.config.ts`** - Cấu hình chủ đề Tailwind CSS và plugin
- **`tsconfig.json`** - Tùy chọn trình biên dịch TypeScript
- **`package.json`** - Siêu dữ liệu dự án và phụ thuộc

## 📦 Tổng quan Phụ thuộc

### Phụ thuộc Cốt lõi
- `react` (19.0.1) - Thư viện UI
- `firebase` (12.15.0) - Dịch vụ backend
- `express` (4.21.2) - Framework server

### UI & Styling
- `tailwindcss` (4.1.14) - CSS utility-first
- `@radix-ui/*` - Các thành phần nguyên thủy có thể truy cập
- `lucide-react` - Thư viện biểu tượng

### Tiện ích
- `uuid` - Tạo mã định danh duy nhất
- `date-fns` - Xử lý ngày tháng
- `clsx` & `tailwind-merge` - Trợ giúp tiện ích CSS
- `emoji-picker-react` - Lựa chọn emoji

### Phát triển
- TypeScript để đảm bảo an toàn kiểu
- Vite cho phát triển nhanh và build
- esbuild cho bundling production

## 🔐 Bảo mật

- Quy tắc Bảo mật Firebase nên được cấu hình trong Bảng điều khiển Firebase của bạn
- Các biến môi trường chứa bí mật không bao giờ nên được commit vào kiểm soát phiên bản
- Luôn sử dụng các tệp `.env` cho cấu hình nhạy cảm
- Cập nhật các phụ thuộc thường xuyên

## 📝 Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Khởi động máy chủ phát triển với hot reload |
| `npm run build` | Build bundle production |
| `npm run start` | Khởi động máy chủ production |
| `npm run preview` | Xem trước build production |
| `npm run clean` | Loại bỏ các tạo tác build |
| `npm run lint` | Chạy kiểm tra kiểu TypeScript |

## 🎯 Thành Phần Ngôn Ngữ

- TypeScript: 97.9%
- JavaScript: 1.4%
- Khác: 0.7%

## 📄 Giấy phép

Dự án này là mã nguồn mở và có sẵn theo Giấy phép MIT.

## 👨‍💻 Tác giả

[LOL2D-main](https://github.com/LOL2D-main)

## 🤝 Đóng góp

Chúng tôi chào đón những đóng góp! Hãy tự do:
1. Fork repository
2. Tạo nhánh tính năng (`git checkout -b feature/amazing-feature`)
3. Commit các thay đổi của bạn (`git commit -m 'Add amazing feature'`)
4. Push đến nhánh (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## 🐛 Báo cáo Lỗi

Tìm thấy lỗi? Vui lòng mở issue trên GitHub với:
- Mô tả lỗi
- Các bước để sao chép
- Hành vi dự kiến
- Hành vi thực tế
- Chi tiết môi trường (OS, phiên bản Node, v.v.)

## 📧 Hỗ trợ

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng mở issue trên repository GitHub.

---

**Chúc bạn viết code vui vẻ! 🚀**
