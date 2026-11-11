# Hợp đồng API nội bộ và dữ liệu

Các kiểu và thao tác dưới đây là hợp đồng TypeScript giữa các mô-đun. Dữ liệu luyện tập lưu cục bộ trong Dexie. Catalog công thức là JSON đọc từ assets của ứng dụng.

## Puzzle registry

`puzzleId` là khóa ổn định của CubeTimer. `wcaEventId` truyền vào `randomScrambleForEvent`. `twistyPuzzleId` cấu hình puzzle cho `<twisty-player>`. Thêm biến thể sự kiện như `333oh` bằng ID scope riêng nếu cần lịch sử tách biệt.

| `puzzleId` | `wcaEventId` | `twistyPuzzleId` |
| --- | --- | --- |
| `222` | `222` | `2x2x2` |
| `333` | `333` | `3x3x3` |
| `444` | `444` | `4x4x4` |
| `555` | `555` | `5x5x5` |
| `666` | `666` | `6x6x6` |
| `777` | `777` | `7x7x7` |
| `minx` | `minx` | `megaminx` |
| `pyram` | `pyram` | `pyraminx` |
| `skewb` | `skewb` | `skewb` |
| `sq1` | `sq1` | `square1` |
| `clock` | `clock` | `clock` |

## IndexedDB v1

```ts
db.version(1).stores({
  sessions: 'id,[puzzleId+createdAtMs+id]',
  solves: 'id,[puzzleId+sessionId+finishedAtMs+id]',
});
```

ID do ứng dụng cấp và được lưu dưới dạng chuỗi. Tạo UUID v4 cho session đặt tên và solve. Session mặc định có ID `default:<puzzleId>` để các tab cùng khởi tạo một bản ghi. Mốc thời gian là Unix epoch UTC, đơn vị ms. `elapsedMs` là số nguyên dương, làm tròn từ đồng hồ đơn điệu với giá trị tối thiểu 1 ms. UI định dạng thời điểm theo múi giờ cục bộ.

### Session record

```json
{
  "id": "default:333",
  "puzzleId": "333",
  "name": "Luyện 3x3",
  "createdAtMs": 1794355200000
}
```

Tên sau khi trim dài 1–80 ký tự. `puzzleId` bất biến từ khi tạo. Session cùng tên có thể cùng tồn tại. Thao tác đổi tên chỉ cập nhật trường `name`.

### Solve record

```json
{
  "id": "4a10c1b4-8264-45f4-afb8-10f0ff8fb652",
  "puzzleId": "333",
  "sessionId": "default:333",
  "elapsedMs": 12843,
  "finishedAtMs": 1794355212843,
  "penalty": "plus2",
  "scramble": {
    "eventId": "333",
    "notation": "R2 F U2 B2 L2 F' U L D' F2 R D2 R2 U' R2 D2 B2 L2",
    "source": "cubing.js"
  }
}
```

`penalty` nhận `none`, `plus2` hoặc `dnf`. `scramble` là `null` với lượt luyện không có scramble ở pha 2–3, hoặc snapshot có `eventId`, `notation`, `source`. Từ pha 4, lượt mới lưu scramble đã hiển thị lúc bắt đầu. `eventId` phải khớp registry và `notation` được lưu nguyên dạng từ generator. Dữ liệu pha trước tiếp tục đọc được.

### Thao tác repository

| Thao tác | Hợp đồng |
| --- | --- |
| `listSessions(puzzleId)` | Đọc theo index session, giới hạn đúng puzzle. |
| `getOrCreateDefaultSession(puzzleId)` | Transaction đọc hoặc thêm session theo ID xác định. Hai lần gọi trả cùng ID. |
| `createSession(puzzleId, name)` | Kiểm tra puzzle và tên rồi ghi session mới. |
| `renameSession(scope, name)` | Kiểm tra session thuộc scope rồi đổi tên. |
| `recordSolve(solve)` | Transaction bao gồm `sessions` và `solves`. Kiểm tra puzzle của session. Cùng ID và cùng nội dung là lần thử lại thành công. Cùng ID và nội dung khác trả lỗi xung đột. |
| `listSolves(scope)` | Đọc range của compound index theo `puzzleId` và `sessionId`. Trả theo `finishedAtMs ASC, id ASC`. |
| `setSolvePenalty(scope, solveId, penalty)` | Kiểm tra solve thuộc scope trước khi sửa penalty trong transaction. |

`scope` gồm `{ puzzleId, sessionId }`. Repository trả lỗi khi puzzle lạ, session không tồn tại, scope không khớp hoặc dữ liệu sai kiểu. Lỗi lưu trữ giữ nguyên dữ liệu đang chờ ở timer. Khi thay schema, tăng `db.version`, dùng migration trong transaction và thử nâng cấp trên dữ liệu hiện hữu.

## Thống kê và bộ lọc

- Single bằng `elapsedMs` hoặc `elapsedMs + 2000` với `plus2`. `dnf` là một trạng thái. Giá trị hiển thị quy đổi xuống centisecond sau khi tính toán bằng ms.
- Ao5/Ao12 dùng đúng 5/12 lượt liên tiếp tính đến và bao gồm lượt đang xét. Xếp DNF sau mọi thời gian hợp lệ, bỏ một kết quả tốt nhất và một kết quả tệ nhất rồi lấy trung bình phần còn lại. Nếu còn DNF, hiển thị DNF. Nếu chưa đủ lượt, hiển thị `—`. Ao12 áp dụng cùng quy tắc loại biên cho thống kê luyện tập.
- Mean hiển thị trung bình các Single hợp lệ trong session, có tính `plus2`. Nếu toàn bộ lượt là DNF hoặc session rỗng, hiển thị `—`. Hiển thị số lượt hợp lệ trên tổng số lượt cùng Mean.
- `full` hiển thị Single, Ao5 và Ao12. `averages` hiển thị Ao5 và Ao12. `best` chọn tối đa 5 lượt có Single hợp lệ nhỏ nhất, sau đó áp dụng sắp xếp UI. Mọi chế độ giữ timestamp để nhận biết lượt giải. Tính lại rolling average khi penalty đổi.
- Các lựa chọn sort gồm Single tăng/giảm và hoàn thành mới nhất/cũ nhất. DNF đứng cuối ở cả hai chiều sắp xếp Single. Khi Single bằng nhau, ưu tiên lượt mới nhất rồi ID tăng dần. Khi timestamp bằng nhau, dùng ID cùng chiều với timestamp. Sắp xếp và lọc diễn ra sau khi tính Ao theo thứ tự gốc.

Ví dụ năm lượt `10.00`, `11.00`, `12.00 + 2`, `13.00`, `DNF` cho Ao5 `12.66` và Mean `12.00` trên 4 lượt hợp lệ. Quy tắc loại biên của Ao5 tham chiếu [WCA Regulations, mục 9f8–9f9](https://www.worldcubeassociation.org/regulations/#9f8).

## Alg Database JSON v1

Catalog lồng theo `methods[].steps[].cases[].variants[]`. ID ổn định ở mỗi cấp và `variant.id` duy nhất trên toàn catalog. `case.puzzleId` tham chiếu registry. `name` và `label` dành cho hiển thị. Thêm method hoặc step bằng dữ liệu. CFOP, Roux, ZZ là phạm vi triển khai đầu tiên. Blind và các bộ case như COLL có thể mở rộng qua cùng hợp đồng.

```json
{
  "schemaVersion": 1,
  "methods": [
    {
      "id": "cfop",
      "name": "CFOP",
      "steps": [
        {
          "id": "pll",
          "name": "PLL",
          "cases": [
            {
              "id": "t-perm",
              "puzzleId": "333",
              "name": "T-Perm",
              "referenceSetupAlg": "F R U' R' U R U R2 F' R U R U' R'",
              "variants": [
                {
                  "id": "cfop/pll/t-perm/standard",
                  "label": "Tiêu chuẩn",
                  "alg": "R U R' U' R' F R2 U' R' U' R U R' F'",
                  "setup": {
                    "rotation": "",
                    "preAuf": "",
                    "camera": { "latitude": 25, "longitude": 30 }
                  },
                  "postAuf": ""
                },
                {
                  "id": "cfop/pll/t-perm/inverse",
                  "label": "Chuỗi nghịch đảo",
                  "alg": "F R U' R' U R U R2 F' R U R U' R'",
                  "setup": {
                    "rotation": "",
                    "preAuf": "",
                    "camera": { "latitude": 25, "longitude": -30 }
                  },
                  "postAuf": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Setup và kiểm tra catalog

1. Từ trạng thái solved chuẩn của puzzle, áp dụng `referenceSetupAlg`, sau đó `setup.rotation`, rồi `setup.preAuf` theo notation của puzzle. Đây là ranh giới 0. Chọn variant khác dựng lại ranh giới 0 từ đầu.
2. `rotation` dùng các phép xoay toàn khối mà puzzle hỗ trợ, ví dụ `y` cho 3x3. `preAuf` và `postAuf` nhận `""`, `U`, `U'`, `U2` ở catalog 3x3. `preAuf` là phần setup. `postAuf` là nước hiệu chỉnh sau công thức và xuất hiện trên timeline khi có giá trị.
3. Phát `alg` rồi `postAuf`. Catalog phải kiểm tra kết quả theo điều kiện của step. PLL cần hoàn thành last layer và giữ các lớp dưới. OLL cần định hướng last layer và giữ F2L. Với các step khác, test định nghĩa vùng cần giải và vùng phải giữ bằng mô hình puzzle. Chuẩn hóa khung tham chiếu khi variant chứa phép xoay toàn khối.
4. `camera` chứa vĩ độ và kinh độ theo độ cho góc nhìn ban đầu. Góc nhìn camera độc lập với `rotation` và AUF của trạng thái khối.
5. Validator kiểm tra phiên bản, trường bắt buộc, ID trùng, puzzle hợp lệ và chuỗi notation bằng `cubing/alg` cùng mô hình puzzle. Mỗi variant cần ít nhất một move thực thi. Cùng biểu diễn move đã mở rộng được dùng để kiểm tra trạng thái, dựng timeline và vẽ token. Dữ liệu lấy từ nguồn bên ngoài cần lưu thông tin nguồn và giấy phép trước khi đóng gói.
