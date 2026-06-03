using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class AddIsBusinessOwnerAndProviders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBusinessOwner",
                schema: "townhub",
                table: "residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "providers",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyName = table.Column<string>(type: "text", nullable: false),
                    ContactName = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    ServiceCategories = table.Column<string>(type: "text", nullable: true),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    RegistrationStatus = table.Column<string>(type: "text", nullable: false),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ApprovedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_providers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_providers_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalSchema: "townhub",
                        principalTable: "residents",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "service_requests",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Category = table.Column<string>(type: "text", nullable: false),
                    ApartmentId = table.Column<int>(type: "integer", nullable: true),
                    RequiresMgtApproval = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ProviderId = table.Column<int>(type: "integer", nullable: true),
                    RequestedByAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    MgtApprovedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    MgtApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MgtRejectionReason = table.Column<string>(type: "text", nullable: true),
                    ProviderRejectionReason = table.Column<string>(type: "text", nullable: true),
                    ScheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_requests_apartments_ApartmentId",
                        column: x => x.ApartmentId,
                        principalSchema: "auth",
                        principalTable: "apartments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_service_requests_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "townhub",
                        principalTable: "providers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_providers_ResidentId",
                schema: "townhub",
                table: "providers",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_ApartmentId",
                schema: "townhub",
                table: "service_requests",
                column: "ApartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_ProviderId",
                schema: "townhub",
                table: "service_requests",
                column: "ProviderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "service_requests",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "providers",
                schema: "townhub");

            migrationBuilder.DropColumn(
                name: "IsBusinessOwner",
                schema: "townhub",
                table: "residents");
        }
    }
}
