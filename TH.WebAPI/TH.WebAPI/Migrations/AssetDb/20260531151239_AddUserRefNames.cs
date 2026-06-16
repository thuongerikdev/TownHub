using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddUserRefNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "reportedByName",
                schema: "asset",
                table: "tickets",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "requestedByName",
                schema: "asset",
                table: "purchase_requests",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "reportedByName",
                schema: "asset",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "requestedByName",
                schema: "asset",
                table: "purchase_requests");
        }
    }
}
