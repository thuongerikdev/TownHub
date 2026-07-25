using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddStockTake : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "stock_takes",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stkCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    warehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    period = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    countDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    performedByUserId = table.Column<int>(type: "integer", nullable: true),
                    performedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    totalItems = table.Column<int>(type: "integer", nullable: false),
                    matchedItems = table.Column<int>(type: "integer", nullable: false),
                    diffItems = table.Column<int>(type: "integer", nullable: false),
                    totalDiffValue = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_takes", x => x.id);
                    table.ForeignKey(
                        name: "FK_stock_takes_warehouses_warehouseId",
                        column: x => x.warehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_take_lines",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stockTakeId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    systemQty = table.Column<decimal>(type: "numeric(12,3)", nullable: false),
                    countedQty = table.Column<decimal>(type: "numeric(12,3)", nullable: false),
                    diff = table.Column<decimal>(type: "numeric(12,3)", nullable: false),
                    unitPrice = table.Column<decimal>(type: "numeric(14,0)", nullable: true),
                    diffValue = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_take_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_stock_take_lines_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_take_lines_stock_takes_stockTakeId",
                        column: x => x.stockTakeId,
                        principalSchema: "asset",
                        principalTable: "stock_takes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_stock_take_lines_materialId",
                schema: "asset",
                table: "stock_take_lines",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_take_lines_stockTakeId",
                schema: "asset",
                table: "stock_take_lines",
                column: "stockTakeId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_takes_stkCode",
                schema: "asset",
                table: "stock_takes",
                column: "stkCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_takes_warehouseId",
                schema: "asset",
                table: "stock_takes",
                column: "warehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "stock_take_lines",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "stock_takes",
                schema: "asset");
        }
    }
}
