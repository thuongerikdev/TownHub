using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddInvoiceConfirmedByUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "confirmedByName",
                schema: "asset",
                table: "invoices",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "confirmedByUserId",
                schema: "asset",
                table: "invoices",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "confirmedByName",
                schema: "asset",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "confirmedByUserId",
                schema: "asset",
                table: "invoices");
        }
    }
}
