# MELANTA — HANDOFF TÍCH HỢP SAGA FIGHT

**Bản chốt:** Build 4.9 · 12/11/2026  
**Nhân vật:** Melanta — Vũ điệu gai tím · Character Lab 005  
**Vũ khí:** Phi đà hai đầu đao nối bằng dây.  
**Bản xem thử:** https://melanta-violet-dance.neat-bowl-4907.chatgpt.site  
**Source commit:** `85e4eb2f07b0521a99bc76b6ae9e891ff813d666`

> Đây là bản nguồn lab độc lập đã triển khai các thay đổi được chốt. Chưa tích hợp vào repository/game chính Saga Fight, chưa có online PvP trong gói này. Gói đi kèm là nguồn tham chiếu để chuyển cơ chế, rig, VFX và cảnh kết liễu sang hệ thống hiện có; không thay nguyên engine game chính bằng engine lab.

## 1. Tệp bàn giao

Gói `MELANTA_Build_4_9_Integration_Pack.zip` gồm:

| Tệp/thư mục | Nội dung |
|---|---|
| `MELANTA_HANDOFF.md` | Đặc tả chốt, thông số, lưu ý tích hợp và nghiệm thu. |
| `dist/engine.js` | Logic lab: di chuyển, hit, kỹ năng, hồi máu, trạng thái trận và trigger kết liễu. |
| `dist/rig.js` | Rig tay/chân, tóc có quán tính, dây vật lý, tư thế, bóng mờ và điểm cầm. |
| `dist/ult-frame.js` | Dải tím liền khối ở góc dưới trái/trên phải khi dùng R. |
| `dist/finisher.js` | Timeline 2 giây, tư thế quật, camera, dây liên tục, phép chiếu và lịch sử bóng mờ. |
| `dist/game.js` | Renderer Canvas2D, VFX, giao diện lab và lớp composite cho cảnh kết liễu. |
| `dist/index.html`, `dist/style.css` | Bản chạy thử độc lập; không phải giao diện bắt buộc của game chính. |
| `tests/check*.cjs` | 24 bộ kiểm tra nguồn đang chốt. |
| `VALIDATION.txt`, `VALIDATION.json` | Kết quả kiểm tra thực tế, kèm SHA nguồn. |
| `INTEGRATION_PROMPT.txt` | Yêu cầu triển khai có thể giao cho lượt cập nhật game chính. |
| `CHECKSUMS.sha256` | SHA-256 của các tệp trong gói. |

Không chứa token, thông tin đăng nhập, thư mục `.git`, cấu hình hosting hoặc bản chụp trình duyệt.

## 2. Nhận diện, đồ họa và chuyển động

- Giữ silhouette tím, dáng tóc và tỷ lệ nhân vật đã có; không tự thêm mặt hoặc đổi thiết kế.
- Tóc, hai đầu đao và dây có độ trễ/quán tính; dây phải bám đúng tay cầm và lưỡi đao.
- Tay hoạt động theo vai–khuỷu–cổ tay; chân co/duỗi theo pha lên cao, rơi và tiếp đất.
- Không bóp ngang nhân vật để giả lập xoay. Camera kết liễu có phép chiếu góc hơi cao từ phía đao; đây là dựng 2.5D từ đồ họa 2D, không phải mô hình 3D.
- Đánh trúng tạo vết cắt tím thuôn theo hướng va chạm, kèm glitch ngắn. Đánh hụt không tạo vết cắt trên mục tiêu.
- Đánh thường khi đang chạy vẫn giữ chuyển động ngang và animation chân. Có thể đi lùi trong lúc đòn đã cam kết hướng; không lật hướng đao giữa cùng một đòn.
- Đánh thường trên không tiếp tục chịu trọng lực và tiếp đất, không treo người. E trên không cũng giữ đà nhảy/rơi.

## 3. Thông số combat hiện tại

Đơn vị là đơn vị tọa độ lab; cần quy đổi theo kích thước nhân vật/đấu trường game chính, không coi là pixel màn hình.

| Hành động | Sát thương | Tầm/phạm vi | Thời gian | Hồi chiêu |
|---|---:|---|---|---:|
| Đánh thường N1–N2–N3 | 60/đòn | Tầm lưỡi đao 300 | Mỗi đòn 0,5 giây | 0,48 giây |
| Q · Skill 1 | 100, một lần | Điểm nện trước mặt 375; nổ bán kính 190 | Animation 1,32 giây; chạm đất 0,72 giây | 3 giây |
| W · Skill 2 | 80, một lần khi áp sát | Bắt mục tiêu phía trước trong tầm 700 | Animation 1,05 giây; bắt khoảng 0,28 giây; lao 0,4–0,8 giây | 6 giây |
| E · Skill 3 | 50, một lần/mục tiêu | Lộn 330 | Animation 0,78 giây; tăng tốc +35% trong 2 giây từ lúc kích hoạt | 3 giây |
| R · Skill 4 | 25/hit; 13 hit, tối đa 325 | Bán kính 500 | Múa 4 giây sau khi tiếp đất; tick mỗi 0,3 giây tại 0,3–3,9 giây | 14 giây |

- HP lab: Melanta 1.500; mục tiêu 5.000. Đây là giá trị thử nghiệm, không yêu cầu thay HP/cân bằng toàn game.
- Đánh thường ngắt chuỗi quá 0,55 giây sau đòn trước sẽ về N1. Va chạm dùng swept polygon của lưỡi đao; dây và vệt sáng không gây thêm hit.
- Q dùng điều kiện khoảng cách tới tâm nổ **nhỏ hơn** 190; R dùng khoảng cách **không lớn hơn** 500 trong nguồn hiện tại. Khi đổi hệ tọa độ, giữ nhất quán giữa hitbox và VFX.

## 4. Chi tiết từng kỹ năng

### Q — Tử đằng giáng

Nhún → nhảy vận chiêu tại chỗ → quật phi đà xuống đất → thu dây, tiếp đất. Không lao ngang. Dải năng lượng bám đường vũ khí; dây có độ võng và chuyển động tiếp nối sau va chạm.

Nổ tím có chân rộng, tia thuôn, sóng xung kích lan sát đất và đất đá bay rồi rơi. Dùng chung thông số bán kính với hitbox. Trúng địch gây choáng 1 giây, ngăn di chuyển/phản công trong lab; sương tím bám mục tiêu rồi tan. Không làm mới choáng do chính VFX nổ.

### W — Phi đà trói buộc

Phóng dây → quấn siết → dây căng → lao đúng hướng tới mục tiêu → thu dây. Mục tiêu bị trói chân từ lúc bắt trúng đến khi Melanta áp sát. Trói chân là khóa di chuyển; không tự đổi thành choáng khi tích hợp.

Dáng lao ngả nhẹ ra sau theo lực kéo, cân bằng khi đến nơi. Bóng mờ tím lưu cả người và tóc. Dùng easing tăng tốc/hãm, không lao ngược ở cự ly gần. Đánh hụt vẫn tốn hồi chiêu.

**Nối W → R:**

- Nhận lệnh R ở cuối pha lao (từ khoảng 0,6 giây nếu đã bắt trúng).
- Chỉ bắt đầu R sau khi W gây hit áp sát ở khoảng 0,8 giây; không hủy mất hit 80 sát thương hoặc kéo dài trói.
- Nếu W đánh hụt, giữ hết recovery 1,05 giây; R có thể được buffer trong 0,24 giây cuối.
- Khi nối chiêu, chuyển tiếp tư thế và dùng lại dây W để tránh khựng/nhảy vị trí vũ khí.
- Đây là nối W → R đã được yêu cầu, không tự áp dụng cơ chế cancel tương tự cho mọi chiêu hoặc mọi nhân vật.

### E — Ảnh vũ

Lấy đà → thu gối/khép tay → lộn tiến quanh hông → mở người tiếp đất. Hai hướng phải đối xứng và cùng đúng chiều tiến; tóc và dây có độ trễ. Dùng trên không giữ vận tốc dọc/trọng lực, không trả về độ cao ban đầu hoặc đặt vận tốc rơi về 0 ở cuối chiêu.

### R — Vũ điệu gai tím

- Hai đầu đao cùng vung vắt chéo, luân phiên đổi bên liên tục; tay dùng chung nhịp với vũ khí. Chu kỳ vung mỗi đầu đao 0,6 giây, các hit luân phiên cách 0,3 giây.
- Dây có quán tính, bóng mờ của cả hai đao và dây bám lịch sử chuyển động. Giữ các điểm nổ chạm đất.
- Nền sáng dưới chân loang mềm; dải tím liền khối có lấp lánh tại góc dưới trái và trên phải khung trận đấu. Dải xuất hiện khi R hoạt động, kể cả pha nện từ trên không, và tan khi R kết thúc.
- Nếu cast trên không: vào pha `plunge`, lao/nện dọc xuống đất liên tục, không teleport. Sau khi chạm đất mới bắt đầu đồng hồ múa 4 giây và 13 tick sát thương. Cú tiếp đất không được tự cộng thêm sát thương.
- Trong R khóa di chuyển và giảm 20% sát thương nhận trong nguồn lab, kể cả pha nện. Hồi chiêu bắt đầu lúc kích hoạt, không đợi tiếp đất.
- Mỗi hit R thực sự gây sát thương hồi **6 máu**, kể cả hit kết liễu; tối đa 78 máu nếu đủ 13 hit. Không vượt HP tối đa, không hồi khi đánh hụt, không tính 6 máu trên từng điểm sát thương.
- Hồi máu có sương tím nhẹ, lấp lánh và số `+6` (hoặc lượng thực hồi nhỏ hơn khi gần đầy máu). Dùng một trạng thái VFX được làm mới, không chồng thêm hệ hạt mỗi hit.

## 5. Cảnh kết liễu — bản chốt 4.9

**Trigger:** mục tiêu bị hạ bởi đòn thật của Melanta, không phụ thuộc riêng R. Đánh thường/Q/W/E/R đều dùng được. Không kích hoạt chỉ vì gây sát thương chưa đủ hạ mục tiêu.

**Flow:** `playing → finishing → finished`.

1. Chốt hit gây hạ gục một lần, giải phóng trói/choáng, ngừng combat và xóa input buffer.
2. Chạy cảnh kết liễu tổng cộng 2 giây. Combat clock, AI, sát thương, hồi máu và hồi chiêu không tiếp tục xử lý trong cảnh; hiệu ứng hit cũ vẫn được dọn để không lưu số sát thương khi trở lại trận.
3. Nhân vật giơ tay lấy đà, sau đó quật phi đà từ trên xuống một nhát. Tay dẫn lực, đao theo sau; chiều dài tay cố định theo hai khớp. Đầu đao xoay có quán tính, không lật góc tức thời.
4. Nền tím có lấp lánh nhẹ. Camera hơi cao, phía đầu đao chém nhìn về nhân vật, tiền cảnh có chiều sâu.
5. Trở lại khung trận đấu rồi hiện Chiến thắng và nút Đấu lại. Không tự hồi sinh mục tiêu trong lượt đã kết thúc.

| Mốc timeline | Chuyển cảnh |
|---|---|
| 0–0,10 giây | Đấu trường tối dần. |
| 0,10–0,22 giây | Cảnh kết liễu hiện từ nền tối. |
| 0,22–1,70 giây | Cảnh cận; lấy đà, quật xuống, follow-through. |
| 1,70–1,85 giây | Cảnh kết liễu tan về nền tối. |
| 1,85–2,00 giây | Khung trận đấu hiện trở lại. |
| Sau 2 giây | Hiện kết quả; Đấu lại reset đầy đủ. |

**Các ràng buộc phải giữ khi port:**

- Vẽ toàn bộ cảnh với opacity 1 vào một canvas/layer trung gian, sau đó mới áp alpha **một lần** cho toàn cảnh. Không fade từng mảnh tay, thân, hông, tóc: cách đó làm lộ các vùng chồng khác màu.
- Lớp chuyển tối che kín đấu trường bất cứ khi nào cảnh cận đang hiện; không để nhân vật nhỏ/đấu trường cũ xuyên qua silhouette cận.
- Dây là một đường liên tục: đầu đao sau → tay sau → đoạn dây nối qua hai tay → tay trước → đầu đao trước. Hai điểm cầm, gốc đao và hai đầu đoạn nối phải trùng chính xác.
- Cơ thể, dây, đao, đoạn nối và bóng mờ dùng cùng phép chiếu camera. Không chiếu đao riêng nhưng để điểm cầm ở hệ tọa độ cũ.
- Bóng mờ lấy từ snapshot thật của dây **và** đao cùng timestamp, giữ nguyên góc/tỷ lệ của snapshot; không dùng một mảng sáng độc lập đi tắt qua đường chém.
- Bố cục cinematic trong nguồn tham chiếu là góc nhìn cố định; `finisher.dir` giữ hướng của killer, còn actor cảnh cận dựng theo bố cục riêng. Không dùng vị trí/đao cinematic làm hitbox combat.
- Không gây thêm damage hoặc hồi thêm HP trong cảnh kết liễu.

## 6. Điểm nối kỹ thuật vào game chính

Thứ tự script của bản lab:

```text
engine.js → rig.js → ult-frame.js → finisher.js → game.js
```

Nếu dùng bundler/module, chuyển các global thành import/export tương ứng, giữ thứ tự phụ thuộc. `game.js` gắn chặt DOM của lab và dùng biến `ctx`, `ground`; cần chuyển phần render thành adapter, không chép nguyên UI vào trận đấu chính.

| Thành phần | Cách nối đề xuất |
|---|---|
| ID nhân vật | Dùng ID registry còn trống; `005` là nhãn lab, không ép ghi đè ID đang có. |
| Input | Map attack/Q/W/E/R và jump sang hệ input hiện tại, gồm bàn phím/touch. Chặn input combat trong finisher/result. |
| Vật lý | Giữ hệ gravity/collision/arena của game chính; quy đổi khoảng cách và animation từ lab theo tỷ lệ thống nhất. |
| Tọa độ | Lab logic dùng `p.y` dương lên; rig dùng y tương đối âm phía trên đất; renderer đổi sang `ground - y`. Cần adapter rõ ràng để tránh dây/hitbox lật trục. |
| Hit | Port cơ chế swept blade cho N1–N2–N3; mỗi lần cast có hit guard riêng. Khi actor di chuyển, cập nhật lịch sử origin theo bước mô phỏng. |
| Status | Choáng Q 1 giây và trói W đến thời điểm áp sát phải vào status system hiện tại, có cleanup khi chết/reset/hủy hợp lệ. |
| HP / hồi máu | Chỉ hồi sau xác nhận hit R thực sự gây damage; clamp theo max HP; không kích hoạt theo particle hoặc số damage hiển thị. |
| State kỹ năng | Giữ tách `plunge`/`dance` của R và buffer W → R. Không để VFX tự thay state combat. |
| Kết thúc trận | Chèn finisher một lần vào flow KO/victory hiện tại; thay panel kết quả lab bằng panel hiện có của Saga Fight. |
| Renderer | Giữ silhouette, tỷ lệ khớp, cache VFX, canvas composite và phép chiếu camera thống nhất. |

**PvP Online:** nguồn lab không có netcode. Khi tích hợp, máy/host có thẩm quyền xác nhận damage, HP, trói/choáng, hồi máu và KO. Đồng bộ event finisher cùng ID trận/killer/victim và thời điểm bắt đầu; bảo đảm dedupe để không chạy hai lần. Không gửi từng particle/node dây qua mạng. Không đóng băng vòng lặp network hoặc toàn bộ simulation online để phát cinematic ở client. Nối cinematic vào match-end protocol hiện tại, không làm người chơi khác chờ vô hạn. Các mục này là yêu cầu tích hợp, chưa phải tính năng đã kiểm chứng của gói lab.

## 7. Hiệu năng và tài nguyên

- Nguồn không cần sprite/ảnh ngoài cho nhân vật: hình dạng dùng path/vector inline và Canvas2D. Không có file audio trong gói này.
- Bản HTML có font Google Fonts; nếu offline dùng fallback font. Không biến font thành phụ thuộc của combat.
- Loop hiện tại mô phỏng ở 120 Hz; các kiểm tra có bước 30/60/120 Hz. Khi port, dùng fixed timestep tương đương và interpolation phù hợp; không gắn sát thương vào render FPS.
- Dải tím R: hai atlas 512×256, dựng một lần; tối đa 10 sprite draw/frame, giảm còn 4 ở mức chi tiết thấp.
- Sương hồi máu: tái dùng sprite; tối đa 11 sprite draw/frame, giảm còn 6 khi FPS thấp; không tạo hạt/canvas mới trên mỗi hit.
- Finisher dùng một background cache 960×400 và một composite canvas tái sử dụng, resize theo viewport; không cấp phát canvas mới mỗi frame.
- Lịch sử cinematic có giới hạn 14 snapshot, cửa sổ khoảng 0,16 giây, lấy mẫu tối đa khoảng 60 Hz; đầu đao xoay có giới hạn tốc độ góc.
- Chỉ chạy render/rig cinematic trong pha kết liễu. Không dùng blur toàn màn hình mỗi frame. Các mức draw trên là của từng hiệu ứng, không phải tổng draw call của toàn game.
- Đây là tối ưu cấu trúc và kiểm tra trên lab; không bảo đảm mọi thiết bị giữ nguyên FPS. Cần đo trên iOS/Android/desktop mục tiêu sau khi tích hợp, nhất là PvP hai nhân vật cùng dùng hiệu ứng.

## 8. Kiểm thử và chạy thử

Tại thời điểm đóng gói, **24/24 bộ kiểm tra `check*.cjs` đã PASS** trên nguồn commit nêu ở đầu file. Xem `VALIDATION.txt` để biết từng lệnh và đầu ra. Có kiểm tra ở 30/60/120 Hz, va chạm/hit guard, trói/choáng, R nện–hồi máu, chuyển W→R, đánh khi chạy, rig tóc/dây, finisher và composite fade.

Chạy lab sau khi giải nén:

```bash
python3 -m http.server 8080 --directory dist
```

Mở `http://localhost:8080`. A/D hoặc ←/→ di chuyển; ↑ nhảy; Space đánh; Q/W/E/R dùng kỹ năng. Có nút Đặt địch trước mặt, Test nhận 100 ST, Bỏ hồi chiêu và Test kết liễu.

Chạy test từ thư mục gốc gói:

```bash
node RUN_TESTS.cjs --logic-only
```

Lệnh trên chạy 23 bài không cần dependency ngoài. Để chạy đủ 24 bài, gồm native render/composite:

```bash
npm install
npm test
```

`package.json` ghim phiên bản `@napi-rs/canvas` đã dùng khi bàn giao. Nếu đang ở runtime đã cài package, có thể dùng biến `CODEX_PRIMARY_RUNTIME_NODE_MODULES` như các kiểm tra gốc. Cần Node.js hỗ trợ các cú pháp JavaScript hiện tại; môi trường kiểm tra bàn giao dùng Node 24.

Các test trong gói chỉ được chuẩn hóa đường dẫn import từ `./dist/` thành `../dist/` vì nằm trong thư mục `tests/`; runner đặt working directory ở gốc gói. File JavaScript trong `dist/` giữ nguyên byte so với nguồn chốt. Bài composite là kiểm tra native Canvas2D, không thay cho kiểm tra trình duyệt và thiết bị thực.

## 9. Checklist nghiệm thu tích hợp

- [ ] Không đổi đồ họa/thông số của nhân vật khác hoặc cơ chế combat toàn game ngoài phần adapter cần thiết.
- [ ] N1–N2–N3 vừa chạy vừa đánh; đánh trên không không treo; blade, rope, hitbox cùng origin.
- [ ] Q đứng tại chỗ vận/nhảy/quật; nổ khớp hitbox và choáng đúng 1 giây.
- [ ] W đúng hướng, trói đến lúc tới; không đảo lao ở gần; W→R không bị khựng và không mất hit W.
- [ ] E lộn đúng chiều; dùng trên không không reset đà rơi.
- [ ] R hai đầu đao vắt chéo; tay đúng nhịp; cast trên không phải nện trước, chưa gây damage/heal khi còn đang nện.
- [ ] 13 hit R tối đa 325 damage và 78 heal trước các modifier của game chính; hụt không heal, không vượt max HP.
- [ ] Mục tiêu chết bởi bất kỳ đòn nào chỉ phát một finisher 2 giây; không còn hit/heal/AI chạy trong flow lab đã chốt.
- [ ] Fade không lộ các mảng nhân vật; dây liền từ hai đao qua hai tay; camera/bóng mờ cùng phép chiếu.
- [ ] Fade về trận trước khi hiện kết quả; pause/resume/reset/đấu lại không giữ state/particle cũ.
- [ ] Responsive/touch không che nút; không zoom trang khi bấm liên tục.
- [ ] PvE và PvP được kiểm tra riêng; damage/HP/KO do authority xác nhận, finisher không làm đứt kết nối.

**Trạng thái bàn giao:** bản lab chốt 4.9 + nguồn tham chiếu + kiểm thử, sẵn sàng cho bước tích hợp; chưa tuyên bố đã cập nhật Melanta vào game chính Saga Fight.
