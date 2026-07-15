# -*- coding: utf-8 -*-
"""
BƯỚC 1 — Sinh NHIỀU FILE PDF CV THẬT (khổ A4 DỌC), render bằng Chrome (Playwright)
từ 4 template HTML/CSS mô phỏng SÁT các mẫu người dùng gửi:
  teal   -> mẫu #1 (bán hàng, sidebar teal, ảnh, kỹ năng có sao)
  navy   -> mẫu #2 (sinh viên part-time, sidebar navy, Hoạt động)
  en     -> mẫu #4 (Software Engineer, tiếng Anh, 1 cột)
  topcv  -> mẫu #5 (tư vấn/CSKH kiểu TopCV, serif, kỹ năng có mô tả)

Mỗi PDF kèm ground-truth cv_pdfs/gt/*.json để BƯỚC 2 dò nhãn trên text trích từ PDF.

Chạy: python gen_cv_pdfs.py
Cần: pip install playwright  (+ Chrome sẵn có; hoặc trên Colab: playwright install chromium)
"""
import os, json, random
from playwright.sync_api import sync_playwright

random.seed(42)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(OUT_DIR, "cv_pdfs")
GT_DIR  = os.path.join(PDF_DIR, "gt")
os.makedirs(GT_DIR, exist_ok=True)
N_CV = 300
WEIGHTS = [("teal",34),("topcv",30),("navy",22),("en",14)]  # tỉ lệ mỗi template

# ---------------------------------- ẢNH AVATAR -----------------------------
AV_SQ=("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='230'>"
 "<rect width='200' height='230' fill='%232f5058'/><circle cx='100' cy='85' r='48' fill='%23c9d6d9'/>"
 "<path d='M40 210 Q100 130 160 210 Z' fill='%23c9d6d9'/></svg>")
AV_CI=("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'>"
 "<circle cx='75' cy='75' r='75' fill='%23dfe4ee'/><circle cx='75' cy='60' r='30' fill='%239aa6c0'/>"
 "<path d='M25 140 Q75 90 125 140 Z' fill='%239aa6c0'/></svg>")

# ---------------------------------- KHO DỮ LIỆU ----------------------------
HO=["Nguyễn","Trần","Lê","Phạm","Hoàng","Huỳnh","Phan","Vũ","Võ","Đặng","Bùi","Đỗ","Ngô","Dương","Lý","Mai"]
TEN_NAM=["Văn An","Hoàng Nam","Minh Quân","Đức Anh","Quốc Bảo","Xuân Thưởng","Nhật Minh","Thành Đạt","Gia Huy","Tuấn Kiệt","Đăng Khoa","Trọng Nghĩa"]
TEN_NU=["Trúc Quỳnh My","Ngọc Linh","Minh Trang","Thu Hà","Phương Anh","Thảo Nguyên","Khánh Vy","Bảo Ngọc","Mai Chi","Hồng Nhung","Yến Nhi","Kim Ngân"]
CITIES=["Hà Nội","TP.HCM","Đà Nẵng","Hải Phòng","Cần Thơ","Nha Trang","Huế"]
DIST={"Hà Nội":["Cầu Giấy","Hoàng Mai","Đống Đa","Thanh Xuân","Hà Đông"],"TP.HCM":["Quận 1","Quận 3","Quận 10","Bình Thạnh","Tân Bình"],
      "Đà Nẵng":["Hải Châu","Sơn Trà","Thanh Khê"],"Hải Phòng":["Lê Chân","Ngô Quyền"],"Cần Thơ":["Ninh Kiều","Cái Răng"],
      "Nha Trang":["Lộc Thọ","Vĩnh Hải"],"Huế":["Phú Hội","Vĩnh Ninh"]}
STREET=["Nguyễn Chí Thanh","Trần Hưng Đạo","Lê Lợi","Nguyễn Trãi","Hoàng Diệu","Nguyễn Văn Cừ","Lê Duẩn"]
UNIS=["Trường Đại học Bách khoa Đà Nẵng","Trường Đại học Bách khoa Hà Nội","Trường Đại học Xây dựng Hà Nội",
      "Trường Đại học Kinh tế Quốc dân","Trường Đại học Ngoại thương","Trường Đại học Kinh tế TP.HCM",
      "Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM","Trường Đại học FPT","Trường Đại học Thương mại"]
LOAI=["Xuất sắc","Giỏi","Khá"]

SALES_TITLES=["Nhân viên bán hàng","Nhân viên kinh doanh","Chuyên viên tư vấn bán hàng","Nhân viên tư vấn"]
SALES_EXP=["Nhân viên kinh doanh","Marketing Manager","Chuyên viên bán hàng","Trưởng nhóm bán hàng"]
SALES_SKILLS=["Quản lý dự án.","Giao tiếp tốt","Nắm bắt kiến thức sản phẩm nhanh","Kỹ năng thuyết phục","Quản lý thời gian","Kỹ năng đàm phán"]
SALES_CO=["Công ty CP Thương mại ABC","Công ty TNHH Phân phối Hòa Bình","Công ty CP Bán lẻ Thế Giới Số","Công ty TNHH Thương mại Minh Phát"]
SALES_BULLET=["Phụ trách việc tìm kiếm và khai thác thị trường mới, xây dựng danh sách khách hàng tiềm năng: Tại công ty ABC, tôi đã chịu trách nhiệm tìm kiếm và khai thác các thị trường mới, từ đó tạo ra danh sách khách hàng tiềm năng.",
              "Tôi đã nghiên cứu và đánh giá các xu hướng thị trường để xác định các cơ hội kinh doanh mới. Tôi đã áp dụng các kỹ thuật tiếp thị và xây dựng mạng lưới khách hàng để tăng doanh số bán hàng."]
STU_SKILLS=["Sử dụng máy tính và các công cụ bán hàng cơ bản","Giao tiếp cơ bản, thái độ thân thiện","Khả năng học nhanh và tiếp thu công việc mới","Quản lý thời gian học tập và làm việc"]
STU_ACT=[("Hỗ trợ bán hàng","Chương trình gây quỹ của lớp",["Chuẩn bị hàng hóa, sắp xếp quầy bán và hỗ trợ tư vấn sản phẩm cho người mua.","Tham gia thu ngân, ghi nhận đơn hàng và kiểm soát số lượng bán ra."]),
         ("Phụ bán hàng","Cửa hàng gia đình",["Hỗ trợ tiếp đón khách, giới thiệu sản phẩm và giải đáp các câu hỏi cơ bản.","Rèn luyện kỹ năng giao tiếp, thái độ phục vụ và xử lý tình huống với khách hàng."]),
         ("Cộng tác viên truyền thông","Câu lạc bộ Sự kiện của trường",["Tham gia tổ chức sự kiện và truyền thông trên fanpage của câu lạc bộ.","Phối hợp cùng các thành viên để hoàn thành công việc được giao."])]
IT_TITLES_EN=["Senior Software Engineer","Software Engineer","Back-end Developer","Full-stack Developer"]
IT_EXP_EN=["Senior Software Engineer","Back-end Developer","Software Engineer","QA Engineer"]
IT_SKILLS=["Java","Python","JavaScript","ReactJS","Spring Boot","SQL","Git","Docker","C#",".NET Core","NodeJS","PostgreSQL","MongoDb","AngularJS","Selenium"]
IT_CO=["TopDev","Applancer Joint Stock Company","FPT Software","VNG Corporation","Viettel Solutions"]
IT_DEG_EN=["Information Technology","Computer Science","Software Engineering","Information Systems"]
EN_BULLET=["Choose technologies and build backend project structure with Spring, Mongodb, Restful web service.",
           "Research and apply automation test tools; write automation test scripts for the test management system.",
           "Developing back-end (NodeJS or PHP) and working directly with Product Owner and UI/UX Designer.",
           "Participate in the complete software development cycle: requirement analysis, coding, testing, deployment."]
CSKH_TITLES=["Nhân viên tư vấn","Tổng đài viên Chăm sóc khách hàng","Chuyên viên tư vấn"]
CSKH_EXP=["Tổng Đài Viên Chăm Sóc Khách Hàng","Chuyên Viên Tư Vấn Giải Pháp Phần Mềm","Nhân Viên Chăm Sóc Khách Hàng"]
CSKH_CO=["SVT Finance Innovation Co.","SVT Investment & Development Co., Ltd","Công ty CP Giáo dục Everest","Ngân hàng TMCP Kỹ Thương"]
CSKH_BULLET=["Tiếp nhận và giải đáp thắc mắc của khách hàng liên quan đến sản phẩm, dịch vụ qua điện thoại, Zalo và email.",
             "Theo dõi mức độ hài lòng của khách hàng, ghi nhận các phản hồi và đề xuất cải thiện trải nghiệm dịch vụ.",
             "Cập nhật và quản lý thông tin khách hàng trên hệ thống CRM, đảm bảo dữ liệu đầy đủ, chính xác và dễ truy xuất.",
             "Phân tích nhu cầu và quy trình quản lý nhân sự của khách hàng, đề xuất giải pháp phần mềm phù hợp.",
             "Tư vấn giải pháp và trình bày demo sản phẩm cho khách hàng doanh nghiệp."]
CSKH_SKILLS=[("Kỹ năng giao tiếp","Thành thạo trong việc lắng nghe, truyền đạt thông tin rõ ràng và thuyết phục"),
             ("Phân tích và giải quyết vấn đề","Có khả năng phân tích nhu cầu khách hàng, đánh giá tình huống và đề xuất các giải pháp"),
             ("Thuyết phục và đàm phán","Thành thạo trong việc thuyết phục khách hàng và đàm phán để đạt được thỏa thuận đôi bên cùng có lợi"),
             ("Sử dụng CRM","Sử dụng thành thạo hệ thống CRM để quản lý và tra cứu thông tin khách hàng")]

def nm(): return f"{random.choice(HO)} {random.choice(TEN_NAM if random.random()<.5 else TEN_NU)}"
def phone(): return "0"+"".join(str(random.randint(0,9)) for _ in range(9))
def email(n):
    tbl=str.maketrans("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ",
                      "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd")
    return "".join(w.translate(tbl) for w in n.lower().split())+random.choice(["",str(random.randint(1,99))])+"@"+random.choice(["gmail.com","gmail.com","outlook.com"])
def city2(): c=random.choice(CITIES); return random.choice(DIST[c]), c
def dr():
    y1=random.randint(2016,2022); y2=y1+random.choice([1,1,2]); return "%02d/%d - %02d/%d"%(random.randint(1,12),y1,random.randint(1,12),y2)
def dedup(x): return list(dict.fromkeys(x))

# --------------------------------- TEMPLATE HTML ---------------------------
def teal_html(d):
    sk="".join(f"<div class='sk'>{s}</div>" for s in d["skills"])
    st="".join(f"<div class='skstar'><span class='dot'></span>{s}<span class='star'>{r} ★</span></div>" for s,r in d["skills_star"])
    ex=""
    for e in d["experiences"]:
        bl="".join(f"<li>{b}</li>" for b in e["bullets"])
        ex+=f"<div class='exp'><div class='exprow'><span class='co'>{e['company']}</span><span class='dt'>{e['dates']}</span></div><div class='role'>{e['title']}</div><ul>{bl}</ul></div>"
    return f"""<!doctype html><html><head><meta charset='utf-8'>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Roboto:ital,wght@0,300;0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>@page{{size:A4;margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Roboto',sans-serif;color:#2b2b2b;font-size:11.5px;line-height:1.5;width:794px}}
.wrap{{display:flex;min-height:1123px}}
.side{{width:34%;background:#41707a;color:#12333a;padding:0 22px 30px}}
.photo{{width:170px;height:190px;margin:26px auto 20px;display:block;border:2px solid rgba(255,255,255,.3)}}
.side h2{{font-family:'Oswald';font-weight:600;font-size:20px;color:#123;margin:18px 0 8px}}
.lbl{{font-weight:700;margin-top:9px;color:#0f2c31}}.val{{color:#20474e}}
.sk{{margin-top:5px;color:#173e44}}
.skstar{{display:flex;align-items:center;color:#173e44;margin-top:6px;font-size:11px}}
.skstar .dot{{width:5px;height:5px;border-radius:50%;background:#123;display:inline-block;margin-right:7px}}
.skstar .star{{margin-left:auto;color:#0f2c31;font-size:10px;opacity:.75}}
.main{{width:66%;padding:40px 40px 30px}}
.name{{font-family:'Oswald';font-weight:700;font-size:40px;line-height:1.02;color:#2f5b63;letter-spacing:1px;text-transform:uppercase}}
.subt{{letter-spacing:5px;color:#7d7d7d;font-size:12px;margin:8px 0 26px;text-transform:uppercase}}
.h{{font-family:'Oswald';font-weight:600;font-size:19px;margin:0 0 8px}}
.bar{{background:#9db9bd;color:#173e44;font-family:'Oswald';font-weight:600;font-size:17px;padding:7px 14px;margin:24px 0 14px}}
.obj{{color:#555;margin-bottom:6px}}
.exprow{{display:flex;justify-content:space-between;align-items:baseline}}.co{{font-weight:700}}.dt{{color:#888;font-size:11px}}
.role{{font-style:italic;color:#666;margin:1px 0 5px}}.exp ul{{margin:0 0 14px 16px}}.exp li{{margin-bottom:6px;color:#555}}
</style></head><body><div class='wrap'>
<div class='side'><img class='photo' src="{AV_SQ}"/>
<h2>Liên lạc</h2>
<div class='lbl'>Điện thoại</div><div class='val'>{d['phone']}</div>
<div class='lbl'>Email</div><div class='val'>{d['email']}</div>
<div class='lbl'>Ngày sinh</div><div class='val'>{d['dob']}</div>
<div class='lbl'>Địa chỉ</div><div class='val'>{d['address']}</div>
<h2>Kỹ năng</h2>{sk}<h2>Kỹ năng</h2>{st}</div>
<div class='main'><div class='name'>{d['name']}</div><div class='subt'>{d['title']}</div>
<div class='h'>Mục tiêu nghề nghiệp</div><div class='obj'>{d['objective']}</div>
<div class='bar'>Kinh nghiệm làm việc</div>{ex}</div></div></body></html>"""

def navy_html(d):
    sk="".join(f"<li>{s}</li>" for s in d["skills"])
    ac=""
    for a in d["activities"]:
        bl="".join(f"<li>{b}</li>" for b in a["bullets"])
        ac+=f"<div class='act'><div class='yr'>{a['year']}</div><div class='ab'><div class='ar'>{a['role']}</div><div class='ao'>{a['org']}</div><ul>{bl}</ul></div></div>"
    return f"""<!doctype html><html><head><meta charset='utf-8'>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<style>@page{{size:A4;margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Roboto',sans-serif;font-size:11px;color:#333;line-height:1.5;width:794px}}
.wrap{{display:flex;min-height:1123px}}
.side{{width:33%;background:#1f3a6e;color:#eef2fa;padding:0 20px 30px}}
.photo{{width:120px;height:120px;border-radius:50%;display:block;margin:28px auto 18px;border:3px solid #fff}}
.sh{{background:#3a5aa0;font-family:'Montserrat';font-weight:700;font-size:13px;padding:5px 12px;margin:18px -20px 10px;color:#fff}}
.lbl{{font-weight:700;margin-top:8px;color:#fff}}.val{{color:#c9d4ea;font-size:10.5px}}
.side ul{{margin-left:16px}}.side li{{margin-top:5px;color:#dfe6f5}}
.edu b{{color:#fff}}.edu div{{color:#c9d4ea}}
.main{{width:67%;padding:38px 40px}}
.name{{font-family:'Montserrat';font-weight:800;font-size:33px;line-height:1.03;color:#1f3a6e;text-transform:uppercase}}
.subt{{color:#666;font-size:13px;margin:6px 0 24px}}
.h{{font-family:'Montserrat';font-weight:700;color:#1f3a6e;font-size:17px;margin-bottom:8px}}
.obj{{color:#555;margin-bottom:26px}}
.act{{display:flex;margin-bottom:16px}}.yr{{width:64px;color:#1f3a6e;font-weight:700;font-size:11px;flex-shrink:0}}
.ar{{font-weight:700}}.ao{{font-style:italic;color:#777;font-size:10.5px}}
.ab ul{{margin:5px 0 0 16px}}.ab li{{margin-bottom:4px;color:#555}}
</style></head><body><div class='wrap'>
<div class='side'><img class='photo' src="{AV_CI}"/>
<div class='sh'>Contact</div>
<div class='lbl'>Số điện thoại</div><div class='val'>{d['phone']}</div>
<div class='lbl'>Email</div><div class='val'>{d['email']}</div>
<div class='lbl'>Địa chỉ</div><div class='val'>{d['location']}</div>
<div class='sh'>Học vấn</div><div class='edu'><b>{d['college']}</b><div>Ngành: {d['degree']}</div><div>{d['edu']}</div></div>
<div class='sh'>Kỹ năng</div><ul>{sk}</ul>
<div class='sh'>Ngôn ngữ</div><div class='val'>Tiếng Anh</div></div>
<div class='main'><div class='name'>{d['name']}</div><div class='subt'>{d['title']}</div>
<div class='h'>Mục tiêu học tập – nghề nghiệp</div><div class='obj'>{d['objective']}</div>
<div class='h'>Hoạt động - Kinh nghiệm liên quan</div>{ac}</div></div></body></html>"""

def en_html(d):
    ex=""
    for e in d["experiences"]:
        bl="".join(f"<li>{b}</li>" for b in e["bullets"])
        ex+=f"<div class='exprow'><b>{e['company']}</b><span class='dt'>{e['dates']}</span></div><div class='role'>{e['title']}</div><div class='rsp'>Responsibilities:</div><ul>{bl}</ul><div class='tech'>Technologies: {', '.join(e['tech'])}</div>"
    return f"""<!doctype html><html><head><meta charset='utf-8'>
<style>@page{{size:A4;margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;line-height:1.45;padding:42px 54px;width:794px}}
.name{{text-align:center;font-weight:700;font-size:22px;letter-spacing:1px}}
.subt{{text-align:center;font-weight:700;font-size:12px;margin-top:2px}}
.contact{{text-align:center;font-size:10px;color:#333;margin:8px 0 4px}}
.contact2{{text-align:center;font-size:10px;color:#333;margin-bottom:16px}}
.h{{font-weight:700;font-size:13px;border-bottom:1.5px solid #111;padding-bottom:3px;margin:16px 0 8px}}
.exprow{{display:flex;justify-content:space-between;margin-top:10px}}.dt{{font-weight:700}}
.role{{font-weight:700;font-style:italic;margin:1px 0}}.rsp{{margin-top:4px}}
ul{{margin:3px 0 3px 20px}}li{{margin-bottom:2px}}.tech{{margin:4px 0 2px}}
</style></head><body>
<div class='name'>{d['name']}</div><div class='subt'>{d['title']}</div>
<div class='contact'>{d['phone']} - {d['email']} - {d['location']}</div>
<div class='contact2'>{d['dob']} - github.com/{d['slug']} - linkedin.com/in/{d['slug']}</div>
<div class='h'>SUMMARY</div><div>{d['summary']}</div>
<div class='h'>WORK EXPERIENCE</div>{ex}
<div class='h'>EDUCATION</div>
<div class='exprow'><b>{d['college']}</b><span class='dt'>{d['grad']}</span></div><div class='role'>{d['degree']}</div>
</body></html>"""

def topcv_html(d):
    ex=""
    for e in d["experiences"]:
        bl="".join(f"<li>{b}</li>" for b in e["bullets"])
        ex+=f"<div class='exprow'><b>{e['company']}</b><span class='dt'>{e['dates']}</span></div><div class='role'>{e['title']}</div><ul>{bl}</ul>"
    sk="".join(f"<div class='skrow'><div class='skn'>{n}</div><div class='skd'>{v}</div></div>" for n,v in d["skills"])
    return f"""<!doctype html><html><head><meta charset='utf-8'>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>@page{{size:A4;margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'PT Serif',serif;font-size:11.5px;color:#1a1a1a;line-height:1.5;padding:34px 48px;width:794px}}
.name{{font-family:'Roboto Slab';text-align:center;font-weight:700;font-size:26px}}
.subt{{text-align:center;font-style:italic;font-size:13px;margin-top:2px}}
.contact{{text-align:center;font-size:11px;margin:12px 0 6px;color:#222}}
.h{{font-family:'Roboto Slab';font-weight:700;font-size:15px;border-bottom:1px solid #111;padding-bottom:3px;margin:20px 0 9px}}
.exprow{{display:flex;justify-content:space-between;margin-top:9px}}.dt{{color:#333}}
.role{{font-weight:700;margin:2px 0 3px}}ul{{margin:0 0 4px 18px}}li{{margin-bottom:4px;color:#222}}
.edurow{{display:flex;justify-content:space-between}}.edudeg{{font-weight:700;margin-top:3px}}
.skrow{{display:flex;border-bottom:1px solid #eee;padding:6px 0}}.skn{{width:34%;font-weight:700}}.skd{{width:66%;color:#333}}
</style></head><body>
<div class='name'>{d['name']}</div><div class='subt'>{d['title']}</div>
<div class='contact'>&#9742; {d['phone']} &nbsp;&nbsp; &#9993; {d['email']} &nbsp;&nbsp; &#128279; be.net/tencuaban &nbsp;&nbsp; &#128205; {d['location']}</div>
<div class='h'>MỤC TIÊU NGHỀ NGHIỆP</div><div>{d['objective']}</div>
<div class='h'>HỌC VẤN</div><div class='edurow'><b>{d['college']}</b><span class='dt'>{d['edu']}</span></div>
<div class='edudeg'>{d['degree']}</div><div>Tốt nghiệp loại {d['loai']}</div>
<div class='h'>KINH NGHIỆM LÀM VIỆC</div>{ex}
<div class='h'>KỸ NĂNG</div>{sk}
<div class='h'>HOẠT ĐỘNG</div><div class='exprow'><b>{d['activity']}</b><span class='dt'>{d['act_dates']}</span></div>
</body></html>"""

# ------------------------------ SINH DỮ LIỆU + GT --------------------------
def build_teal():
    n=nm(); t=random.choice(SALES_TITLES); dist,city=city2()
    loc=f"{dist}, {city}"; addr=f"{random.choice(STREET)}, Phường {random.randint(1,15)}, {loc}"
    sks=random.sample(SALES_SKILLS,random.randint(5,6))
    star=[("Microsoft Word",random.choice(["4","4.5","5"])),("Microsoft Excel",random.choice(["4","4.5","5"]))]
    exps=[{"company":c,"title":random.choice(SALES_EXP),"dates":dr(),"bullets":SALES_BULLET} for c in random.sample(SALES_CO,random.choice([1,2]))]
    obj=(f"Tôi là một {t.lower()} chuyên nghiệp, đam mê trong việc xây dựng mối quan hệ với khách hàng và đạt "
         f"được mục tiêu doanh số. Mục tiêu của tôi là phát triển sự nghiệp trong lĩnh vực bán hàng, áp dụng kỹ "
         f"năng giao tiếp mạnh mẽ và khả năng thuyết phục để tạo ra giá trị cho khách hàng và đóng góp vào sự "
         f"thành công của tổ chức.")
    d={"name":n,"title":t,"phone":phone(),"email":email(n),"dob":"%02d/%02d/%d"%(random.randint(1,28),random.randint(1,12),random.randint(1996,2002)),
       "address":addr,"skills":sks,"skills_star":star,"objective":obj,"experiences":exps}
    gt={"Name":[n],"Designation":dedup([t]+[e["title"] for e in exps]),"Email Address":[d["email"]],
        "Location":[loc],"Skills":dedup([s.rstrip(".") for s in sks]+[s for s,_ in star]),
        "Companies worked at":dedup([e["company"] for e in exps])}
    return "teal",d,gt

def build_navy():
    n=nm(); t=random.choice(SALES_TITLES)+random.choice([""," part-time"]); dist,city=city2()
    loc=f"{dist}, {city}"; s1=random.randint(2021,2023); grad=str(s1+4)
    col=random.choice(UNIS); deg=random.choice(["Công nghệ thông tin","Quản trị kinh doanh","Marketing","Kinh tế"])
    sks=random.sample(STU_SKILLS,min(4,len(STU_SKILLS)))
    acts=random.sample(STU_ACT,2)
    years=["2025","2019 - Nay","2022","2021 - 2023"]
    activities=[{"year":years[i],"role":a[0],"org":a[1],"bullets":a[2]} for i,a in enumerate(acts)]
    obj=(f"Sinh viên năm cuối mong muốn ứng tuyển vị trí {t} để rèn luyện kỹ năng giao tiếp với khách hàng, "
         f"tác phong làm việc chuyên nghiệp và khả năng quản lý thời gian, đồng thời lấy kinh nghiệm thực tế "
         f"trong môi trường dịch vụ.")
    d={"name":n,"title":t,"phone":phone(),"email":email(n),"location":loc,"college":col,"degree":deg,
       "edu":f"{s1} – {grad}","skills":sks,"objective":obj,"activities":activities}
    gt={"Name":[n],"Designation":dedup([t]+[a["role"] for a in activities]),"Email Address":[d["email"]],
        "Location":[loc],"College Name":[col],"Degree":[deg],"Graduation Year":[grad],"Skills":dedup(sks)}
    return "navy",d,gt

def build_en():
    n=nm(); t=random.choice(IT_TITLES_EN); dist,city=city2(); loc=f"{dist}, {city}"
    ny=random.randint(3,8); grad=str(random.randint(2013,2020))
    col=random.choice(UNIS); deg=random.choice(IT_DEG_EN)
    exps=[]
    for c in random.sample(IT_CO,2):
        exps.append({"company":c,"title":random.choice(IT_EXP_EN),"dates":dr().replace(" - ","-"),
                     "tech":random.sample(IT_SKILLS,random.randint(3,5)),"bullets":random.sample(EN_BULLET,2)})
    summ=(f"I have {ny} years of work experience in Software Development. I have experience and strong at "
          f"Software and Web Application using Java. I am able to apply automation test frameworks using Java.")
    em=email(n)
    d={"name":n,"title":t,"phone":phone(),"email":em,"location":loc,"slug":em.split("@")[0],
       "dob":"%02d/%02d/%d"%(random.randint(1,28),random.randint(1,12),random.randint(1988,1998)),
       "summary":summ,"experiences":exps,"college":col,"degree":deg,"grad":grad}
    tech=dedup(sum([e["tech"] for e in exps],[]))
    gt={"Name":[n],"Designation":dedup([t]+[e["title"] for e in exps]),"Email Address":[d["email"]],
        "Location":[loc],"College Name":[col],"Degree":[deg],"Graduation Year":[grad],
        "Companies worked at":dedup([e["company"] for e in exps]),"Skills":tech,"Years of Experience":[f"{ny} years"]}
    return "en",d,gt

def build_topcv():
    n=nm(); t=random.choice(CSKH_TITLES); dist,city=city2(); loc=f"{dist}, {city}"
    s1=random.randint(2014,2019); grad=str(s1+4); col=random.choice(UNIS+["ĐH TopCV"])
    deg=random.choice(["Quản trị kinh doanh","Ngôn ngữ Anh","Kinh tế","Quản trị dịch vụ"])
    yoe=random.choice(["2 năm kinh nghiệm","3 năm kinh nghiệm","hơn 3 năm kinh nghiệm","4 năm kinh nghiệm"])
    exps=[]
    cos=random.sample(CSKH_CO,2)
    for i,c in enumerate(cos):
        exps.append({"company":c,"title":random.choice(CSKH_EXP),
                     "dates":(dr().split(" - ")[0]+" - Nay") if i==0 else dr(),
                     "bullets":random.sample(CSKH_BULLET,random.randint(2,3))})
    sks=random.sample(CSKH_SKILLS,3)
    obj=(f"Tôi mong muốn ứng tuyển vào vị trí {t} để tận dụng {yoe} xử lý yêu cầu và phản hồi khách hàng "
         f"chuyên nghiệp, cùng với khả năng giao tiếp tiếng Anh tốt và tinh thần làm việc năng động, linh hoạt. "
         f"Mục tiêu của tôi là không ngừng nâng cao trải nghiệm khách hàng, góp phần xây dựng hình ảnh chuyên "
         f"nghiệp và thân thiện cho doanh nghiệp.")
    d={"name":n,"title":t,"phone":phone(),"email":email(n),"location":loc,"college":col,"degree":deg,
       "edu":f"{s1} - {grad}","loai":random.choice(LOAI),"objective":obj,"experiences":exps,"skills":sks,
       "activity":"Câu lạc bộ Sự kiện, trường "+random.choice(UNIS),"act_dates":dr()}
    gt={"Name":[n],"Designation":dedup([t]+[e["title"] for e in exps]),"Email Address":[d["email"]],
        "Location":[loc],"College Name":[col],"Degree":[deg],"Graduation Year":[grad],
        "Companies worked at":dedup([e["company"] for e in exps]),
        "Skills":dedup([s for s,_ in sks]),"Years of Experience":[yoe]}
    return "topcv",d,gt

BUILDERS={"teal":build_teal,"navy":build_navy,"en":build_en,"topcv":build_topcv}
RENDER={"teal":teal_html,"navy":navy_html,"en":en_html,"topcv":topcv_html}
POOL=[k for k,w in WEIGHTS for _ in range(w)]

# --------------------------------- MAIN ------------------------------------
def main():
    from collections import Counter
    cnt=Counter()
    with sync_playwright() as p:
        try: browser=p.chromium.launch(channel="chrome")
        except Exception: browser=p.chromium.launch()
        page=browser.new_page(viewport={"width":794,"height":1123})
        for i in range(1,N_CV+1):
            layout=random.choice(POOL); cnt[layout]+=1
            _,d,gt=BUILDERS[layout]()
            page.set_content(RENDER[layout](d), wait_until="networkidle")
            stem=f"cv_{i:04d}"
            page.pdf(path=os.path.join(PDF_DIR,stem+".pdf"), format="A4", print_background=True)
            json.dump(gt, open(os.path.join(GT_DIR,stem+".json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)
        browser.close()
    print(f"Đã sinh {N_CV} PDF (A4 dọc) vào {PDF_DIR}")
    print("Theo template:", dict(cnt))

if __name__=="__main__":
    main()
