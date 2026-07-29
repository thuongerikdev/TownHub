using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TH.WebAPI.Migrations.AssetDb
{
    /// <inheritdoc />
    public partial class AssetDbContextV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "asset");

            migrationBuilder.CreateTable(
                name: "asset_document",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    documentCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    documentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    documentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    totalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_document", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "asset_locations",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    floorId = table.Column<Guid>(type: "uuid", nullable: true),
                    areaCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_locations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cost_tracking",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    referenceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    referenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: true),
                    categoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    departmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    costType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    costDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    recordedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    recordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cost_tracking", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "kpi_daily_snapshots",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    snapshotDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    kpiDataJson = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kpi_daily_snapshots", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "material_categories",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    parentId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_material_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_material_categories_material_categories_parentId",
                        column: x => x.parentId,
                        principalSchema: "asset",
                        principalTable: "material_categories",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "ocr_jobs",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    documentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ocrEngine = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reviewedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    fileUrl = table.Column<string>(type: "text", nullable: true),
                    fileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    fileSizeBytes = table.Column<int>(type: "integer", nullable: true),
                    rawExtractedText = table.Column<string>(type: "text", nullable: true),
                    confidenceScore = table.Column<decimal>(type: "numeric(5,4)", nullable: true),
                    errorMessage = table.Column<string>(type: "text", nullable: true),
                    startedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    submittedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    submittedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    submittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ocr_jobs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sla_configs",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: true),
                    issueCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    priorityLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    responseTimeHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    resolutionTimeHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    escalationL1AfterHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    escalationL2AfterHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    escalationL3AfterHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    escalationContactsJson = table.Column<string>(type: "text", nullable: true),
                    businessHoursOnly = table.Column<bool>(type: "boolean", nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sla_configs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vendors",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    vendorCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    taxId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    blacklistReason = table.Column<string>(type: "text", nullable: true),
                    blacklistedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    blacklistedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    contactName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    contactEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    contactPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "warehouses",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    managerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ktvOwnerId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouses", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "materials",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    materialCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    categoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    preferredVendorId = table.Column<Guid>(type: "uuid", nullable: true),
                    unitOfMeasure = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    minStock = table.Column<decimal>(type: "numeric(12,3)", nullable: false),
                    maxStock = table.Column<decimal>(type: "numeric(12,3)", nullable: true),
                    reorderPoint = table.Column<decimal>(type: "numeric(12,3)", nullable: true),
                    reorderQuantity = table.Column<decimal>(type: "numeric(12,3)", nullable: true),
                    unitPrice = table.Column<decimal>(type: "numeric(14,0)", nullable: true),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_materials", x => x.id);
                    table.ForeignKey(
                        name: "FK_materials_material_categories_categoryId",
                        column: x => x.categoryId,
                        principalSchema: "asset",
                        principalTable: "material_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_materials_vendors_preferredVendorId",
                        column: x => x.preferredVendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "vendor_contracts",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contractCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    vendorId = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: true),
                    startDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    endDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    contractValue = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    paymentTerms = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    renewalNoticeDays = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scopeOfWork = table.Column<string>(type: "text", nullable: true),
                    fileUrl = table.Column<string>(type: "text", nullable: true),
                    signedByVendor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    signedByBuilding = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendor_contracts", x => x.id);
                    table.ForeignKey(
                        name: "FK_vendor_contracts_vendors_vendorId",
                        column: x => x.vendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inventory_levels",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    warehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    quantityOnHand = table.Column<decimal>(type: "numeric(12,3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_levels", x => x.id);
                    table.ForeignKey(
                        name: "FK_inventory_levels_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inventory_levels_warehouses_warehouseId",
                        column: x => x.warehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inventory_transactions",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    txnCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    warehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    referenceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    referenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    txnType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(12,3)", nullable: false),
                    unitCost = table.Column<decimal>(type: "numeric(14,0)", nullable: true),
                    totalCost = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    performedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    performedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_inventory_transactions_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inventory_transactions_warehouses_warehouseId",
                        column: x => x.warehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vendor_contract_services",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contractId = table.Column<Guid>(type: "uuid", nullable: false),
                    serviceName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendor_contract_services", x => x.id);
                    table.ForeignKey(
                        name: "FK_vendor_contract_services_vendor_contracts_contractId",
                        column: x => x.contractId,
                        principalSchema: "asset",
                        principalTable: "vendor_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vendor_evaluations",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    vendorId = table.Column<Guid>(type: "uuid", nullable: false),
                    contractId = table.Column<Guid>(type: "uuid", nullable: true),
                    evaluatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    evaluationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    overallScore = table.Column<short>(type: "smallint", nullable: false),
                    qualityScore = table.Column<short>(type: "smallint", nullable: false),
                    timelinessScore = table.Column<short>(type: "smallint", nullable: false),
                    costScore = table.Column<short>(type: "smallint", nullable: false),
                    safetyScore = table.Column<short>(type: "smallint", nullable: false),
                    comments = table.Column<string>(type: "text", nullable: true),
                    recommendation = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendor_evaluations", x => x.id);
                    table.ForeignKey(
                        name: "FK_vendor_evaluations_vendor_contracts_contractId",
                        column: x => x.contractId,
                        principalSchema: "asset",
                        principalTable: "vendor_contracts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_vendor_evaluations_vendors_vendorId",
                        column: x => x.vendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_categories",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    parentId = table.Column<Guid>(type: "uuid", nullable: true),
                    defaultChecklistTemplateId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_categories_asset_categories_parentId",
                        column: x => x.parentId,
                        principalSchema: "asset",
                        principalTable: "asset_categories",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "assets",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    categoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    locationId = table.Column<Guid>(type: "uuid", nullable: true),
                    parentAssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    floorId = table.Column<Guid>(type: "uuid", nullable: true),
                    vendorId = table.Column<Guid>(type: "uuid", nullable: true),
                    vendorContractId = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    serialNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchasePrice = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    purchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    warrantyExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    usefulLifeMonths = table.Column<int>(type: "integer", nullable: true),
                    salvageValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    depreciationMethod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    accountCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    paymentMethod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    accumulatedDepreciation = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bookValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    installationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    lastMaintenanceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    nextMaintenanceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    criticalityLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.id);
                    table.ForeignKey(
                        name: "FK_assets_asset_categories_categoryId",
                        column: x => x.categoryId,
                        principalSchema: "asset",
                        principalTable: "asset_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_assets_asset_locations_locationId",
                        column: x => x.locationId,
                        principalSchema: "asset",
                        principalTable: "asset_locations",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_assets_assets_parentAssetId",
                        column: x => x.parentAssetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_assets_vendor_contracts_vendorContractId",
                        column: x => x.vendorContractId,
                        principalSchema: "asset",
                        principalTable: "vendor_contracts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_assets_vendors_vendorId",
                        column: x => x.vendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "checklist_templates",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    categoryId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checklist_templates", x => x.id);
                    table.ForeignKey(
                        name: "FK_checklist_templates_asset_categories_categoryId",
                        column: x => x.categoryId,
                        principalSchema: "asset",
                        principalTable: "asset_categories",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "asset_depreciation_log",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    periodYear = table.Column<int>(type: "integer", nullable: false),
                    periodMonth = table.Column<int>(type: "integer", nullable: false),
                    depreciationAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bookValueBefore = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    bookValueAfter = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    accumulatedTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    calculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    calculatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    documentId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_depreciation_log", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_depreciation_log_asset_document_documentId",
                        column: x => x.documentId,
                        principalSchema: "asset",
                        principalTable: "asset_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_depreciation_log_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_disposal",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    disposalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    originalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    accumulatedDepreciation = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    bookValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    disposalValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    gainLoss = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    disposalType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    reason = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    documentId = table.Column<Guid>(type: "uuid", nullable: true),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_disposal", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_disposal_asset_document_documentId",
                        column: x => x.documentId,
                        principalSchema: "asset",
                        principalTable: "asset_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_disposal_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "asset_document_line",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    documentId = table.Column<Guid>(type: "uuid", nullable: false),
                    debitAccount = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    creditAccount = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    assetId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_document_line", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_document_line_asset_document_documentId",
                        column: x => x.documentId,
                        principalSchema: "asset",
                        principalTable: "asset_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_document_line_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "asset_qr_codes",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    qrCode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_qr_codes", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_qr_codes_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "iot_sensor_readings",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    sensorCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    readingValue = table.Column<decimal>(type: "numeric", nullable: false),
                    readingAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_iot_sensor_readings", x => x.id);
                    table.ForeignKey(
                        name: "FK_iot_sensor_readings_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "checklist_template_items",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    templateId = table.Column<Guid>(type: "uuid", nullable: false),
                    itemCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    itemType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    itemLabel = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    sortOrder = table.Column<int>(type: "integer", nullable: false),
                    isRequired = table.Column<bool>(type: "boolean", nullable: false),
                    expectedValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checklist_template_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_checklist_template_items_checklist_templates_templateId",
                        column: x => x.templateId,
                        principalSchema: "asset",
                        principalTable: "checklist_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_transfers",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    fromLocationId = table.Column<Guid>(type: "uuid", nullable: true),
                    toLocationId = table.Column<Guid>(type: "uuid", nullable: false),
                    transferredBy = table.Column<Guid>(type: "uuid", nullable: true),
                    workOrderId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_transfers", x => x.id);
                    table.ForeignKey(
                        name: "FK_asset_transfers_asset_locations_fromLocationId",
                        column: x => x.fromLocationId,
                        principalSchema: "asset",
                        principalTable: "asset_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_asset_transfers_asset_locations_toLocationId",
                        column: x => x.toLocationId,
                        principalSchema: "asset",
                        principalTable: "asset_locations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_asset_transfers_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoice_items",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(12,3)", nullable: true),
                    unitPrice = table.Column<decimal>(type: "numeric(14,0)", nullable: true),
                    totalPrice = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    poItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_items_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoices",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoiceCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    vendorId = table.Column<Guid>(type: "uuid", nullable: false),
                    poId = table.Column<Guid>(type: "uuid", nullable: true),
                    ocrJobId = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    invoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    invoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    subtotal = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    taxAmount = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    totalAmount = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    paymentDueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    paidDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    paymentStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    paymentMethod = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    confirmedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    confirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoices_ocr_jobs_ocrJobId",
                        column: x => x.ocrJobId,
                        principalSchema: "asset",
                        principalTable: "ocr_jobs",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_invoices_vendors_vendorId",
                        column: x => x.vendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_schedules",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduleType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    checklistTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    autoAssignDepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    frequencyType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    frequencyDays = table.Column<int>(type: "integer", nullable: true),
                    startDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    endDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    nextDueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    lastExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    lastWoId = table.Column<Guid>(type: "uuid", nullable: true),
                    leadTimeDays = table.Column<int>(type: "integer", nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_maintenance_schedules_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_maintenance_schedules_checklist_templates_checklistTemplate~",
                        column: x => x.checklistTemplateId,
                        principalSchema: "asset",
                        principalTable: "checklist_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_orders",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    woCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    assetId = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduleId = table.Column<Guid>(type: "uuid", nullable: true),
                    checklistTemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    reviewerId = table.Column<Guid>(type: "uuid", nullable: true),
                    assignedToUserId = table.Column<int>(type: "integer", nullable: true),
                    assignedToName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    woType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    priority = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    scheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    dueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    actualStartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    actualEndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejectedReason = table.Column<string>(type: "text", nullable: true),
                    estimatedHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    actualHours = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    totalCost = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdByUserId = table.Column<int>(type: "integer", nullable: true),
                    createdByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_orders_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_orders_checklist_templates_checklistTemplateId",
                        column: x => x.checklistTemplateId,
                        principalSchema: "asset",
                        principalTable: "checklist_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_orders_maintenance_schedules_scheduleId",
                        column: x => x.scheduleId,
                        principalSchema: "asset",
                        principalTable: "maintenance_schedules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "work_order_assignments",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    woId = table.Column<Guid>(type: "uuid", nullable: false),
                    assignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    assignedToUserId = table.Column<int>(type: "integer", nullable: true),
                    assignedToName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    assignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    checkinQrAssetId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_order_assignments_assets_checkinQrAssetId",
                        column: x => x.checkinQrAssetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_work_order_assignments_work_orders_woId",
                        column: x => x.woId,
                        principalSchema: "asset",
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_order_attachments",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    woId = table.Column<Guid>(type: "uuid", nullable: false),
                    attachmentType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    fileUrl = table.Column<string>(type: "text", nullable: false),
                    fileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    fileSizeBytes = table.Column<int>(type: "integer", nullable: true),
                    uploadedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    uploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_attachments", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_order_attachments_work_orders_woId",
                        column: x => x.woId,
                        principalSchema: "asset",
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_order_checklist_responses",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    woId = table.Column<Guid>(type: "uuid", nullable: false),
                    templateItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    isPassed = table.Column<bool>(type: "boolean", nullable: false),
                    valueText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    photoUrl = table.Column<string>(type: "text", nullable: true),
                    respondedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_checklist_responses", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_order_checklist_responses_checklist_template_items_tem~",
                        column: x => x.templateItemId,
                        principalSchema: "asset",
                        principalTable: "checklist_template_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_order_checklist_responses_work_orders_woId",
                        column: x => x.woId,
                        principalSchema: "asset",
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_order_materials_used",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    woId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    warehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    inventoryTransactionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_materials_used", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_order_materials_used_inventory_transactions_inventoryT~",
                        column: x => x.inventoryTransactionId,
                        principalSchema: "asset",
                        principalTable: "inventory_transactions",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_work_order_materials_used_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_order_materials_used_warehouses_warehouseId",
                        column: x => x.warehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_order_materials_used_work_orders_woId",
                        column: x => x.woId,
                        principalSchema: "asset",
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "po_approval_workflow",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    poId = table.Column<Guid>(type: "uuid", nullable: false),
                    approverId = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    approvalLevel = table.Column<short>(type: "smallint", nullable: false),
                    amountThreshold = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    approvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    comment = table.Column<string>(type: "text", nullable: true),
                    notifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_po_approval_workflow", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_order_items",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    poId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    targetWarehouseId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_order_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_warehouses_targetWarehouseId",
                        column: x => x.targetWarehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "purchase_orders",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    poCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    prId = table.Column<Guid>(type: "uuid", nullable: true),
                    vendorId = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    issueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expectedDelivery = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    actualDelivery = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    totalAmount = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    paymentTerms = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    createdBy = table.Column<Guid>(type: "uuid", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_orders_vendors_vendorId",
                        column: x => x.vendorId,
                        principalSchema: "asset",
                        principalTable: "vendors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_request_items",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prId = table.Column<Guid>(type: "uuid", nullable: false),
                    materialId = table.Column<Guid>(type: "uuid", nullable: false),
                    targetWarehouseId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_request_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_request_items_materials_materialId",
                        column: x => x.materialId,
                        principalSchema: "asset",
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_request_items_warehouses_targetWarehouseId",
                        column: x => x.targetWarehouseId,
                        principalSchema: "asset",
                        principalTable: "warehouses",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "purchase_requests",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: true),
                    woId = table.Column<Guid>(type: "uuid", nullable: true),
                    departmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    requestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    requestedByUserId = table.Column<int>(type: "integer", nullable: true),
                    requestedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    justification = table.Column<string>(type: "text", nullable: true),
                    priority = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    neededByDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approvedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    approvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejectedReason = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_requests_work_orders_woId",
                        column: x => x.woId,
                        principalSchema: "asset",
                        principalTable: "work_orders",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tickets",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    buildingId = table.Column<Guid>(type: "uuid", nullable: false),
                    floorId = table.Column<Guid>(type: "uuid", nullable: true),
                    unitId = table.Column<Guid>(type: "uuid", nullable: true),
                    assetId = table.Column<Guid>(type: "uuid", nullable: true),
                    reportedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    reportedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    assignedToUserId = table.Column<int>(type: "integer", nullable: true),
                    assignedToName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    slaConfigId = table.Column<Guid>(type: "uuid", nullable: true),
                    purchaseRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    priority = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    resolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    autoClosed = table.Column<bool>(type: "boolean", nullable: false),
                    resolutionNote = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.id);
                    table.ForeignKey(
                        name: "FK_tickets_assets_assetId",
                        column: x => x.assetId,
                        principalSchema: "asset",
                        principalTable: "assets",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tickets_purchase_requests_purchaseRequestId",
                        column: x => x.purchaseRequestId,
                        principalSchema: "asset",
                        principalTable: "purchase_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tickets_sla_configs_slaConfigId",
                        column: x => x.slaConfigId,
                        principalSchema: "asset",
                        principalTable: "sla_configs",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "sla_escalation_log",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: false),
                    escalationLevel = table.Column<short>(type: "smallint", nullable: false),
                    escalatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    escalatedTo = table.Column<Guid>(type: "uuid", nullable: true),
                    channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    message = table.Column<string>(type: "text", nullable: true),
                    acknowledgedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    acknowledgedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sla_escalation_log", x => x.id);
                    table.ForeignKey(
                        name: "FK_sla_escalation_log_tickets_ticketId",
                        column: x => x.ticketId,
                        principalSchema: "asset",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_assignments",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: false),
                    assignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    assignedToUserId = table.Column<int>(type: "integer", nullable: true),
                    assignedToName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    assignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_assignments_tickets_ticketId",
                        column: x => x.ticketId,
                        principalSchema: "asset",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_attachments",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: false),
                    fileUrl = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_attachments", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_attachments_tickets_ticketId",
                        column: x => x.ticketId,
                        principalSchema: "asset",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_ratings",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: false),
                    ratedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    overallRating = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_ratings", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_ratings_tickets_ticketId",
                        column: x => x.ticketId,
                        principalSchema: "asset",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_status_history",
                schema: "asset",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    ticketId = table.Column<Guid>(type: "uuid", nullable: false),
                    fromStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    toStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    changedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    changedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_status_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_status_history_tickets_ticketId",
                        column: x => x.ticketId,
                        principalSchema: "asset",
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_asset_categories_code",
                schema: "asset",
                table: "asset_categories",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_categories_defaultChecklistTemplateId",
                schema: "asset",
                table: "asset_categories",
                column: "defaultChecklistTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_categories_parentId",
                schema: "asset",
                table: "asset_categories",
                column: "parentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_depreciation_log_assetId_periodYear_periodMonth",
                schema: "asset",
                table: "asset_depreciation_log",
                columns: new[] { "assetId", "periodYear", "periodMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_depreciation_log_documentId",
                schema: "asset",
                table: "asset_depreciation_log",
                column: "documentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_disposal_assetId",
                schema: "asset",
                table: "asset_disposal",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_disposal_documentId",
                schema: "asset",
                table: "asset_disposal",
                column: "documentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_documentCode",
                schema: "asset",
                table: "asset_document",
                column: "documentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_line_assetId",
                schema: "asset",
                table: "asset_document_line",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_document_line_documentId",
                schema: "asset",
                table: "asset_document_line",
                column: "documentId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_qr_codes_assetId",
                schema: "asset",
                table: "asset_qr_codes",
                column: "assetId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_qr_codes_qrCode",
                schema: "asset",
                table: "asset_qr_codes",
                column: "qrCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_transfers_assetId",
                schema: "asset",
                table: "asset_transfers",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_transfers_fromLocationId",
                schema: "asset",
                table: "asset_transfers",
                column: "fromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_transfers_toLocationId",
                schema: "asset",
                table: "asset_transfers",
                column: "toLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_transfers_workOrderId",
                schema: "asset",
                table: "asset_transfers",
                column: "workOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_assetCode",
                schema: "asset",
                table: "assets",
                column: "assetCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assets_categoryId",
                schema: "asset",
                table: "assets",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_locationId",
                schema: "asset",
                table: "assets",
                column: "locationId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_parentAssetId",
                schema: "asset",
                table: "assets",
                column: "parentAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_vendorContractId",
                schema: "asset",
                table: "assets",
                column: "vendorContractId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_vendorId",
                schema: "asset",
                table: "assets",
                column: "vendorId");

            migrationBuilder.CreateIndex(
                name: "IX_checklist_template_items_templateId",
                schema: "asset",
                table: "checklist_template_items",
                column: "templateId");

            migrationBuilder.CreateIndex(
                name: "IX_checklist_templates_categoryId",
                schema: "asset",
                table: "checklist_templates",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_checklist_templates_code",
                schema: "asset",
                table: "checklist_templates",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_levels_materialId",
                schema: "asset",
                table: "inventory_levels",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_levels_warehouseId_materialId",
                schema: "asset",
                table: "inventory_levels",
                columns: new[] { "warehouseId", "materialId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_materialId",
                schema: "asset",
                table: "inventory_transactions",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_txnCode",
                schema: "asset",
                table: "inventory_transactions",
                column: "txnCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_warehouseId",
                schema: "asset",
                table: "inventory_transactions",
                column: "warehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_items_invoiceId",
                schema: "asset",
                table: "invoice_items",
                column: "invoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_items_materialId",
                schema: "asset",
                table: "invoice_items",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_items_poItemId",
                schema: "asset",
                table: "invoice_items",
                column: "poItemId");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_invoiceCode",
                schema: "asset",
                table: "invoices",
                column: "invoiceCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_ocrJobId",
                schema: "asset",
                table: "invoices",
                column: "ocrJobId");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_poId",
                schema: "asset",
                table: "invoices",
                column: "poId");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_vendorId",
                schema: "asset",
                table: "invoices",
                column: "vendorId");

            migrationBuilder.CreateIndex(
                name: "IX_iot_sensor_readings_assetId",
                schema: "asset",
                table: "iot_sensor_readings",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_kpi_daily_snapshots_buildingId_snapshotDate",
                schema: "asset",
                table: "kpi_daily_snapshots",
                columns: new[] { "buildingId", "snapshotDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_schedules_assetId",
                schema: "asset",
                table: "maintenance_schedules",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_schedules_checklistTemplateId",
                schema: "asset",
                table: "maintenance_schedules",
                column: "checklistTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_schedules_lastWoId",
                schema: "asset",
                table: "maintenance_schedules",
                column: "lastWoId");

            migrationBuilder.CreateIndex(
                name: "IX_material_categories_code",
                schema: "asset",
                table: "material_categories",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_material_categories_parentId",
                schema: "asset",
                table: "material_categories",
                column: "parentId");

            migrationBuilder.CreateIndex(
                name: "IX_materials_categoryId",
                schema: "asset",
                table: "materials",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_materials_materialCode",
                schema: "asset",
                table: "materials",
                column: "materialCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_materials_preferredVendorId",
                schema: "asset",
                table: "materials",
                column: "preferredVendorId");

            migrationBuilder.CreateIndex(
                name: "IX_po_approval_workflow_poId",
                schema: "asset",
                table: "po_approval_workflow",
                column: "poId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_materialId",
                schema: "asset",
                table: "purchase_order_items",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_poId",
                schema: "asset",
                table: "purchase_order_items",
                column: "poId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_targetWarehouseId",
                schema: "asset",
                table: "purchase_order_items",
                column: "targetWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_poCode",
                schema: "asset",
                table: "purchase_orders",
                column: "poCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_prId",
                schema: "asset",
                table: "purchase_orders",
                column: "prId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_vendorId",
                schema: "asset",
                table: "purchase_orders",
                column: "vendorId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_request_items_materialId",
                schema: "asset",
                table: "purchase_request_items",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_request_items_prId",
                schema: "asset",
                table: "purchase_request_items",
                column: "prId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_request_items_targetWarehouseId",
                schema: "asset",
                table: "purchase_request_items",
                column: "targetWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_requests_prCode",
                schema: "asset",
                table: "purchase_requests",
                column: "prCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_requests_ticketId",
                schema: "asset",
                table: "purchase_requests",
                column: "ticketId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_requests_woId",
                schema: "asset",
                table: "purchase_requests",
                column: "woId");

            migrationBuilder.CreateIndex(
                name: "IX_sla_escalation_log_ticketId",
                schema: "asset",
                table: "sla_escalation_log",
                column: "ticketId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_assignments_ticketId",
                schema: "asset",
                table: "ticket_assignments",
                column: "ticketId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_attachments_ticketId",
                schema: "asset",
                table: "ticket_attachments",
                column: "ticketId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_ratings_ticketId",
                schema: "asset",
                table: "ticket_ratings",
                column: "ticketId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_status_history_ticketId",
                schema: "asset",
                table: "ticket_status_history",
                column: "ticketId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_assetId",
                schema: "asset",
                table: "tickets",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_purchaseRequestId",
                schema: "asset",
                table: "tickets",
                column: "purchaseRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_slaConfigId",
                schema: "asset",
                table: "tickets",
                column: "slaConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_ticketCode",
                schema: "asset",
                table: "tickets",
                column: "ticketCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendor_contract_services_contractId",
                schema: "asset",
                table: "vendor_contract_services",
                column: "contractId");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_contracts_contractCode",
                schema: "asset",
                table: "vendor_contracts",
                column: "contractCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendor_contracts_vendorId",
                schema: "asset",
                table: "vendor_contracts",
                column: "vendorId");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_evaluations_contractId",
                schema: "asset",
                table: "vendor_evaluations",
                column: "contractId");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_evaluations_vendorId",
                schema: "asset",
                table: "vendor_evaluations",
                column: "vendorId");

            migrationBuilder.CreateIndex(
                name: "IX_vendors_taxId",
                schema: "asset",
                table: "vendors",
                column: "taxId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendors_vendorCode",
                schema: "asset",
                table: "vendors",
                column: "vendorCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_warehouses_code",
                schema: "asset",
                table: "warehouses",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_work_order_assignments_checkinQrAssetId",
                schema: "asset",
                table: "work_order_assignments",
                column: "checkinQrAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_assignments_woId",
                schema: "asset",
                table: "work_order_assignments",
                column: "woId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_attachments_woId",
                schema: "asset",
                table: "work_order_attachments",
                column: "woId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_checklist_responses_templateItemId",
                schema: "asset",
                table: "work_order_checklist_responses",
                column: "templateItemId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_checklist_responses_woId",
                schema: "asset",
                table: "work_order_checklist_responses",
                column: "woId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_materials_used_inventoryTransactionId",
                schema: "asset",
                table: "work_order_materials_used",
                column: "inventoryTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_materials_used_materialId",
                schema: "asset",
                table: "work_order_materials_used",
                column: "materialId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_materials_used_warehouseId",
                schema: "asset",
                table: "work_order_materials_used",
                column: "warehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_work_order_materials_used_woId",
                schema: "asset",
                table: "work_order_materials_used",
                column: "woId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_assetId",
                schema: "asset",
                table: "work_orders",
                column: "assetId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_checklistTemplateId",
                schema: "asset",
                table: "work_orders",
                column: "checklistTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_scheduleId",
                schema: "asset",
                table: "work_orders",
                column: "scheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_woCode",
                schema: "asset",
                table: "work_orders",
                column: "woCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_asset_categories_checklist_templates_defaultChecklistTempla~",
                schema: "asset",
                table: "asset_categories",
                column: "defaultChecklistTemplateId",
                principalSchema: "asset",
                principalTable: "checklist_templates",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_asset_transfers_work_orders_workOrderId",
                schema: "asset",
                table: "asset_transfers",
                column: "workOrderId",
                principalSchema: "asset",
                principalTable: "work_orders",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_invoice_items_invoices_invoiceId",
                schema: "asset",
                table: "invoice_items",
                column: "invoiceId",
                principalSchema: "asset",
                principalTable: "invoices",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_invoice_items_purchase_order_items_poItemId",
                schema: "asset",
                table: "invoice_items",
                column: "poItemId",
                principalSchema: "asset",
                principalTable: "purchase_order_items",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_invoices_purchase_orders_poId",
                schema: "asset",
                table: "invoices",
                column: "poId",
                principalSchema: "asset",
                principalTable: "purchase_orders",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_maintenance_schedules_work_orders_lastWoId",
                schema: "asset",
                table: "maintenance_schedules",
                column: "lastWoId",
                principalSchema: "asset",
                principalTable: "work_orders",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_po_approval_workflow_purchase_orders_poId",
                schema: "asset",
                table: "po_approval_workflow",
                column: "poId",
                principalSchema: "asset",
                principalTable: "purchase_orders",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_order_items_purchase_orders_poId",
                schema: "asset",
                table: "purchase_order_items",
                column: "poId",
                principalSchema: "asset",
                principalTable: "purchase_orders",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_purchase_requests_prId",
                schema: "asset",
                table: "purchase_orders",
                column: "prId",
                principalSchema: "asset",
                principalTable: "purchase_requests",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_request_items_purchase_requests_prId",
                schema: "asset",
                table: "purchase_request_items",
                column: "prId",
                principalSchema: "asset",
                principalTable: "purchase_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_requests_tickets_ticketId",
                schema: "asset",
                table: "purchase_requests",
                column: "ticketId",
                principalSchema: "asset",
                principalTable: "tickets",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_asset_categories_checklist_templates_defaultChecklistTempla~",
                schema: "asset",
                table: "asset_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_maintenance_schedules_checklist_templates_checklistTemplate~",
                schema: "asset",
                table: "maintenance_schedules");

            migrationBuilder.DropForeignKey(
                name: "FK_work_orders_checklist_templates_checklistTemplateId",
                schema: "asset",
                table: "work_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_maintenance_schedules_assets_assetId",
                schema: "asset",
                table: "maintenance_schedules");

            migrationBuilder.DropForeignKey(
                name: "FK_tickets_assets_assetId",
                schema: "asset",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_work_orders_assets_assetId",
                schema: "asset",
                table: "work_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_maintenance_schedules_work_orders_lastWoId",
                schema: "asset",
                table: "maintenance_schedules");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_requests_work_orders_woId",
                schema: "asset",
                table: "purchase_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_tickets_purchase_requests_purchaseRequestId",
                schema: "asset",
                table: "tickets");

            migrationBuilder.DropTable(
                name: "asset_depreciation_log",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_disposal",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_document_line",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_qr_codes",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_transfers",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "cost_tracking",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "inventory_levels",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "invoice_items",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "iot_sensor_readings",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "kpi_daily_snapshots",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "po_approval_workflow",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "purchase_request_items",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "sla_escalation_log",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "ticket_assignments",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "ticket_attachments",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "ticket_ratings",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "ticket_status_history",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "vendor_contract_services",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "vendor_evaluations",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "work_order_assignments",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "work_order_attachments",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "work_order_checklist_responses",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "work_order_materials_used",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_document",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "invoices",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "purchase_order_items",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "checklist_template_items",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "inventory_transactions",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "ocr_jobs",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "purchase_orders",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "materials",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "warehouses",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "material_categories",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "checklist_templates",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "assets",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_categories",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "asset_locations",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "vendor_contracts",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "vendors",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "work_orders",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "maintenance_schedules",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "purchase_requests",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "tickets",
                schema: "asset");

            migrationBuilder.DropTable(
                name: "sla_configs",
                schema: "asset");
        }
    }
}
