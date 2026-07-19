using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class AddApartmentBuildingId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BuildingId",
                schema: "auth",
                table: "apartments",
                type: "uuid",
                nullable: true);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 1,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 2,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 3,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 4,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 5,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 6,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 7,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 8,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 9,
                column: "BuildingId",
                value: null);

            migrationBuilder.UpdateData(
                schema: "auth",
                table: "apartments",
                keyColumn: "Id",
                keyValue: 10,
                column: "BuildingId",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BuildingId",
                schema: "auth",
                table: "apartments");
        }
    }
}
