# -*- coding: utf-8 -*-
"""Sinh RIÊNG biểu đồ use case TỔNG QUÁT (Hình 3.3) -> fig_uc_overall.drawio.
KHÔNG import/khởi chạy diagrams_all để tránh ghi đè các .drawio đã chỉnh tay.
Mức trừu tượng đồng nhất: mỗi phân hệ gồm vài use case cấp module; mọi tác nhân
và mọi use case đều được nối (không có bong bóng mồ côi)."""
import os, sys, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from ucgen import Diagram, save

W = 210      # bề rộng UC Base
WP = 220     # bề rộng UC phân hệ
H = 46

def build():
    dg = Diagram("Use case tổng quát toàn hệ thống TownHub")

    # ---- Nền tảng chung (Base): băng ngang phía trên, 5 UC cùng cấp module ----
    bx = [305, 545, 785, 1025, 1265]
    by = 95
    b0 = dg.uc("Xác thực & phân quyền (RBAC)", bx[0], by, w=W, h=H)
    b1 = dg.uc("Quản lý người dùng & định danh", bx[1], by, w=W, h=H)
    b2 = dg.uc("Cấu hình & danh mục", bx[2], by, w=W, h=H)
    b3 = dg.uc("Thông báo & hộp thư", bx[3], by, w=W, h=H)
    b4 = dg.uc("Nhật ký & Dashboard (Audit/KPI)", bx[4], by, w=W, h=H)
    dg.pkg("Nền tảng chung (Base)", 285, 72, 1210, 98)

    # ---- Phân hệ Dân cư (trái - dưới) ----
    d0 = dg.uc("Quản lý cư dân & căn hộ", 320, 320, w=WP, h=H)
    d1 = dg.uc("Kiểm soát ra vào (nhận diện khuôn mặt)", 320, 402, w=WP, h=H)
    dg.pkg("Phân hệ Dân cư", 300, 298, 260, 172)

    # ---- Phân hệ Dịch vụ (giữa - dưới) ----
    s0 = dg.uc("Nhà cung cấp & niêm yết dịch vụ", 640, 320, w=WP, h=H)
    s1 = dg.uc("Xử lý yêu cầu dịch vụ", 640, 402, w=WP, h=H)
    dg.pkg("Phân hệ Dịch vụ", 620, 298, 260, 172)

    # ---- Phân hệ Tài sản (phải - dưới) ----
    t0 = dg.uc("Mua sắm & Kho (PR → PO)", 1080, 290, w=WP, h=H)
    t1 = dg.uc("Vòng đời tài sản (ghi tăng → thanh lý)", 1080, 372, w=WP, h=H)
    t2 = dg.uc("Bảo trì & Sự cố (WO / SLA)", 1080, 454, w=WP, h=H)
    dg.pkg("Phân hệ Tài sản", 1060, 270, 260, 250)

    # ---- Tác nhân ----
    qtv = dg.actor("Quản trị viên", 875, -48)        # trên - giữa (Base), nâng cao tránh đè tiêu đề
    bql = dg.actor("Ban quản lý", 120, 305)          # trái - giữa
    cd  = dg.actor("Cư dân", 120, 470)               # trái - dưới
    ke  = dg.actor("Kế toán", 1420, 300)             # phải
    kst = dg.actor("Kỹ sư trưởng", 1420, 430)        # phải
    ktv = dg.actor("Kỹ thuật viên", 1420, 560)       # phải

    # ---- Liên kết (association) — đồng nhất, đủ, không mồ côi ----
    # QTV: quản trị Base
    for uc in (b0, b1, b2, b4):
        dg.assoc(qtv, uc)
    # Ban quản lý: giám sát/duyệt xuyên phân hệ (định tuyến vòng phía trên các package)
    for uc in (b2, b3, b4):
        dg.assoc(bql, uc)
    dg.assoc(bql, d0)
    dg.assoc(bql, s0, pts=[(560, 210)])
    dg.assoc(bql, t0, pts=[(600, 200)])
    # Cư dân: đăng nhập, hộp thư, báo sự cố, yêu cầu dịch vụ, ra vào
    dg.assoc(cd, b0)
    dg.assoc(cd, b3, pts=[(250, 250)])
    dg.assoc(cd, d1)
    dg.assoc(cd, s1)
    dg.assoc(cd, t2)
    # Kế toán / Kỹ sư trưởng / Kỹ thuật viên: phân hệ Tài sản
    dg.assoc(ke, t0)
    dg.assoc(ke, t1)
    dg.assoc(kst, t0)
    dg.assoc(kst, t1)
    dg.assoc(kst, t2)
    dg.assoc(ktv, t2)
    # Kỹ sư trưởng kế thừa vai trò Kỹ thuật viên
    dg.gen(kst, ktv)
    return dg

if __name__ == "__main__":
    sp = pathlib.Path(__file__).parent
    save(build(), str(sp / "fig_uc_overall.drawio"))
    print("wrote fig_uc_overall.drawio")
