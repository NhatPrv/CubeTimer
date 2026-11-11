# Lộ trình CubeTimer

Mỗi pha phát triển trên nhánh riêng. `main` là nhánh tích hợp. Khi pha trước đã được xác nhận và tích hợp, cập nhật `main` từ `origin/main` rồi tạo nhánh của pha tiếp theo. Mỗi tác vụ logic chạy lint, type-check và test áp dụng được trước khi tạo Conventional Commit và push ngay. Báo cáo nhánh, hash, tệp thay đổi và kết quả kiểm tra rồi dừng tại mốc xác nhận của từng pha.

## Pha 1 · `docs/architecture-and-specs`

- [x] Mô tả kiến trúc, schema IndexedDB, timer, playback và đóng gói trong [ARCHITECTURE.md](ARCHITECTURE.md).
- [x] Đặc tả JSON, quy tắc thống kê, setup/AUF và API nội bộ trong [API_AND_DATA_SPEC.md](API_AND_DATA_SPEC.md).
- [x] Kiểm tra liên kết, JSON mẫu và tính nhất quán giữa schema, sơ đồ, API và roadmap.
- [ ] Xác nhận pha 1 sau khi nhánh tài liệu được push.

## Pha 2 · `feature/timer-and-sessions`

- [ ] Khởi tạo Vite, React, TypeScript strict, Tailwind CSS, Lucide và Zustand.
- [ ] Thêm script `lint`, `type-check`, `test` và `build`. Dùng Vitest cho logic TypeScript và repository test với IndexedDB mô phỏng.
- [ ] Khai báo puzzle registry, schema Dexie v1 và repository. Kiểm tra khóa ngoại, transaction và retry theo ID.
- [ ] Tạo, chọn và đổi tên session theo puzzle. Mở lại app vẫn đọc được lịch sử của từng puzzle.
- [ ] Xây state machine timer, đầu vào Space và Pointer Events, lưu `elapsedMs`, timestamp và context.
- [ ] Kiểm tra nhả sớm, key repeat, mất focus, thao tác chạm bị hủy, dừng đúng một lần và retry sau lỗi lưu.
- [ ] Kiểm tra chuyển 3x3 → 4x4 → 3x3. Mỗi lần chỉ thấy session và lượt giải của puzzle đang chọn.
- [ ] Chạy kiểm tra, push commit và dừng để xác nhận pha 2.

## Pha 3 · `feature/solve-list-and-filters`

- [ ] Tính Single, Ao5, Ao12 và Mean trong module thuần, dùng thứ tự gốc của repository.
- [ ] Dựng bảng solve và chế độ Full, Ao5/Ao12, Best 5. Hiển thị trạng thái trống và giá trị chưa đủ lượt.
- [ ] Sắp xếp theo Single tăng/giảm và mốc hoàn thành mới nhất/cũ nhất. Thêm điều khiển `+2`/DNF và tính lại thống kê.
- [ ] Kiểm tra cửa sổ 4/5 và 11/12 lượt, `+2`, một/hai DNF, Mean với toàn DNF, timestamp trùng và best dưới 5 lượt. Thay sort phải giữ Ao gắn với đúng solve.
- [ ] Chạy kiểm tra, push commit và dừng để xác nhận pha 3.

## Pha 4 · `feature/cubingjs-scramble-and-3d`

- [ ] Pin phiên bản `cubing.js`. Kiểm tra `wcaEventId` và `twistyPuzzleId` trong registry với bản đã pin.
- [ ] Tích hợp `randomScrambleForEvent` cho 2x2–7x7, Megaminx, Pyraminx, Skewb, Square-1 và Clock.
- [ ] Dựng `<twisty-player>` với đúng puzzle và scramble. Lazy-load mô-đun 3D, hiển thị scramble dạng text khi trình duyệt không dựng được 3D.
- [ ] Xử lý lỗi generator, thử lại và bỏ kết quả cũ khi chuyển event nhanh. Lưu scramble đã dùng cùng solve.
- [ ] Kiểm tra generator, text, puzzle 3D và solve record dùng cùng một scramble. Đọc lại dữ liệu `scramble: null` từ pha 2–3.
- [ ] Chạy kiểm tra, push commit và dừng để xác nhận pha 4.

## Pha 5 · `feature/algorithm-database`

- [ ] Thêm catalog JSON v1 và dữ liệu mẫu có kiểm chứng cho CFOP (F2L, OLL, PLL), Roux và ZZ. Ghi nguồn và giấy phép cho dữ liệu nhập.
- [ ] Dựng trình chọn Method → Step → Case → Variant. Hiển thị notation và góc cầm của variant được chọn.
- [ ] Áp dụng `referenceSetupAlg`, `rotation`, `preAuf` và camera khi chọn variant. Dựng trạng thái ban đầu bằng player adapter.
- [ ] Kiểm tra catalog có case nhiều variant, từ chối notation hoặc ID sai và xác minh các variant theo mục tiêu của step.
- [ ] Chạy kiểm tra, push commit và dừng để xác nhận pha 5.

## Pha 6 · `feature/step-by-step-formula-player`

- [ ] Xác nhận bản `cubing.js` đã pin hỗ trợ đọc timeline, seek từng move và chế độ input cần thiết trên chuột/chạm.
- [ ] Dùng `cubing/alg` để tạo move đã mở rộng. Render mỗi move một `<span>` và đánh dấu `activeMoveIndex` bằng khung vuông.
- [ ] Hoàn thiện Play/Pause, Next, Previous và đồng bộ camera/notation theo cursor của adapter. Thêm nhãn điều khiển và chỉ báo focus.
- [ ] Cho phép orbit camera và xoay tầng ở Simulation. Tắt xoay tầng trong Viewer, khôi phục cursor khi quay lại Viewer.
- [ ] Kiểm tra move đơn, move kép, wide, rotation, nhóm lặp, AUF, pause giữa move, biên đầu/cuối, seek liên tục, đổi variant khi đang phát và cleanup khi unmount.
- [ ] Chạy kiểm tra, push commit và dừng để xác nhận pha 6.

## Pha 7 · `feature/multiplatform-setup`

- [ ] Thêm manifest, icons và service worker cho Web PWA. Cache cả chunks/worker/asset động cần cho scramble và 3D.
- [ ] Xử lý cập nhật app sau khi timer hoàn tất. Kiểm tra migration IndexedDB với lịch sử từ bản trước.
- [ ] Cấu hình Tauri và build thử trên Windows, Linux, macOS. Smoke test trên gói cài từng hệ điều hành.
- [ ] Cấu hình Capacitor Android/iOS và đồng bộ Vite `dist`. Kiểm tra thao tác chạm, xoay màn hình và khởi động lại trên thiết bị hoặc simulator phù hợp.
- [ ] Kiểm tra offline end-to-end cho timer, lịch sử và công thức trên cả ba đích. Kiểm tra hiệu năng tải màn hình timer và độ mượt của 3D trên thiết bị đại diện.
- [ ] Chạy kiểm tra, push commit và báo cáo kết quả từng nền tảng.
