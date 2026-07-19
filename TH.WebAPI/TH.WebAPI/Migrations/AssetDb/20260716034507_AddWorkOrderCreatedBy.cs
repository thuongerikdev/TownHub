using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddWorkOrderCreatedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "createdByName",
                schema: "asset",
                table: "work_orders",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "createdByUserId",
                schema: "asset",
                table: "work_orders",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "createdByName",
                schema: "asset",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "createdByUserId",
                schema: "asset",
                table: "work_orders");
        }
    }
}
