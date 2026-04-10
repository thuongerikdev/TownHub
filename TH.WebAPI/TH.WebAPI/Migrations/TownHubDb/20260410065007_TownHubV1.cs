using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TH.WebAPI.Migrations.TownHubDb
{
    /// <inheritdoc />
    public partial class TownHubV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "auth");

            migrationBuilder.EnsureSchema(
                name: "townhub");

            migrationBuilder.CreateTable(
                name: "apartments",
                schema: "auth",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Building = table.Column<string>(type: "text", nullable: false),
                    Floor = table.Column<int>(type: "integer", nullable: false),
                    UnitNumber = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    AreaM2 = table.Column<decimal>(type: "numeric(6,2)", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_apartments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActorAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    TargetType = table.Column<string>(type: "text", nullable: true),
                    TargetId = table.Column<int>(type: "integer", nullable: true),
                    OldData = table.Column<string>(type: "text", nullable: true),
                    NewData = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    UserAgent = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fee_types",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(14,0)", nullable: false),
                    IsPerM2 = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fee_types", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "files",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OriginalName = table.Column<string>(type: "text", nullable: false),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: true),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    EntityType = table.Column<string>(type: "text", nullable: true),
                    EntityId = table.Column<int>(type: "integer", nullable: true),
                    UploadedByAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_files", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "notification_templates",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Channel = table.Column<string>(type: "text", nullable: false),
                    Subject = table.Column<string>(type: "text", nullable: true),
                    Body = table.Column<string>(type: "text", nullable: false),
                    Variables = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_templates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "system_configs",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    DataType = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_configs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "incidents",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Location = table.Column<string>(type: "text", nullable: true),
                    ApartmentId = table.Column<int>(type: "integer", nullable: true),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReportedByAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    AssignedToAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolutionNote = table.Column<string>(type: "text", nullable: true),
                    Attachments = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incidents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_incidents_apartments_ApartmentId",
                        column: x => x.ApartmentId,
                        principalSchema: "auth",
                        principalTable: "apartments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "residents",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    IdCard = table.Column<string>(type: "text", nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Gender = table.Column<string>(type: "text", nullable: true),
                    ApartmentId = table.Column<int>(type: "integer", nullable: true),
                    IsOwner = table.Column<bool>(type: "boolean", nullable: false),
                    MoveInDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MoveOutDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    AuthUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_residents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_residents_apartments_ApartmentId",
                        column: x => x.ApartmentId,
                        principalSchema: "auth",
                        principalTable: "apartments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "fees",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ApartmentId = table.Column<int>(type: "integer", nullable: false),
                    FeeTypeId = table.Column<int>(type: "integer", nullable: false),
                    BillingMonth = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(14,0)", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaymentMethod = table.Column<string>(type: "text", nullable: true),
                    PaymentRef = table.Column<string>(type: "text", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fees_apartments_ApartmentId",
                        column: x => x.ApartmentId,
                        principalSchema: "auth",
                        principalTable: "apartments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fees_fee_types_FeeTypeId",
                        column: x => x.FeeTypeId,
                        principalSchema: "townhub",
                        principalTable: "fee_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Channel = table.Column<string>(type: "text", nullable: false),
                    Audience = table.Column<string>(type: "text", nullable: false),
                    TemplateId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    TotalRecipients = table.Column<int>(type: "integer", nullable: false),
                    SentCount = table.Column<int>(type: "integer", nullable: false),
                    FailedCount = table.Column<int>(type: "integer", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_notifications_notification_templates_TemplateId",
                        column: x => x.TemplateId,
                        principalSchema: "townhub",
                        principalTable: "notification_templates",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "incident_comments",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IncidentId = table.Column<int>(type: "integer", nullable: false),
                    AuthorAuthUserId = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Attachments = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_incident_comments_incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalSchema: "townhub",
                        principalTable: "incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notification_logs",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NotificationId = table.Column<int>(type: "integer", nullable: false),
                    ResidentId = table.Column<int>(type: "integer", nullable: true),
                    Channel = table.Column<string>(type: "text", nullable: false),
                    Recipient = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_notification_logs_notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalSchema: "townhub",
                        principalTable: "notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notification_logs_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalSchema: "townhub",
                        principalTable: "residents",
                        principalColumn: "Id");
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "fee_types",
                columns: new[] { "Id", "CreatedAt", "Description", "IsActive", "IsPerM2", "Name", "UnitPrice" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7482), "Phí quản lý hàng tháng", true, false, "Phí quản lý", 800000m },
                    { 2, new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7490), "Phí dịch vụ tiện ích", true, false, "Phí dịch vụ", 500000m },
                    { 3, new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7493), "Phí giữ xe hàng tháng", true, false, "Phí gửi xe", 300000m },
                    { 4, new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7494), "Phí vệ sinh chung cư", true, false, "Phí vệ sinh", 50000m }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "system_configs",
                columns: new[] { "Id", "DataType", "Description", "IsPublic", "Key", "UpdatedAt", "UpdatedByAuthUserId", "Value" },
                values: new object[,]
                {
                    { 1, "string", "Tên dự án hiển thị", true, "project_name", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7254), null, "TownHub" },
                    { 2, "string", "Mã dự án (bất biến)", false, "project_code", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7259), null, "LUX_RES_01" },
                    { 3, "string", "Email hỗ trợ BQL", true, "support_email", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7261), null, "support@TownHub.vn" },
                    { 4, "string", "Hotline liên hệ", true, "hotline", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7263), null, "1900 1234" },
                    { 5, "boolean", "Bật/tắt chế độ bảo trì", false, "maintenance_mode", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7264), null, "false" },
                    { 6, "string", "Nhà cung cấp SMS", false, "sms_gateway", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7266), null, "ESMS" },
                    { 7, "string", "Cổng thanh toán hỗ trợ", false, "payment_gateways", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7267), null, "VNPay,MoMo" },
                    { 8, "integer", "Giới hạn thông báo/ngày", false, "max_notification_daily", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7269), null, "50" },
                    { 9, "string", "Nơi lưu trữ file", false, "storage_provider", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7270), null, "AWS S3" },
                    { 10, "integer", "Timeout phiên đăng nhập (phút)", false, "session_timeout_min", new DateTime(2026, 4, 10, 6, 50, 7, 433, DateTimeKind.Utc).AddTicks(7272), null, "30" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_apartments_Building_Floor_UnitNumber",
                schema: "auth",
                table: "apartments",
                columns: new[] { "Building", "Floor", "UnitNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_apartments_Code",
                schema: "auth",
                table: "apartments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fees_ApartmentId_FeeTypeId_BillingMonth",
                schema: "townhub",
                table: "fees",
                columns: new[] { "ApartmentId", "FeeTypeId", "BillingMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fees_FeeTypeId",
                schema: "townhub",
                table: "fees",
                column: "FeeTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_files_StorageKey",
                schema: "townhub",
                table: "files",
                column: "StorageKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_incident_comments_IncidentId",
                schema: "townhub",
                table: "incident_comments",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_incidents_ApartmentId",
                schema: "townhub",
                table: "incidents",
                column: "ApartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_notification_logs_NotificationId",
                schema: "townhub",
                table: "notification_logs",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_notification_logs_ResidentId",
                schema: "townhub",
                table: "notification_logs",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_notification_templates_Name",
                schema: "townhub",
                table: "notification_templates",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_TemplateId",
                schema: "townhub",
                table: "notifications",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_residents_ApartmentId",
                schema: "townhub",
                table: "residents",
                column: "ApartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_residents_IdCard",
                schema: "townhub",
                table: "residents",
                column: "IdCard",
                unique: true,
                filter: "\"IdCard\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_system_configs_Key",
                schema: "townhub",
                table: "system_configs",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "fees",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "files",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "incident_comments",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "notification_logs",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "system_configs",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "fee_types",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "incidents",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "notifications",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "residents",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "notification_templates",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "apartments",
                schema: "auth");
        }
    }
}
