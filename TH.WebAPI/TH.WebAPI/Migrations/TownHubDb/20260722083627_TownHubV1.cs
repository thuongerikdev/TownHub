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
                name: "townhub");

            migrationBuilder.EnsureSchema(
                name: "auth");

            migrationBuilder.EnsureSchema(
                name: "base");

            migrationBuilder.CreateTable(
                name: "apartments",
                schema: "auth",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Building = table.Column<string>(type: "text", nullable: false),
                    BuildingId = table.Column<Guid>(type: "uuid", nullable: true),
                    FloorId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    TableName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RecordId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChangedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "buildings",
                schema: "base",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    totalFloors = table.Column<int>(type: "integer", nullable: false),
                    totalUnits = table.Column<int>(type: "integer", nullable: false),
                    managementCompany = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buildings", x => x.id);
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
                name: "floors",
                schema: "base",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    floorNumber = table.Column<int>(type: "integer", nullable: false),
                    floorName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    floorType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_floors", x => x.id);
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
                    Scope = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UpdatedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
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
                    UnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsOwner = table.Column<bool>(type: "boolean", nullable: false),
                    IsBusinessOwner = table.Column<bool>(type: "boolean", nullable: false),
                    MoveInDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MoveOutDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    AuthUserId = table.Column<int>(type: "integer", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    RecipientId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ReferenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Body = table.Column<string>(type: "text", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SendStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
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

            migrationBuilder.CreateTable(
                name: "provider_service_listings",
                schema: "townhub",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProviderId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ContactPhone = table.Column<string>(type: "text", nullable: true),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    ContactAddress = table.Column<string>(type: "text", nullable: true),
                    PriceList = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ApprovedByAuthUserId = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provider_service_listings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_provider_service_listings_providers_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "townhub",
                        principalTable: "providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.InsertData(
                schema: "auth",
                table: "apartments",
                columns: new[] { "Id", "AreaM2", "Building", "BuildingId", "Code", "CreatedAt", "Floor", "FloorId", "Note", "Status", "Type", "UnitNumber", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, 70.5m, "Tòa A", null, "A0101", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "occupied", "2PN", "01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, 95.0m, "Tòa A", null, "A0102", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "occupied", "3PN", "02", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, 45.0m, "Tòa A", null, "A0201", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 2, null, null, "vacant", "1PN", "01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, 35.0m, "Tòa A", null, "A0202", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 2, null, null, "maintenance", "Studio", "02", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, 110.0m, "Tòa B", null, "B0101", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "occupied", "3PN", "01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, 68.0m, "Tòa B", null, "B0102", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "occupied", "2PN", "02", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 7, 250.0m, "Villa", null, "V0001", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "occupied", "Villa", "01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 8, 300.0m, "Villa", null, "V0002", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, "vacant", "Villa", "02", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 9, 72.0m, "Tòa A", null, "A0505", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5, null, null, "occupied", "2PN", "05", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 10, 180.0m, "Tòa B", null, "B1201", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 12, null, null, "occupied", "Penthouse", "01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "audit_logs",
                columns: new[] { "Id", "Action", "ActorAuthUserId", "ChangedBy", "CreatedAt", "IpAddress", "NewData", "OldData", "RecordId", "TableName", "TargetId", "TargetType", "UserAgent" },
                values: new object[,]
                {
                    { 1L, "CREATE_NOTIFICATION", 1, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "192.168.1.10", "{\"Title\":\"Bảo trì thang máy Tòa A\"}", null, null, null, 1, "Notification", "Chrome/120.0.0" },
                    { 2L, "RESOLVE_INCIDENT", 201, null, new DateTime(2024, 1, 2, 0, 0, 0, 0, DateTimeKind.Utc), "192.168.1.15", "{\"Status\":\"resolved\"}", "{\"Status\":\"open\"}", null, null, 1, "Incident", "TownHubStaffApp/1.0" },
                    { 3L, "PAY_FEE", 101, null, new DateTime(2024, 1, 6, 0, 0, 0, 0, DateTimeKind.Utc), "113.190.23.45", "{\"Status\":\"paid\"}", "{\"Status\":\"unpaid\"}", null, null, 1, "Fee", "TownHubResidentApp/1.0" }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "fee_types",
                columns: new[] { "Id", "CreatedAt", "Description", "IsActive", "IsPerM2", "Name", "UnitPrice" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phí quản lý hàng tháng", true, false, "Phí quản lý", 800000m },
                    { 2, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phí dịch vụ tiện ích", true, false, "Phí dịch vụ", 500000m },
                    { 3, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phí giữ xe hàng tháng", true, false, "Phí gửi xe", 300000m },
                    { 4, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phí vệ sinh chung cư", true, false, "Phí vệ sinh", 50000m }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "files",
                columns: new[] { "Id", "CreatedAt", "EntityId", "EntityType", "MimeType", "OriginalName", "SizeBytes", "StorageKey", "UploadedByAuthUserId", "Url" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, "incident", "image/jpeg", "bong_den_hong.jpg", 1024500L, "incidents/2024/01/bong_den_hong_abc123.jpg", 101, "https://townhub-s3.amazonaws.com/incidents/2024/01/bong_den_hong_abc123.jpg" },
                    { 2, new DateTime(2024, 1, 3, 0, 0, 0, 0, DateTimeKind.Utc), 2, "incident", "image/png", "tran_nha_tham.png", 3500200L, "incidents/2024/01/tran_nha_tham_xyz789.png", 104, "https://townhub-s3.amazonaws.com/incidents/2024/01/tran_nha_tham_xyz789.png" },
                    { 3, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, "resident", "image/jpeg", "avatar_tuan.jpg", 500000L, "avatars/101/avatar_tuan.jpg", 101, "https://townhub-s3.amazonaws.com/avatars/101/avatar_tuan.jpg" }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "notification_templates",
                columns: new[] { "Id", "Body", "Channel", "CreatedAt", "CreatedByAuthUserId", "IsActive", "Name", "Subject", "UpdatedAt", "Variables" },
                values: new object[,]
                {
                    { 1, "Kính gửi {resident_name}, vui lòng thanh toán phí dịch vụ tháng {month} trước ngày {due_date}.", "push", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, true, "Nhắc đóng phí tháng", "Nhắc nhở thanh toán phí {month}", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "[\"resident_name\",\"month\",\"due_date\"]" },
                    { 2, "Kính gửi quý cư dân, BQL xin thông báo bảo trì thang máy tòa {building} vào lúc {time}.", "push", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, true, "Bảo trì thang máy", "Thông báo bảo trì thang máy {building}", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "[\"building\",\"time\"]" }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "system_configs",
                columns: new[] { "Id", "DataType", "Description", "IsPublic", "Key", "Scope", "UpdatedAt", "UpdatedBy", "UpdatedByAuthUserId", "Value" },
                values: new object[,]
                {
                    { 1, "string", "Tên dự án hiển thị", true, "project_name", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "TownHub" },
                    { 2, "string", "Mã dự án (bất biến)", false, "project_code", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "LUX_RES_01" },
                    { 3, "string", "Email hỗ trợ BQL", true, "support_email", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "support@TownHub.vn" },
                    { 4, "string", "Hotline liên hệ", true, "hotline", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "1900 1234" },
                    { 5, "boolean", "Bật/tắt chế độ bảo trì", false, "maintenance_mode", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "false" }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "fees",
                columns: new[] { "Id", "Amount", "ApartmentId", "BillingMonth", "CreatedAt", "CreatedByAuthUserId", "DueDate", "FeeTypeId", "Note", "PaidAt", "PaymentMethod", "PaymentRef", "Status", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, 800000m, 1, "2024-01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Thanh toán đúng hạn", new DateTime(2024, 1, 6, 0, 0, 0, 0, DateTimeKind.Utc), "VNPay", "VNP123456", "paid", new DateTime(2024, 1, 6, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, 300000m, 1, "2024-01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), 3, null, new DateTime(2024, 1, 6, 0, 0, 0, 0, DateTimeKind.Utc), "VNPay", "VNP123457", "paid", new DateTime(2024, 1, 6, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, 1200000m, 5, "2024-01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, null, null, null, "unpaid", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, 500000m, 5, "2024-01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), 2, null, null, null, null, "unpaid", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, 5000000m, 7, "2024-01", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), 1, null, new DateTime(2024, 1, 3, 0, 0, 0, 0, DateTimeKind.Utc), "Bank Transfer", "VCB999888", "paid", new DateTime(2024, 1, 3, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "incidents",
                columns: new[] { "Id", "ApartmentId", "AssignedToAuthUserId", "Attachments", "Category", "CreatedAt", "Description", "Location", "Priority", "ReportedByAuthUserId", "ResolutionNote", "ResolvedAt", "Status", "Title", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, 1, 201, null, "electrical", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Bóng đèn trước cửa căn A0101 bị cháy.", "Hành lang Tòa A Tầng 1", "low", 101, "Đã thay bóng mới.", new DateTime(2024, 1, 2, 0, 0, 0, 0, DateTimeKind.Utc), "resolved", "Bóng đèn hành lang tầng 1 hỏng", new DateTime(2024, 1, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, 5, 202, null, "plumbing", new DateTime(2024, 1, 3, 0, 0, 0, 0, DateTimeKind.Utc), "Trần nhà vệ sinh master bị thấm nước từ tầng trên.", "WC Master", "high", 104, null, null, "in_progress", "Thấm nước trần nhà vệ sinh", new DateTime(2024, 1, 3, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, 2, null, null, "security", new DateTime(2024, 1, 4, 0, 0, 0, 0, DateTimeKind.Utc), "Tôi làm rơi thẻ từ, cần cấp lại thẻ mới.", "Lễ tân", "medium", 103, null, null, "open", "Mất thẻ từ thang máy", new DateTime(2024, 1, 4, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "notifications",
                columns: new[] { "Id", "Audience", "Body", "Channel", "Content", "CreatedAt", "CreatedByAuthUserId", "FailedCount", "IsRead", "ReadAt", "RecipientId", "ReferenceId", "ReferenceType", "ScheduledAt", "SendStatus", "SentAt", "SentCount", "Status", "TemplateId", "Title", "TotalRecipients", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "building_a", null, "push", "Bảo trì thang số 1 từ 22h-24h ngày 15/05.", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, 0, false, null, null, null, null, null, "PENDING", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 50, "sent", 2, "Bảo trì thang máy Tòa A", 50, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "all", null, "push", "Vui lòng thanh toán phí quản lý tháng 5.", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, 0, false, null, null, null, null, new DateTime(2024, 1, 16, 0, 0, 0, 0, DateTimeKind.Utc), "PENDING", null, 0, "scheduled", 1, "Nhắc nợ phí tháng 5", 200, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "residents",
                columns: new[] { "Id", "ApartmentId", "AuthUserId", "AvatarUrl", "CreatedAt", "DateOfBirth", "Email", "FullName", "Gender", "IdCard", "IsBusinessOwner", "IsOwner", "MoveInDate", "MoveOutDate", "Phone", "UnitId", "UpdatedAt", "UserId" },
                values: new object[,]
                {
                    { 1, 1, 101, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1990, 5, 10, 0, 0, 0, 0, DateTimeKind.Utc), "tuan.nv@gmail.com", "Nguyễn Văn Tuấn", "male", "001090123456", false, true, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0901111222", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 2, 1, 102, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1992, 8, 15, 0, 0, 0, 0, DateTimeKind.Utc), "mai.tt@gmail.com", "Trần Thị Mai", "female", "001092654321", false, false, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0902222333", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 3, 2, 103, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1985, 2, 20, 0, 0, 0, 0, DateTimeKind.Utc), "bach.lh@gmail.com", "Lê Hoàng Bách", "male", "001085112233", false, true, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0903333444", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 4, 5, 104, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1980, 11, 5, 0, 0, 0, 0, DateTimeKind.Utc), "hung.pq@gmail.com", "Phạm Quang Hưng", "male", "001080998877", false, true, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0904444555", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 5, 6, 105, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1995, 1, 25, 0, 0, 0, 0, DateTimeKind.Utc), "thao.dt@gmail.com", "Đặng Thu Thảo", "female", "001095334455", false, true, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0905555666", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 6, 7, 106, null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1978, 12, 12, 0, 0, 0, 0, DateTimeKind.Utc), "phong.vd@gmail.com", "Vũ Đình Phong", "male", "001078556677", false, true, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "0906666777", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "incident_comments",
                columns: new[] { "Id", "Attachments", "AuthorAuthUserId", "Content", "CreatedAt", "IncidentId" },
                values: new object[,]
                {
                    { 1, null, 201, "Đã tiếp nhận và cho kỹ thuật viên qua kiểm tra.", new DateTime(2024, 1, 1, 2, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 2, null, 202, "Đang liên hệ căn hộ tầng trên để khóa van nước tạm thời.", new DateTime(2024, 1, 3, 1, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 3, null, 104, "Mong BQL xử lý nhanh giúp, nước chảy nhiều quá.", new DateTime(2024, 1, 3, 2, 0, 0, 0, DateTimeKind.Utc), 2 }
                });

            migrationBuilder.InsertData(
                schema: "townhub",
                table: "notification_logs",
                columns: new[] { "Id", "Channel", "CreatedAt", "ErrorMessage", "NotificationId", "Recipient", "ResidentId", "SentAt", "Status" },
                values: new object[,]
                {
                    { 1, "push", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, 1, "device_token_abc123", 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "delivered" },
                    { 2, "push", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, 1, "device_token_xyz789", 2, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "delivered" }
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
                name: "IX_face_profiles_ResidentId",
                schema: "townhub",
                table: "face_profiles",
                column: "ResidentId",
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
                name: "IX_floors_buildingId_floorNumber",
                schema: "base",
                table: "floors",
                columns: new[] { "buildingId", "floorNumber" },
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
                name: "IX_provider_service_listings_ProviderId",
                schema: "townhub",
                table: "provider_service_listings",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_providers_ResidentId",
                schema: "townhub",
                table: "providers",
                column: "ResidentId");

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
                name: "IX_service_requests_ApartmentId",
                schema: "townhub",
                table: "service_requests",
                column: "ApartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_ProviderId",
                schema: "townhub",
                table: "service_requests",
                column: "ProviderId");

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
                name: "access_events",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "audit_logs",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "buildings",
                schema: "base");

            migrationBuilder.DropTable(
                name: "face_profiles",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "fees",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "files",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "floors",
                schema: "base");

            migrationBuilder.DropTable(
                name: "incident_comments",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "notification_logs",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "provider_service_listings",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "service_requests",
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
                name: "providers",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "notification_templates",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "residents",
                schema: "townhub");

            migrationBuilder.DropTable(
                name: "apartments",
                schema: "auth");
        }
    }
}
