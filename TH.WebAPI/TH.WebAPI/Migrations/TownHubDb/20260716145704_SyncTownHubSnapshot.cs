using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class SyncTownHubSnapshot : Migration
    {
        // Migration này đồng bộ snapshot TownHubDb với model. Snapshot trước đó bị lệch
        // (thiếu face_profiles/access_events dù migration 20260613090000 đã tạo & đã áp vào DB).
        // Việc `migrations add` đã cập nhật ModelSnapshot = model hiện tại.
        // Ở tầng DB, phần DUY NHẤT còn thiếu là bảng danh mục Toà nhà (base.buildings) —
        // các bảng/cột khác đã có sẵn trong DB nên KHÔNG thao tác lại (tránh xung đột).
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "base");

            migrationBuilder.CreateTable(
                name: "buildings",
                schema: "base",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    totalFloors = table.Column<int>(type: "integer", nullable: false),
                    totalUnits = table.Column<int>(type: "integer", nullable: false),
                    managementCompany = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buildings", x => x.id);
                });

            // Toà nhà mặc định — khớp Guid BUILDING đang dùng xuyên hệ thống (seed Asset + FE BUILDING_ID).
            migrationBuilder.InsertData(
                schema: "base",
                table: "buildings",
                columns: new[] { "id", "code", "name", "totalFloors", "totalUnits", "managementCompany" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), "MAIN", "Toà nhà chính", 0, 0, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "buildings",
                schema: "base");
        }
    }
}
