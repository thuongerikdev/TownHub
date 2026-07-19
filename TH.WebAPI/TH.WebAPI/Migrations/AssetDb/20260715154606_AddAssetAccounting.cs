using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddAssetAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_asset_depreciation_log_assetId",
                schema: "asset",
                table: "asset_depreciation_log");

            migrationBuilder.AddColumn<string>(
                name: "accountCode",
                schema: "asset",
                table: "assets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "211");

            migrationBuilder.AddColumn<string>(
                name: "paymentMethod",
                schema: "asset",
                table: "assets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "documentId",
                schema: "asset",
                table: "asset_depreciation_log",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "asset_document",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    documentCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    documentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    documentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    totalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_document", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "asset_disposal",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    disposalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    originalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    accumulatedDepreciation = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bookValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    disposalValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    gainLoss = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    disposalType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    reason = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    documentId = table.Column<Guid>(type: "uuid", nullable: true),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_disposal", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_disposal_asset_document_documentId",
                        column: x => x.documentId,
                        principalSchema: "asset",
                        principalTable: "asset_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_disposal_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "asset_document_line",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    documentId = table.Column<Guid>(type: "uuid", nullable: false),
                    debitAccount = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    creditAccount = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    assetId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_document_line", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_document_line_asset_document_documentId",
                        column: x => x.documentId,
                        principalSchema: "asset",
                        principalTable: "asset_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_document_line_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_asset_depreciation_log_assetId_periodYear_periodMonth",
                schema: "asset",
                table: "asset_depreciation_log",
                columns: new[] { "assetId", "periodYear", "periodMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_depreciation_log_documentId",
                schema: "asset",
                table: "asset_depreciation_log",
                column: "documentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_disposal_assetId",
                schema: "asset",
                table: "asset_disposal",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_disposal_documentId",
                schema: "asset",
                table: "asset_disposal",
                column: "documentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_documentCode",
                schema: "asset",
                table: "asset_document",
                column: "documentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_line_assetId",
                schema: "asset",
                table: "asset_document_line",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_line_documentId",
                schema: "asset",
                table: "asset_document_line",
                column: "documentId");

            migrationBuilder.AddForeignKey(
                name: "FK_asset_depreciation_log_asset_document_documentId",
                schema: "asset",
                table: "asset_depreciation_log",
                column: "documentId",
                principalSchema: "asset",
                principalTable: "asset_document",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_asset_depreciation_log_asset_document_documentId",
                schema: "asset",
                table: "asset_depreciation_log");

            migrationBuilder.DropTable(
                name: "asset_disposal",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_document_line",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_document",
                schema: "asset");

            migrationBuilder.DropIndex(
                name: "IX_asset_depreciation_log_assetId_periodYear_periodMonth",
                schema: "asset",
                table: "asset_depreciation_log");

            migrationBuilder.DropIndex(
                name: "IX_asset_depreciation_log_documentId",
                schema: "asset",
                table: "asset_depreciation_log");

            migrationBuilder.DropColumn(
                name: "accountCode",
                schema: "asset",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "paymentMethod",
                schema: "asset",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "documentId",
                schema: "asset",
                table: "asset_depreciation_log");

            migrationBuilder.CreateIndex(
                name: "IX_asset_depreciation_log_assetId",
                schema: "asset",
                table: "asset_depreciation_log",
                column: "assetId");
        }
    }
}
