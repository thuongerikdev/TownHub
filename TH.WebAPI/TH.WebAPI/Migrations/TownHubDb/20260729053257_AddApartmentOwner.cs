using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class AddApartmentOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Owner",
                schema: "auth",
                table: "apartments",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 1,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 2,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 3,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 4,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 5,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 6,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 7,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 8,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 9,
                column: "Owner",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 10,
                column: "Owner",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Owner",
                schema: "auth",
                table: "apartments");
        }
    }
}
