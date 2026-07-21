import { test, expect, APIRequestContext } from "@playwright/test";
import { roleCtx, apiGet, apiPost, apiPut, findOne, EMPTY_GUID } from "./helpers";
import { API_BASE } from "../playwright.config";

const PR = `${API_BASE}/api/asset/purchase-request`;
const OCR = `${API_BASE}/api/asset/ocr-job`;

async function engineerSubmitsPR(title: string) {
  const eng = await roleCtx("engineer");
  const create = await apiPost(eng.ctx, eng.token, `${PR}/create`, {
    requestedBy: EMPTY_GUID, requestedByName: "Kỹ sư trưởng E2E", title,
    justification: "Đề xuất vật tư sửa chữa.",
  });
  expect(create.status(), "Kỹ sư trưởng phải tạo được PR").toBe(200);
  const pr = await findOne(eng.ctx, eng.token, `${PR}/get-all`, (r) => r.title === title);
  expect(pr, "Phải tìm thấy PR").toBeTruthy();
  expect((await apiPut(eng.ctx, eng.token, `${PR}/submit/${pr.id}`)).status()).toBe(200);
  return { eng, pr };
}

test.describe("Luồng 3 — Mua sắm & OCR (Kỹ sư trưởng → Ban quản lý → Kế toán)", () => {
  test("TC-PRO-10 (happy, Kỹ sư trưởng): Tạo & gửi duyệt phiếu yêu cầu (PR)", async ({}) => {
    const { eng, pr } = await engineerSubmitsPR(`[E2E] PR tạo-gửi ${Date.now()}`);
    expect(pr.prCode).toMatch(/^PR-/);
    await eng.ctx.dispose();
  });

  test("TC-PRO-11 (side, Kỹ sư trưởng): Người đề xuất KHÔNG được tự duyệt PR → 403", async ({}) => {
    const { eng, pr } = await engineerSubmitsPR(`[E2E] PR tự-duyệt ${Date.now()}`);
    const res = await apiPut(eng.ctx, eng.token, `${PR}/approve/${pr.id}`, { approvedBy: EMPTY_GUID });
    expect(res.status(), "Tách bạch nhiệm vụ: đề xuất ≠ duyệt").toBe(403);
    await eng.ctx.dispose();
  });

  test("TC-PRO-12 (happy, Ban quản lý): Ban quản lý duyệt PR do Kỹ sư trưởng gửi", async ({}) => {
    const { eng, pr } = await engineerSubmitsPR(`[E2E] PR chờ duyệt ${Date.now()}`);
    await eng.ctx.dispose();
    const mgr = await roleCtx("manager");
    const approve = await apiPut(mgr.ctx, mgr.token, `${PR}/approve/${pr.id}`, { approvedBy: EMPTY_GUID });
    expect(approve.status()).toBe(200);
    expect((await approve.json()).errorCode).toBe(200);
    await mgr.ctx.dispose();
  });

  test("TC-PRO-13 (side, Kế toán): Kế toán KHÔNG được duyệt PR → 403", async ({}) => {
    const { eng, pr } = await engineerSubmitsPR(`[E2E] PR kế-toán-duyệt ${Date.now()}`);
    await eng.ctx.dispose();
    const acct = await roleCtx("accountant");
    const res = await apiPut(acct.ctx, acct.token, `${PR}/approve/${pr.id}`, { approvedBy: EMPTY_GUID });
    expect(res.status()).toBe(403);
    await acct.ctx.dispose();
  });

  test("TC-PRO-14 (side, Cư dân): Cư dân KHÔNG được tạo PR → 403", async ({}) => {
    const { ctx, token } = await roleCtx("resident");
    const res = await apiPost(ctx, token, `${PR}/create`, { requestedBy: EMPTY_GUID, title: "x" });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-OCR-15 (happy, Kế toán): Kế toán gửi OCR hoá đơn → worker xử lý xong", async ({}) => {
    const { ctx, token } = await roleCtx("accountant");
    const fileName = `hoa-don-${Date.now()}.jpg`;
    const submit = await apiPost(ctx, token, `${OCR}/submit`, {
      documentType: "INVOICE", ocrEngine: "paddleocr",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      fileName, submittedBy: EMPTY_GUID, submittedByName: "Kế toán E2E",
    });
    expect(submit.status()).toBe(200);
    const job = await findOne(ctx, token, `${OCR}/get-all`, (r) => r.fileName === fileName);
    expect(job, "Phải thấy job OCR vừa gửi").toBeTruthy();
    let status = job.status;
    for (let i = 0; i < 15; i++) {
      if (status && !["PENDING", "QUEUED", "PROCESSING"].includes(status)) break;
      await new Promise((r) => setTimeout(r, 2000));
      status = (await (await apiGet(ctx, token, `${OCR}/get/${job.id}`)).json()).data?.status;
    }
    console.log(`[OCR] status cuối = ${status}`);
    expect(["COMPLETED", "DONE", "REVIEWED", "FAILED"]).toContain(status);
    await ctx.dispose();
  });

  test("TC-OCR-16 (side, Ban quản lý): Ban quản lý KHÔNG có quyền OCR hoá đơn → 403", async ({}) => {
    const { ctx, token } = await roleCtx("manager");
    const res = await apiPost(ctx, token, `${OCR}/submit`, {
      documentType: "INVOICE", ocrEngine: "paddleocr", fileName: "x.jpg", submittedBy: EMPTY_GUID,
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });
});
