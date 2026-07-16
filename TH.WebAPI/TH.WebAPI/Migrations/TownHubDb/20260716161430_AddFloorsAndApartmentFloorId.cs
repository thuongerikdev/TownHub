using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class AddFloorsAndApartmentFloorId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FloorId",
                schema: "auth",
                table: "apartments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "floors",
                schema: "base",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    floorNumber = table.Column<int>(type: "integer", nullable: false),
                    floorName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    floorType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_floors", x => x.id);
                });

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 1,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 2,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 3,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 4,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 5,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 6,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 7,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 8,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 9,
                column: "FloorId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 10,
                column: "FloorId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_floors_buildingId_floorNumber",
                schema: "base",
                table: "floors",
                columns: new[] { "buildingId", "floorNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "floors",
                schema: "base");

            migrationBuilder.DropColumn(
                name: "FloorId",
                schema: "auth",
                table: "apartments");
        }
    }
}
