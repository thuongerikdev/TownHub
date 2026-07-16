-- ============================================================================
-- Gán lại BuildingId cho căn hộ cũ theo danh mục Toà nhà (base.buildings).
--
-- Chạy SAU khi đã áp migration AddApartmentBuildingId (thêm cột auth.apartments."BuildingId")
-- và bảng base.buildings đã có dữ liệu (migration SyncTownHubSnapshot + toà nhà bạn thêm).
--
-- Map theo TÊN: apartments."Building" = buildings.name. Idempotent (chỉ đụng hàng chưa gán).
-- ============================================================================

-- 1) Map tự động theo tên trùng khớp.
UPDATE auth.apartments a
SET "BuildingId" = b.id
FROM base.buildings b
WHERE a."BuildingId" IS NULL
  AND a."Building" = b.name;

-- 2) Kiểm tra căn hộ chưa map được (tên không khớp toà nhà nào trong master).
--    Nếu có kết quả → cần đặt tên toà nhà ở Base cho khớp, hoặc map tay ở bước 3.
SELECT DISTINCT a."Building" AS ten_toa_nha_chua_map
FROM auth.apartments a
WHERE a."BuildingId" IS NULL;

-- 3) (TUỲ CHỌN) Map tay khi tên khác nhau — ví dụ căn hộ "Tòa A" → toà nhà mã 'MAIN':
--    UPDATE auth.apartments SET "BuildingId" =
--        (SELECT id FROM base.buildings WHERE code = 'MAIN')
--    WHERE "Building" = 'Tòa A' AND "BuildingId" IS NULL;

-- 4) (TUỲ CHỌN) Đồng bộ lại tên hiển thị theo master sau khi đã gán id:
--    UPDATE auth.apartments a SET "Building" = b.name
--    FROM base.buildings b WHERE a."BuildingId" = b.id AND a."Building" <> b.name;
