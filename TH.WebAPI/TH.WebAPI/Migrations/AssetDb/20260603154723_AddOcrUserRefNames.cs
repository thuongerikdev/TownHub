using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddOcrUserRefNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "reviewedByName",
                schema: "asset",
                table: "ocr_jobs",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "submittedByName",
                schema: "asset",
                table: "ocr_jobs",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "reviewedByName",
                schema: "asset",
                table: "ocr_jobs");

            migrationBuilder.DropColumn(
                name: "submittedByName",
                schema: "asset",
                table: "ocr_jobs");
        }
    }
}
