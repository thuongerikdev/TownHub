using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using TH.TownHub.Infrastructure.Database;

#nullable disable

namespace TH.WebAPI.Migrations.TownHubDb
{
    [DbContext(typeof(TownHubDbContext))]
    [Migration("20260613090000_AddFaceProfilesAndAccessEvents")]
    public partial class AddFaceProfilesAndAccessEvents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "access_events",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    PersonType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Direction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CameraName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SnapshotUrl = table.Column<string>(type: "text", nullable: true),
                    Confidence = table.Column<double>(type: "double precision", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true),
                    HandledByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    HandledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DetectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_access_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_access_events_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalSchema: "townhub",
                        principalTable: "residents",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "face_profiles",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    AiStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    EmbeddingRef = table.Column<string>(type: "text", nullable: true),
                    FailureReason = table.Column<string>(type: "text", nullable: true),
                    RegisteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_face_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_face_profiles_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalSchema: "townhub",
                        principalTable: "residents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_access_events_PersonType_DetectedAt",
                schema: "townhub",
                table: "access_events",
                columns: new[] { "PersonType", "DetectedAt" });
            migrationBuilder.CreateIndex(
                name: "IX_access_events_ResidentId",
                schema: "townhub",
                table: "access_events",
                column: "ResidentId");
            migrationBuilder.CreateIndex(
                name: "IX_face_profiles_ResidentId",
                schema: "townhub",
                table: "face_profiles",
                column: "ResidentId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "access_events", schema: "townhub");
            migrationBuilder.DropTable(name: "face_profiles", schema: "townhub");
        }
    }
}
