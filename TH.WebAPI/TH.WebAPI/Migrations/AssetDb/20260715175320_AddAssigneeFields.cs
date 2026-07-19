using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AddAssigneeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "assignedToName",
                schema: "asset",
                table: "work_orders",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assignedToUserId",
                schema: "asset",
                table: "work_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "assignedAt",
                schema: "asset",
                table: "work_order_assignments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "assignedToName",
                schema: "asset",
                table: "work_order_assignments",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assignedToUserId",
                schema: "asset",
                table: "work_order_assignments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "assignedToName",
                schema: "asset",
                table: "tickets",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assignedToUserId",
                schema: "asset",
                table: "tickets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "assignedAt",
                schema: "asset",
                table: "ticket_assignments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "assignedToName",
                schema: "asset",
                table: "ticket_assignments",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assignedToUserId",
                schema: "asset",
                table: "ticket_assignments",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "assignedToName",
                schema: "asset",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "assignedToUserId",
                schema: "asset",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "assignedAt",
                schema: "asset",
                table: "work_order_assignments");

            migrationBuilder.DropColumn(
                name: "assignedToName",
                schema: "asset",
                table: "work_order_assignments");

            migrationBuilder.DropColumn(
                name: "assignedToUserId",
                schema: "asset",
                table: "work_order_assignments");

            migrationBuilder.DropColumn(
                name: "assignedToName",
                schema: "asset",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "assignedToUserId",
                schema: "asset",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "assignedAt",
                schema: "asset",
                table: "ticket_assignments");

            migrationBuilder.DropColumn(
                name: "assignedToName",
                schema: "asset",
                table: "ticket_assignments");

            migrationBuilder.DropColumn(
                name: "assignedToUserId",
                schema: "asset",
                table: "ticket_assignments");
        }
    }
}
