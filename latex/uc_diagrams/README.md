# Biểu đồ use case phân rã (draw.io)

Sinh 10 biểu đồ use case con (Base + 3 nhóm Tài sản) bằng generator, xuất PDF vào ../images/.

## Tái lập
```
python diagrams_all.py                       # sinh 10 file .drawio
# xuất từng file sang PDF (draw.io desktop CLI):
"C:/Program Files/draw.io/draw.io.exe" --export --format pdf --crop \
  --output ../images/<ten>.pdf <ten>.drawio
```

## Danh sách hình
- fig_uc_base_auth  -> Hình 3.4a (Xác thực, MFA & phiên)
- fig_uc_base_rbac  -> Hình 3.4b (Người dùng & RBAC)
- fig_uc_base_ops   -> Hình 3.4c (Vận hành, danh mục & thông báo)
- fig_uc_ms_kho     -> Hình 4.1a (Kho & vật tư)
- fig_uc_ms_p2p     -> Hình 4.1b (Quy trình P2P)
- fig_uc_ms_ncc     -> Hình 4.1c (Nhà cung cấp)
- fig_uc_vd_ghitang -> Hình 4.7a (Ghi tăng, QR & điều chuyển)
- fig_uc_vd_ketoan  -> Hình 4.7b (Khấu hao, thanh lý & sổ sách)
- fig_uc_bt_suco    -> Hình 4.12a (Sự cố & SLA)
- fig_uc_bt_wo      -> Hình 4.12b (Bảo trì / Work Order)

ucgen.py = thư viện style (ellipse #dae8fc, sub-UC #eef7ee, package nét đứt,
association nét liền, include (xanh) / extend (đỏ) nét đứt, generalization mũi tên rỗng).
