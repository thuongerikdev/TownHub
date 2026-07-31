# -*- coding: utf-8 -*-
import sys, os, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from ucgen import Diagram, save

UCW=220; SUBW=205; ROW=82; TOP=110; UCH=46

def wrap(dg, label, ids, padx=28, padtop=40, padbot=16, alt=False):
    xs=[dg.pos[i][0] for i in ids]; ys=[dg.pos[i][1] for i in ids]
    ws=[dg.pos[i][2] for i in ids]; hs=[dg.pos[i][3] for i in ids]
    x0=min(xs)-padx; y0=min(ys)-padtop
    x1=max(x+w for x,w in zip(xs,ws))+padx; y1=max(y+h for y,h in zip(ys,hs))+padbot
    dg.pkg(label, x0, y0, x1-x0, y1-y0, alt=alt)

def col(dg, labels, x, top=TOP, row=ROW, w=UCW, sub=False):
    ids=[]; y=top
    for lb in labels:
        ids.append(dg.uc(lb, x, y, w=w, sub=sub)); y+=row
    return ids

def amid(n, top=TOP, row=ROW):  # y giữa cột n use case (đặt actor)
    return top + (n-1)*row/2

D={}

# ------------------------------------------------ BASE A: Xác thực / MFA / phiên
def base_auth():
    dg=Diagram("Use case Base — Xác thực, MFA & phiên")
    CA=220; CS=590; LAX=40; RAX=930
    a=col(dg,["Đăng nhập (nội bộ / Google)","Làm mới token (refresh)","Đăng xuất","Thiết lập & quản lý MFA","Đổi mật khẩu","Quên & đặt lại mật khẩu","Thu hồi phiên đăng nhập"],CA)
    s=[dg.uc("Xác thực mật khẩu",CS,90,w=SUBW,sub=True),
       dg.uc("Kiểm trạng thái & email",CS,150,w=SUBW,sub=True),
       dg.uc("Xác thực MFA / TOTP",CS,210,w=SUBW,sub=True),
       dg.uc("Xoay vòng refresh token",CS,288,w=SUBW,sub=True),
       dg.uc("Sinh QR & bí mật TOTP",CS,360,w=SUBW,sub=True)]
    wrap(dg,"Xác thực & tài khoản",a)
    nd=dg.actor("Người dùng (mọi vai trò)",LAX,amid(7)); qtv=dg.actor("Quản trị viên",RAX,amid(7))
    for uc in a[:6]: dg.assoc(nd,uc)
    dg.assoc(nd,a[6]); dg.assoc(qtv,a[6])
    dg.include(a[0],s[0]); dg.include(a[0],s[1]); dg.extend(s[2],a[0])
    dg.include(a[1],s[3]); dg.include(a[3],s[4])
    return dg
D["fig_uc_base_auth"]=base_auth

# ------------------------------------------------ BASE B: RBAC & người dùng
def base_rbac():
    dg=Diagram("Use case Base — Quản lý người dùng & phân quyền RBAC")
    CA=230; CS=600; LAX=40; RAX=940
    a=col(dg,["Quản lý tài khoản người dùng","Liên kết định danh (TK ↔ cư dân ↔ căn hộ)","Quản lý vai trò","Quản lý quyền","Gán vai trò cho người dùng","Gán quyền cho vai trò","Quản lý phiên đăng nhập"],CA)
    s=[dg.uc("Thêm tài khoản",CS,TOP-18,w=SUBW,sub=True),
       dg.uc("Sửa tài khoản",CS,TOP+46,w=SUBW,sub=True),
       dg.uc("Khoá / Mở khoá tài khoản",CS,TOP+110,w=SUBW,sub=True),
       dg.uc("Đặt lại mật khẩu",CS,TOP+174,w=SUBW,sub=True)]
    wrap(dg,"Phân quyền RBAC & quản trị người dùng",a)
    qtv=dg.actor("Quản trị viên",LAX,amid(7)); bql=dg.actor("Ban quản lý",RAX,TOP+40)
    for uc in a: dg.assoc(qtv,uc)
    # Ban quản lý -> "Liên kết định danh": vòng xuống dưới cụm sub-UC để không đè lên ellipse xanh
    dg.assoc(bql,a[1],pts=[(880,360),(470,360)])
    for x in s: dg.include(a[0],x)
    return dg
D["fig_uc_base_rbac"]=base_rbac

# ------------------------------------------------ BASE C: Vận hành & thông báo
def base_ops():
    dg=Diagram("Use case Base — Vận hành, danh mục & thông báo")
    CA=230; CS=600; LAX=40; RAX=940
    a=col(dg,["Cấu hình hệ thống (tham số)","Quản lý toà nhà & tầng","Quản lý căn hộ","Danh mục dùng chung (loại phí, loại TS…)","Soạn & gửi thông báo","Xem hộp thư cá nhân","Tra cứu nhật ký hoạt động (Audit log)","Dashboard & KPI"],CA)
    s=[dg.uc("Chọn đối tượng nhận",CS,TOP+3*ROW-24,w=SUBW,sub=True),
       dg.uc("Gửi email",CS,TOP+3*ROW+40,w=SUBW,sub=True),
       dg.uc("Ghi hộp thư trong hệ thống",CS,TOP+3*ROW+104,w=SUBW,sub=True)]
    wrap(dg,"Vận hành, danh mục & thông báo",a)
    bql=dg.actor("Ban quản lý",LAX,amid(8)); qtv=dg.actor("Quản trị viên",RAX,TOP+40); cd=dg.actor("Cư dân",RAX,TOP+5*ROW)
    for uc in [a[0],a[1],a[2],a[3],a[4],a[7]]: dg.assoc(bql,uc)
    # QTV -> Audit log (UC thấp): vòng dưới cụm sub-UC; QTV -> Cấu hình (UC cao) đi thẳng phía trên
    dg.assoc(qtv,a[6],pts=[(880,540),(470,540)]); dg.assoc(qtv,a[0]); dg.assoc(cd,a[5])
    for x in s: dg.include(a[4],x)
    return dg
D["fig_uc_base_ops"]=base_ops

# ------------------------------------------------ MUA SẮM A: Kho & vật tư
def ms_kho():
    dg=Diagram("Use case Mua sắm — Kho & vật tư")
    CA=250; CS=610; LAX=40; RAX=950
    a=col(dg,["Quản lý kho","Quản lý danh mục vật tư","Ghi giao dịch kho (nhập/xuất/điều chuyển)","Kiểm kê kho","Xem cảnh báo tồn thấp"],CA)
    s=[dg.uc("Cập nhật tồn kho",CS,196,w=SUBW,sub=True),
       dg.uc("Sinh mã giao dịch (server)",CS,256,w=SUBW,sub=True),
       dg.uc("Chặn xuất vượt tồn",CS,316,w=SUBW,sub=True),
       dg.uc("Nhập số đếm thực tế",CS,378,w=SUBW,sub=True),
       dg.uc("Sinh giao dịch điều chỉnh",CS,438,w=SUBW,sub=True)]
    wrap(dg,"Kho, vật tư & tồn kho",a)
    kst=dg.actor("Kỹ sư trưởng",LAX,TOP+ROW*0.6); ktv=dg.actor("Kỹ thuật viên",LAX,TOP+ROW*3.0)
    dg.gen(kst,ktv)
    for uc in [a[0],a[1],a[3]]: dg.assoc(kst,uc)
    for uc in [a[2],a[4]]: dg.assoc(ktv,uc)
    dg.include(a[2],s[0]); dg.include(a[2],s[1]); dg.extend(s[2],a[2])
    dg.include(a[3],s[3]); dg.include(a[3],s[4])
    return dg
D["fig_uc_ms_kho"]=ms_kho

# ------------------------------------------------ MUA SẮM B: P2P
def ms_p2p():
    dg=Diagram("Use case Mua sắm — Quy trình P2P (PR→PO→hóa đơn)")
    CA=210; CB=500; CS=800; LAX=40; RAX=1120
    a=col(dg,["Lập đề nghị mua (PR)","Gửi duyệt PR","Duyệt / từ chối PR","Tạo đơn mua (PO)","Duyệt PO","Nhận hàng & nhập kho"],CA)
    b=col(dg,["Nhập hóa đơn","OCR hóa đơn","Đối chiếu hóa đơn ↔ PO","Đánh dấu thanh toán"],CB)
    s_job=dg.uc("Tạo job OCR (QUEUED)",CS,TOP+ROW-12,w=SUBW,sub=True)
    s_ext=dg.uc("Bóc tách bằng worker nền",CS,TOP+ROW+56,w=SUBW,sub=True)
    s_pay=dg.uc("Ghi ngày & mã giao dịch",CS,TOP+3*ROW,w=SUBW,sub=True)
    wrap(dg,"Đề nghị mua & Đơn mua (PR → PO)",a); wrap(dg,"Hóa đơn, OCR & thanh toán",b)
    kst=dg.actor("Kỹ sư trưởng",LAX,amid(6)); bql=dg.actor("Ban quản lý",RAX,TOP+30); kt=dg.actor("Kế toán",RAX,TOP+3*ROW)
    for uc in [a[0],a[1],a[3],a[5]]: dg.assoc(kst,uc)
    for uc in [a[2],a[4]]: dg.assoc(bql,uc)
    for uc in b: dg.assoc(kt,uc)
    dg.include(b[1],s_job); dg.include(b[1],s_ext); dg.extend(b[1],b[0]); dg.include(b[3],s_pay)
    return dg
D["fig_uc_ms_p2p"]=ms_p2p

# ------------------------------------------------ MUA SẮM C: Nhà cung cấp
def ms_ncc():
    dg=Diagram("Use case Mua sắm — Nhà cung cấp")
    CA=300; LAX=90
    a=col(dg,["Quản lý nhà cung cấp","Quản lý hợp đồng NCC","Quản lý dịch vụ theo hợp đồng","Đánh giá nhà cung cấp"],CA)
    wrap(dg,"Nhà cung cấp & hợp đồng",a)
    bql=dg.actor("Ban quản lý",LAX,amid(4))
    for uc in a: dg.assoc(bql,uc)
    return dg
D["fig_uc_ms_ncc"]=ms_ncc

# ------------------------------------------------ VÒNG ĐỜI A: Ghi tăng/QR/điều chuyển
def vd_ghitang():
    dg=Diagram("Use case Vòng đời tài sản — Ghi tăng, QR & điều chuyển")
    CA=250; CS=620; LAX=40; RAX=960
    a=col(dg,["Quản lý loại tài sản","Quản lý vị trí tài sản","Ghi tăng tài sản","Sinh & in mã QR","Điều chuyển tài sản"],CA)
    s=[dg.uc("Sinh mã tài sản (assetCode)",CS,TOP+2*ROW-32,w=SUBW,sub=True),
       dg.uc("Dựng chứng từ ghi tăng (Nợ 211 / Có 111)",CS,TOP+2*ROW+40,w=SUBW,sub=True)]
    wrap(dg,"Danh mục & ghi tăng tài sản",a)
    kst=dg.actor("Kỹ sư trưởng",LAX,amid(5)); kt=dg.actor("Kế toán",RAX,TOP+2*ROW)
    for uc in [a[0],a[1],a[3],a[4]]: dg.assoc(kst,uc)
    dg.assoc(kt,a[2])
    dg.include(a[2],s[0]); dg.include(a[2],s[1])
    return dg
D["fig_uc_vd_ghitang"]=vd_ghitang

# ------------------------------------------------ VÒNG ĐỜI B: Khấu hao/thanh lý/sổ sách
def vd_ketoan():
    dg=Diagram("Use case Vòng đời tài sản — Khấu hao, thanh lý & sổ sách")
    CA=250; CS=620; LAX=40; RAX=960
    a=col(dg,["Khấu hao định kỳ","Thanh lý tài sản","Tra cứu sổ sách & chứng từ","Báo cáo tài sản / bảng cân đối"],CA)
    s=[dg.uc("Tính mức khấu hao",CS,TOP-20,w=SUBW,sub=True),
       dg.uc("Dựng chứng từ khấu hao (Nợ 642 / Có 2141)",CS,TOP+48,w=SUBW,sub=True),
       dg.uc("Dựng chứng từ thanh lý (811)",CS,TOP+ROW+40,w=SUBW,sub=True),
       dg.uc("Tính lãi / lỗ thanh lý",CS,TOP+ROW+104,w=SUBW,sub=True)]
    wrap(dg,"Khấu hao, thanh lý & sổ sách kế toán",a)
    kt=dg.actor("Kế toán",LAX,amid(4)); bql=dg.actor("Ban quản lý",RAX,TOP+ROW)
    for uc in a: dg.assoc(kt,uc)
    # Ban quản lý: -> Khấu hao (cao) vòng phía trên; -> Báo cáo (thấp) vòng phía dưới; tránh đè cụm sub-UC
    dg.assoc(bql,a[0],pts=[(890,60),(490,60)]); dg.assoc(bql,a[3],pts=[(890,400),(490,400)])
    dg.include(a[0],s[0]); dg.include(a[0],s[1]); dg.include(a[1],s[2]); dg.include(a[1],s[3])
    return dg
D["fig_uc_vd_ketoan"]=vd_ketoan

# ------------------------------------------------ BẢO TRÌ A: Sự cố & SLA
def bt_suco():
    dg=Diagram("Use case Sự cố & SLA")
    CA=260; CS=630; LAX=40; RAX=970
    a=col(dg,["Báo sự cố","Theo dõi sự cố","Đánh giá sự cố","Tiếp nhận & phân công sự cố","Xử lý sự cố (cập nhật trạng thái)","Đóng ticket","Cấu hình SLA & leo thang","Dashboard SLA"],CA)
    s=[dg.uc("Đính ảnh minh chứng",CS,TOP-16,w=SUBW,sub=True),
       dg.uc("Cập nhật trạng thái",CS,TOP+4*ROW-40,w=SUBW,sub=True),
       dg.uc("Xuất vật tư",CS,TOP+4*ROW+24,w=SUBW,sub=True),
       dg.uc("Tạo PR từ sự cố",CS,TOP+4*ROW+88,w=SUBW,sub=True)]
    wrap(dg,"Sự cố & giám sát SLA",a)
    cd=dg.actor("Cư dân",LAX,TOP+ROW*0.4); kst=dg.actor("Kỹ sư trưởng",LAX,TOP+ROW*3.2); ktv=dg.actor("Kỹ thuật viên",LAX,TOP+ROW*5.4)
    bql=dg.actor("Ban quản lý",RAX,TOP+6*ROW)
    dg.gen(kst,ktv)
    for uc in [a[0],a[1],a[2]]: dg.assoc(cd,uc)
    dg.assoc(ktv,a[4]); dg.assoc(kst,a[3]); dg.assoc(kst,a[5])
    dg.assoc(bql,a[6]); dg.assoc(bql,a[7])
    dg.include(a[0],s[0]); dg.include(a[4],s[1]); dg.extend(s[2],a[4]); dg.extend(s[3],a[4])
    return dg
D["fig_uc_bt_suco"]=bt_suco

# ------------------------------------------------ BẢO TRÌ B: Work Order
def bt_wo():
    dg=Diagram("Use case Bảo trì phòng ngừa / Work Order")
    CA=260; CS=630; LAX=40; RAX=970
    a=col(dg,["Quản lý lịch bảo trì","Quản lý mẫu checklist","Tạo Work Order","Phân công WO cho KTV","Thực hiện Work Order","Nghiệm thu Work Order"],CA)
    s=[dg.uc("Quét QR check-in",CS,TOP+4*ROW-96,w=SUBW,sub=True),
       dg.uc("Điền checklist",CS,TOP+4*ROW-32,w=SUBW,sub=True),
       dg.uc("Đính ảnh minh chứng",CS,TOP+4*ROW+32,w=SUBW,sub=True),
       dg.uc("Xuất & ghi vật tư",CS,TOP+4*ROW+96,w=SUBW,sub=True)]
    wrap(dg,"Bảo trì phòng ngừa & Work Order",a)
    bql=dg.actor("Ban quản lý",LAX,TOP+ROW*0.4); kst=dg.actor("Kỹ sư trưởng",LAX,TOP+ROW*3.0); ktv=dg.actor("Kỹ thuật viên",RAX,TOP+4*ROW)
    for uc in [a[0],a[1]]: dg.assoc(bql,uc)
    for uc in [a[2],a[3],a[5]]: dg.assoc(kst,uc)
    dg.assoc(ktv,a[4])
    dg.include(a[4],s[0]); dg.include(a[4],s[1]); dg.include(a[4],s[2]); dg.extend(s[3],a[4])
    return dg
D["fig_uc_bt_wo"]=bt_wo

if __name__=="__main__":
    sp=pathlib.Path(__file__).parent
    for name,fn in D.items():
        save(fn(), str(sp/f"{name}.drawio"))
        print("wrote", name)
