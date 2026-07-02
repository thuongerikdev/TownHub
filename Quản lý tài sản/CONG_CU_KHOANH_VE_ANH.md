# Công cụ tự khoanh vẽ ảnh màn hình (cho tài liệu hướng dẫn)

Dùng để tạo ảnh có **vòng tròn đỏ + số ①②③** bám chính xác vào nút/vùng trên giao diện,
rồi dán vào các khung `[ẢNH n]` trong 3 file Word hướng dẫn.

## Cách dùng (mỗi màn ~15 giây)

1. Đăng nhập TownHub, mở màn hình cần chụp.
2. Mở **DevTools → Console** (phím `F12`, chọn tab *Console*).
3. **Dán 1 lần** đoạn "SETUP" bên dưới rồi Enter (chỉ cần làm lại nếu tải lại trang).
4. Dán **1 dòng preset** tương ứng màn hình đó rồi Enter → vòng đỏ + số hiện lên.
5. Chụp vùng đó: `Win + Shift + S`, quét vùng cần lấy → ảnh vào clipboard.
6. Trong Word, bấm vào khung `[ẢNH n]` đúng số → `Ctrl + V` để dán.
7. Muốn xoá khoanh vẽ để chụp lại sạch: chạy `clearA()`.

> Số trong preset (1,2,3…) chính là số ①②③ trong **Bảng đặc tả ảnh** dưới mỗi khung.
> Nếu một nút không được khoanh (đổi nhãn), sửa chữ trong ngoặc cho khớp chữ trên màn hình.

---

## SETUP — dán 1 lần vào Console

```js
window.clearA = () => document.querySelectorAll('[data-annot]').forEach(e => e.remove());
window.A = function (T) {
  clearA();
  const find = (q) => {
    q = q.trim().toLowerCase();
    let best = null, ba = 1e18;
    for (const el of document.querySelectorAll('button,a,h1,h2,h3,label,th,input,textarea,span,div')) {
      const tx = ((el.getAttribute && el.getAttribute('placeholder')) || el.textContent || '').trim().toLowerCase();
      if (!tx) continue;
      if (tx === q || (tx.indexOf(q) >= 0 && tx.length <= q.length + 25)) {
        const r = el.getBoundingClientRect();
        if (r.width < 3 || r.height < 3) continue;
        const a = r.width * r.height; if (a < ba) { ba = a; best = el; }
      }
    }
    return best;
  };
  const miss = [];
  T.forEach(([q, n]) => {
    const el = find(q); if (!el) { miss.push(q); return; }
    const r = el.getBoundingClientRect(), p = 6;
    const ring = document.createElement('div'); ring.setAttribute('data-annot', '1');
    Object.assign(ring.style, { position: 'fixed', left: (r.left - p) + 'px', top: (r.top - p) + 'px',
      width: (r.width + 2 * p) + 'px', height: (r.height + 2 * p) + 'px', border: '3px solid #E53935',
      borderRadius: '10px', zIndex: 2147483647, pointerEvents: 'none', boxShadow: '0 0 0 2px rgba(255,255,255,.55)' });
    document.body.appendChild(ring);
    const b = document.createElement('div'); b.setAttribute('data-annot', '1'); b.textContent = n;
    Object.assign(b.style, { position: 'fixed', left: (r.left - p - 13) + 'px', top: (r.top - p - 13) + 'px',
      width: '26px', height: '26px', background: '#E53935', color: '#fff', borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', font: 'bold 15px Arial', zIndex: 2147483647,
      pointerEvents: 'none', boxShadow: '0 1px 4px rgba(0,0,0,.5)' });
    document.body.appendChild(b);
  });
  return miss.length ? 'Không thấy: ' + miss.join(', ') : 'OK';
};
```

---

## Preset theo màn hình

### FILE 1 — Phân hệ Tài sản

```js
// [ẢNH 3] Quản lý tài sản – tổng quan  (/assets)
A([["Quét QR",1],["Xuất CSV",2],["Thêm tài sản",3],["Tổng tài sản",4],["Tìm theo tên",5],["Tất cả trạng thái",6]]);

// [ẢNH 5] Form thêm tài sản  (mở form "Thêm tài sản" trước)
A([["Mã tài sản",1],["Tên tài sản",2],["Danh mục",3],["Tạo tài sản",4]]);

// [ẢNH 8] Danh mục tài sản  (/assets/categories)
A([["Thêm danh mục",1],["Tìm danh mục",2]]);

// [ẢNH 10] Báo cáo khấu hao  (/assets/depreciation)
A([["Khấu hao kỳ này",1],["Số tài sản tính KH",2],["Giá trị còn lại",3],["Khấu hao luỹ kế",4]]);

// [ẢNH 11] Quét mã QR  (/assets/scan)
A([["Nhập mã thủ công",1],["Tra cứu",2],["Chọn ảnh mã QR",3]]);
```

### FILE 2 — Phân hệ Vận hành & Kỹ thuật

```js
// [ẢNH 1] Lịch bảo trì  (/pm/schedules)
A([["Tổng lịch",1],["Đang chạy",2],["Sắp tới hạn",3],["Quá hạn",4]]);

// [ẢNH 2] Work Order – danh sách  (/pm/work-orders)
A([["Tổng WO",1],["Chờ phân công",2],["Đang thực hiện",3],["Trễ hạn",4]]);

// [ẢNH 5] Kho vật tư  (/inventory)
A([["Tổng vật tư",1],["Sắp hết",2],["Hết hàng",3],["Giá trị tồn kho",4]]);

// [ẢNH 8] Đề xuất mua hàng PR  (/procurement/requests)
A([["Tổng PR",1],["Chờ duyệt",2],["Đã duyệt",3],["Từ chối",4]]);

// [ẢNH 10] Hóa đơn & Thanh toán  (/procurement/invoices)
A([["Chờ thanh toán",1],["Quá hạn",2],["Đã thanh toán",3],["Hóa đơn tháng này",4]]);

// [ẢNH 12] Quản lý nhà thầu  (/vendors)
A([["Tổng nhà thầu",1],["Đang hợp tác",2],["Danh sách đen",3],["HĐ hiệu lực",4]]);
```

### FILE 3 — Phân hệ Sự cố & SLA

```js
// [ẢNH 5] SLA Dashboard  (/tickets/sla-dashboard)
A([["Tỷ lệ đúng hạn",1],["MTTR trung bình",2],["Đang vi phạm",3],["Tổng sự cố",4]]);

// [ẢNH 6] Cấu hình SLA  (/settings/sla)
A([["Tổng cấu hình",1],["Đang áp dụng",2],["Chỉ giờ hành chính",3]]);
```

---

## Tự viết preset cho màn bất kỳ

Chỉ cần gọi `A([...])` với danh sách `["chữ trên nút/nhãn", số]`. Ví dụ:

```js
A([["Phân công",1],["Cập nhật trạng thái",2]]);
```

Công cụ tự tìm phần tử nhỏ nhất chứa đúng chữ đó và khoanh lại.
