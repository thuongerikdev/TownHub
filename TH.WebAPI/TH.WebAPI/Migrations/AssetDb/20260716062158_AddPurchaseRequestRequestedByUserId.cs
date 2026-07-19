using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddPurchaseRequestRequestedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "requestedByUserId",
                schema: "asset",
                table: "purchase_requests",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "requestedByUserId",
                schema: "asset",
                table: "purchase_requests");
        }
    }
}
