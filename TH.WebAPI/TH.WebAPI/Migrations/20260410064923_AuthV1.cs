using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TH.WebAPI.Migrations
{
    /// <inheritdoc />
    public partial class AuthV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "auth");

            migrationBuilder.CreateTable(
                name: "AuthPermission",
                schema: "auth",
                columns: table => new
                {
                    permissionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    permissionName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    permissionDescription = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    scope = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthPermission", x => x.permissionID);
                });

            migrationBuilder.CreateTable(
                name: "AuthRole",
                schema: "auth",
                columns: table => new
                {
                    roleID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roleName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    roleDescription = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    isDefault = table.Column<bool>(type: "boolean", nullable: false),
                    scope = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthRole", x => x.roleID);
                });

            migrationBuilder.CreateTable(
                name: "AuthUser",
                schema: "auth",
                columns: table => new
                {
                    userID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phoneNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    passwordHash = table.Column<string>(type: "text", nullable: false),
                    googleSub = table.Column<string>(type: "text", nullable: true),
                    scope = table.Column<string>(type: "text", nullable: true),
                    isEmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    tokenVersion = table.Column<int>(type: "integer", nullable: false),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthUser", x => x.userID);
                });

            migrationBuilder.CreateTable(
                name: "AuthRolePermission",
                schema: "auth",
                columns: table => new
                {
                    rolePermissionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roleID = table.Column<int>(type: "integer", nullable: false),
                    permissionID = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthRolePermission", x => x.rolePermissionID);
                    table.ForeignKey(
                        name: "FK_AuthRolePermission_AuthPermission_permissionID",
                        column: x => x.permissionID,
                        principalSchema: "auth",
                        principalTable: "AuthPermission",
                        principalColumn: "permissionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AuthRolePermission_AuthRole_roleID",
                        column: x => x.roleID,
                        principalSchema: "auth",
                        principalTable: "AuthRole",
                        principalColumn: "roleID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthAuditLog",
                schema: "auth",
                columns: table => new
                {
                    auditID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: true),
                    action = table.Column<string>(type: "text", nullable: true),
                    result = table.Column<string>(type: "text", nullable: true),
                    detail = table.Column<string>(type: "text", nullable: true),
                    ip = table.Column<string>(type: "text", nullable: true),
                    userAgent = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthAuditLog", x => x.auditID);
                    table.ForeignKey(
                        name: "FK_AuthAuditLog_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID");
                });

            migrationBuilder.CreateTable(
                name: "AuthEmailVerification",
                schema: "auth",
                columns: table => new
                {
                    emailVerificationID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    codeHash = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    consumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthEmailVerification", x => x.emailVerificationID);
                    table.ForeignKey(
                        name: "FK_AuthEmailVerification_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthMfaSecret",
                schema: "auth",
                columns: table => new
                {
                    mfaID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    secret = table.Column<string>(type: "text", nullable: true),
                    isEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    label = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    recoveryCodes = table.Column<string>(type: "text", nullable: true),
                    enrollmentStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    enabledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    lastVerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthMfaSecret", x => x.mfaID);
                    table.ForeignKey(
                        name: "FK_AuthMfaSecret_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthPasswordReset",
                schema: "auth",
                columns: table => new
                {
                    passwordResetID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    codeHash = table.Column<string>(type: "text", nullable: false),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    consumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    purpose = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthPasswordReset", x => x.passwordResetID);
                    table.ForeignKey(
                        name: "FK_AuthPasswordReset_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthProfile",
                schema: "auth",
                columns: table => new
                {
                    profileID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    firstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    avatar = table.Column<string>(type: "text", nullable: true),
                    gender = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    dateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthProfile", x => x.profileID);
                    table.ForeignKey(
                        name: "FK_AuthProfile_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthUserRole",
                schema: "auth",
                columns: table => new
                {
                    userID = table.Column<int>(type: "integer", nullable: false),
                    roleID = table.Column<int>(type: "integer", nullable: false),
                    assignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthUserRole", x => new { x.userID, x.roleID });
                    table.ForeignKey(
                        name: "FK_AuthUserRole_AuthRole_roleID",
                        column: x => x.roleID,
                        principalSchema: "auth",
                        principalTable: "AuthRole",
                        principalColumn: "roleID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AuthUserRole_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthUserSession",
                schema: "auth",
                columns: table => new
                {
                    sessionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    deviceId = table.Column<string>(type: "text", nullable: false),
                    ip = table.Column<string>(type: "text", nullable: true),
                    userAgent = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    isRevoked = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthUserSession", x => x.sessionID);
                    table.ForeignKey(
                        name: "FK_AuthUserSession_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuthRefreshToken",
                schema: "auth",
                columns: table => new
                {
                    refreshTokenID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userID = table.Column<int>(type: "integer", nullable: false),
                    sessionID = table.Column<int>(type: "integer", nullable: false),
                    Token = table.Column<string>(type: "text", nullable: false),
                    Expires = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByIp = table.Column<string>(type: "text", nullable: true),
                    Revoked = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedByIp = table.Column<string>(type: "text", nullable: true),
                    ReplacedByToken = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthRefreshToken", x => x.refreshTokenID);
                    table.ForeignKey(
                        name: "FK_AuthRefreshToken_AuthUserSession_sessionID",
                        column: x => x.sessionID,
                        principalSchema: "auth",
                        principalTable: "AuthUserSession",
                        principalColumn: "sessionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AuthRefreshToken_AuthUser_userID",
                        column: x => x.userID,
                        principalSchema: "auth",
                        principalTable: "AuthUser",
                        principalColumn: "userID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "auth",
                table: "AuthRole",
                columns: new[] { "roleID", "isDefault", "roleDescription", "roleName", "scope" },
                values: new object[,]
                {
                    { 1, false, "Quản trị viên", "admin", "staff" },
                    { 2, false, "Quản lý nội dung", "content_manager", "staff" },
                    { 3, false, "Quản lý người dùng", "user_manager", "staff" },
                    { 4, false, "Quản lý tài chính", "finance_manager", "staff" },
                    { 10, true, "Khách hàng", "customer", "user" },
                    { 11, false, "Khách hàng VIP", "customer-vip", "user" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuthAuditLog_userID",
                schema: "auth",
                table: "AuthAuditLog",
                column: "userID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthEmailVerification_userID",
                schema: "auth",
                table: "AuthEmailVerification",
                column: "userID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthMfaSecret_userID",
                schema: "auth",
                table: "AuthMfaSecret",
                column: "userID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthMfaSecret_userID_type",
                schema: "auth",
                table: "AuthMfaSecret",
                columns: new[] { "userID", "type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthPasswordReset_userID",
                schema: "auth",
                table: "AuthPasswordReset",
                column: "userID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthProfile_userID",
                schema: "auth",
                table: "AuthProfile",
                column: "userID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthRefreshToken_sessionID",
                schema: "auth",
                table: "AuthRefreshToken",
                column: "sessionID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthRefreshToken_userID",
                schema: "auth",
                table: "AuthRefreshToken",
                column: "userID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthRole_roleName",
                schema: "auth",
                table: "AuthRole",
                column: "roleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuthRolePermission_permissionID",
                schema: "auth",
                table: "AuthRolePermission",
                column: "permissionID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthRolePermission_roleID",
                schema: "auth",
                table: "AuthRolePermission",
                column: "roleID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthUserRole_roleID",
                schema: "auth",
                table: "AuthUserRole",
                column: "roleID");

            migrationBuilder.CreateIndex(
                name: "IX_AuthUserSession_userID",
                schema: "auth",
                table: "AuthUserSession",
                column: "userID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuthAuditLog",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthEmailVerification",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthMfaSecret",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthPasswordReset",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthProfile",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthRefreshToken",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthRolePermission",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthUserRole",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthUserSession",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthPermission",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthRole",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "AuthUser",
                schema: "auth");
        }
    }
}
